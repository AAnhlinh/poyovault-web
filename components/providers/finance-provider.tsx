"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  AccountType,
  AdvisorMessage,
  FinancialProfile,
  Preferences,
  Transaction,
  TransactionCategory,
  TransactionType,
} from "@/lib/types";
import type {
  ConnectAccountInput,
  FinanceMutation,
  NewGoalInput,
  NewTransactionInput,
} from "@/lib/finance/mutations";
import { buildDemoProfile } from "@/lib/data/sample";
import { buildWelcomeMessage } from "@/lib/ai/advisor";
import { formatCurrency } from "@/lib/finance/format";

const STORAGE_KEY = "finsight.state.v1";
const STORAGE_VERSION = 2;

type Mode = "demo" | "cloud";

interface FinanceState {
  profile: FinancialProfile;
  chat: AdvisorMessage[];
}

interface ActionResult {
  ok: boolean;
  message: string;
}

interface FinanceContextValue extends FinanceState {
  mode: Mode;
  hydrated: boolean;
  pendingSync: number;
  syncError: string | null;
  contribute: (goalId: string, amount: number) => ActionResult;
  setGoalTarget: (goalId: string, target: number) => ActionResult;
  createGoal: (input: NewGoalInput) => ActionResult;
  addTransaction: (input: NewTransactionInput) => ActionResult;
  connectAccount: (input: ConnectAccountInput) => ActionResult;
  disconnectAccount: (id: string) => void;
  updatePreferences: (patch: Partial<Preferences>) => void;
  cancelSubscription: (merchant: string) => void;
  reactivateSubscription: (merchant: string) => void;
  toggleChallenge: (id: string) => boolean;
  appendMessage: (message: AdvisorMessage) => void;
  resetDemo: () => void;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `fs_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function welcomeMessage(profile: FinancialProfile): AdvisorMessage {
  const welcome = buildWelcomeMessage(profile);
  return {
    id: `welcome_${profile.customer.id}`,
    role: "assistant",
    content: welcome.content,
    createdAt: profile.asOf,
    suggestions: welcome.suggestions,
  };
}

function initialState(profile: FinancialProfile, chat: AdvisorMessage[]): FinanceState {
  return {
    profile,
    chat: chat.length > 0 ? chat : [welcomeMessage(profile)],
  };
}

const ACCENTS: Record<AccountType, string> = {
  checking: "#3B82F6",
  savings: "#A78BFA",
  credit_card: "#6366F1",
  loan: "#34D399",
};

export function FinanceProvider({
  initialProfile,
  initialChat = [],
  mode,
  children,
}: {
  initialProfile: FinancialProfile;
  initialChat?: AdvisorMessage[];
  mode: Mode;
  children: ReactNode;
}) {
  const [state, setState] = useState<FinanceState>(() =>
    initialState(initialProfile, initialChat),
  );
  const [hydrated, setHydrated] = useState(false);
  const [pendingSync, setPendingSync] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Demo-mode persistence: reloads keep the customer's in-session changes.
  useEffect(() => {
    if (mode === "demo") {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const stored = JSON.parse(raw) as {
            version?: number;
            profile?: FinancialProfile;
            chat?: AdvisorMessage[];
          };
          if (
            stored.version === STORAGE_VERSION &&
            stored.profile?.customer?.id === initialProfile.customer.id &&
            Array.isArray(stored.profile.accounts) &&
            stored.profile.accounts.length > 0
          ) {
            setState({
              profile: stored.profile,
              chat:
                stored.chat && stored.chat.length > 0
                  ? stored.chat
                  : [welcomeMessage(stored.profile)],
            });
          }
        }
      } catch {
        // Corrupt or unavailable storage: continue with the server snapshot.
      }
    }
    setHydrated(true);
  }, [initialProfile.customer.id, mode]);

  useEffect(() => {
    if (!hydrated || mode !== "demo") return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: STORAGE_VERSION, ...state }),
      );
    } catch {
      // Storage can be full or disabled; the session still works in memory.
    }
  }, [state, hydrated, mode]);

  const persist = useCallback(
    async (mutation: FinanceMutation) => {
      if (mode !== "cloud") return;
      setPendingSync((count) => count + 1);
      try {
        const response = await fetch("/api/finance/mutate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(mutation),
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "The change could not be saved.");
        }
        setSyncError(null);
      } catch (error) {
        setSyncError(
          error instanceof Error
            ? `${error.message} Your change is visible for now but may not persist.`
            : "The change could not be saved to Supabase.",
        );
      } finally {
        setPendingSync((count) => Math.max(0, count - 1));
      }
    },
    [mode],
  );

  const contribute = useCallback(
    (goalId: string, rawAmount: number): ActionResult => {
      const amount = Math.round(Number(rawAmount) * 100) / 100;
      if (!Number.isFinite(amount) || amount <= 0) {
        return { ok: false, message: "Enter an amount greater than $0." };
      }
      const goal = state.profile.goals.find((entry) => entry.id === goalId);
      if (!goal) return { ok: false, message: "That goal no longer exists." };

      const checking = state.profile.accounts.find((account) => account.type === "checking");
      if (checking && amount > checking.balance) {
        return {
          ok: false,
          message: `Your checking balance is ${formatCurrency(checking.balance)}. Move a smaller amount or transfer funds first.`,
        };
      }

      setState((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          goals: prev.profile.goals.map((entry) =>
            entry.id === goalId ? { ...entry, saved: Math.round((entry.saved + amount) * 100) / 100 } : entry,
          ),
          accounts: prev.profile.accounts.map((account) => {
            if (checking && account.id === checking.id) {
              return { ...account, balance: Math.max(0, account.balance - amount) };
            }
            if (goal.accountId && account.id === goal.accountId) {
              return { ...account, balance: account.balance + amount };
            }
            return account;
          }),
        },
      }));

      void persist({ type: "goal.contribute", goalId, amount });
      return {
        ok: true,
        message: `${formatCurrency(amount)} moved to ${goal.name}.`,
      };
    },
    [persist, state.profile.accounts, state.profile.goals],
  );

  const setGoalTarget = useCallback(
    (goalId: string, rawTarget: number): ActionResult => {
      const target = Math.round(Number(rawTarget) * 100) / 100;
      if (!Number.isFinite(target) || target <= 0) {
        return { ok: false, message: "Choose a target greater than $0." };
      }
      const goal = state.profile.goals.find((entry) => entry.id === goalId);
      if (!goal) return { ok: false, message: "That goal no longer exists." };

      setState((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          goals: prev.profile.goals.map((entry) =>
            entry.id === goalId ? { ...entry, target } : entry,
          ),
        },
      }));
      void persist({ type: "goal.target", goalId, target });
      return { ok: true, message: `Target updated to ${formatCurrency(target)}.` };
    },
    [persist, state.profile.goals],
  );

  const createGoal = useCallback(
    (input: NewGoalInput): ActionResult => {
      const name = input.name.trim();
      const target = Math.round(Number(input.target) * 100) / 100;
      const saved = Math.round(Number(input.saved ?? 0) * 100) / 100;
      if (!name) return { ok: false, message: "Give the goal a name." };
      if (!Number.isFinite(target) || target <= 0) {
        return { ok: false, message: "Choose a target greater than $0." };
      }
      if (!Number.isFinite(saved) || saved < 0) {
        return { ok: false, message: "Enter a valid amount already saved." };
      }

      const goal = {
        id: newId(),
        name,
        description: "",
        target,
        saved,
        targetDate: input.targetDate || undefined,
        priority: input.priority ?? "medium",
        color: input.color ?? "#5EEAD4",
        icon: input.icon ?? "shield",
      };

      setState((prev) => ({
        ...prev,
        profile: { ...prev.profile, goals: [...prev.profile.goals, goal] },
      }));
      void persist({ type: "goal.create", goal });
      return { ok: true, message: `${name} goal created.` };
    },
    [persist],
  );

  const addTransaction = useCallback(
    (input: NewTransactionInput): ActionResult => {
      const account = state.profile.accounts.find((entry) => entry.id === input.accountId);
      if (!account) return { ok: false, message: "Choose an account for this transaction." };
      const merchant = input.merchant.trim();
      const amount = Math.round(Number(input.amount) * 100) / 100;
      if (!merchant) return { ok: false, message: "Add a short description." };
      if (!Number.isFinite(amount) || amount <= 0) {
        return { ok: false, message: "Enter an amount greater than $0." };
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
        return { ok: false, message: "Choose a valid date." };
      }

      const type: TransactionType = input.type === "income" ? "income" : "expense";
      const category: TransactionCategory =
        type === "income" ? "income" : input.category === "income" ? "other" : input.category;
      const transaction: Transaction = {
        id: newId(),
        accountId: account.id,
        merchant,
        category,
        amount,
        date: input.date,
        type,
      };
      const isDebt = account.type === "credit_card" || account.type === "loan";
      const delta = type === "expense" ? (isDebt ? amount : -amount) : isDebt ? -amount : amount;

      setState((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          transactions: [...prev.profile.transactions, transaction],
          accounts: prev.profile.accounts.map((entry) =>
            entry.id === account.id
              ? {
                  ...entry,
                  balance: Math.max(0, Math.round((entry.balance + delta) * 100) / 100),
                }
              : entry,
          ),
        },
      }));
      void persist({ type: "transaction.create", transaction });
      return { ok: true, message: `${merchant} added to ${account.name}.` };
    },
    [persist, state.profile.accounts],
  );

  const connectAccount = useCallback(
    (input: ConnectAccountInput): ActionResult => {
      if (!input.institution.trim() || !input.name.trim()) {
        return { ok: false, message: "Choose an institution and account name." };
      }
      const balance = Number(input.balance);
      if (!Number.isFinite(balance) || balance < 0) {
        return { ok: false, message: "Enter a valid balance." };
      }
      if (input.type !== "checking" && input.type !== "savings" && balance <= 0) {
        return { ok: false, message: "Enter the outstanding balance for this account." };
      }

      const id = newId();
      const mask = String(Date.now()).slice(-4);
      const account = {
        id,
        institution: input.institution.trim(),
        name: input.name.trim(),
        type: input.type,
        mask,
        balance,
        accent: ACCENTS[input.type],
        logo: input.institution.trim().slice(0, 2).toUpperCase(),
        lastSyncedAt: new Date().toISOString(),
        creditLimit:
          input.type === "credit_card"
            ? input.creditLimit && input.creditLimit > 0
              ? input.creditLimit
              : Math.max(1000, Math.round(balance * 3))
            : undefined,
        apr: input.apr,
        minimumPayment:
          input.type === "credit_card" || input.type === "loan"
            ? input.minimumPayment && input.minimumPayment > 0
              ? input.minimumPayment
              : Math.max(25, Math.round(balance * 0.02))
            : undefined,
        dueDay: input.type === "checking" || input.type === "savings" ? undefined : (input.dueDay ?? 15),
        loanKind: input.type === "loan" ? (input.loanKind ?? "personal") : undefined,
        originalBalance: input.type === "loan" ? Math.round(balance * 1.2) : undefined,
        remainingMonths: input.type === "loan" ? 60 : undefined,
        userAdded: true,
      };

      setState((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          accounts: [...prev.profile.accounts, account],
        },
      }));
      void persist({ type: "account.connect", account: { ...input, id } });
      return {
        ok: true,
        message: `${input.institution.trim()} ${input.name.trim()} connected.`,
      };
    },
    [persist],
  );

  const disconnectAccount = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          accounts: prev.profile.accounts.filter((account) => account.id !== id),
          transactions: prev.profile.transactions.filter((tx) => tx.accountId !== id),
          goals: prev.profile.goals.map((goal) =>
            goal.accountId === id ? { ...goal, accountId: undefined } : goal,
          ),
        },
      }));
      void persist({ type: "account.disconnect", id });
    },
    [persist],
  );

  const updatePreferences = useCallback(
    (patch: Partial<Preferences>) => {
      setState((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          preferences: { ...prev.profile.preferences, ...patch },
        },
      }));
      void persist({ type: "preferences.update", patch });
    },
    [persist],
  );

  const cancelSubscription = useCallback(
    (merchant: string) => {
      setState((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          preferences: {
            ...prev.profile.preferences,
            cancelledSubscriptions: Array.from(
              new Set([...prev.profile.preferences.cancelledSubscriptions, merchant]),
            ),
          },
        },
      }));
      void persist({ type: "subscription.cancel", merchant });
    },
    [persist],
  );

  const reactivateSubscription = useCallback(
    (merchant: string) => {
      setState((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          preferences: {
            ...prev.profile.preferences,
            cancelledSubscriptions: prev.profile.preferences.cancelledSubscriptions.filter(
              (entry) => entry !== merchant,
            ),
          },
        },
      }));
      void persist({ type: "subscription.reactivate", merchant });
    },
    [persist],
  );

  const toggleChallenge = useCallback(
    (id: string) => {
      const enrolled = state.profile.preferences.enrolledChallenges.includes(id);
      const next = enrolled
        ? state.profile.preferences.enrolledChallenges.filter((entry) => entry !== id)
        : [...state.profile.preferences.enrolledChallenges, id];
      updatePreferences({ enrolledChallenges: next });
      return !enrolled;
    },
    [state.profile.preferences.enrolledChallenges, updatePreferences],
  );

  const appendMessage = useCallback(
    (message: AdvisorMessage) => {
      setState((prev) => ({ ...prev, chat: [...prev.chat, message] }));
      void persist({ type: "chat.append", message });
    },
    [persist],
  );

  const resetDemo = useCallback(() => {
    const profile = buildDemoProfile();
    setState(initialState(profile, []));
    setSyncError(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore unavailable storage.
    }
  }, []);

  const value = useMemo<FinanceContextValue>(
    () => ({
      ...state,
      mode,
      hydrated,
      pendingSync,
      syncError,
      contribute,
      setGoalTarget,
      createGoal,
      addTransaction,
      connectAccount,
      disconnectAccount,
      updatePreferences,
      cancelSubscription,
      reactivateSubscription,
      toggleChallenge,
      appendMessage,
      resetDemo,
    }),
    [
      state,
      mode,
      hydrated,
      pendingSync,
      syncError,
      contribute,
      setGoalTarget,
      createGoal,
      addTransaction,
      connectAccount,
      disconnectAccount,
      updatePreferences,
      cancelSubscription,
      reactivateSubscription,
      toggleChallenge,
      appendMessage,
      resetDemo,
    ],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error("useFinance must be used inside FinanceProvider");
  }
  return context;
}
