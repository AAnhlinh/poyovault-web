import "server-only";

import type {
  AdvisorMessage,
  ConnectedAccount,
  FinancialProfile,
  PartnerOffer,
  Preferences,
  ProfileBundle,
  SavingsGoal,
  Transaction,
} from "../types";
import { buildDemoProfile } from "./sample";
import { OFFERS, PREFERENCES } from "./fixtures";
import { isSupabaseConfigured } from "../supabase/config";
import { createSupabaseServerClient } from "../supabase/server";

function demoBundle(): ProfileBundle {
  return { profile: buildDemoProfile(), chat: [], mode: "demo" };
}

function mapAccount(row: Record<string, unknown>): ConnectedAccount {
  return {
    id: String(row.id),
    institution: String(row.institution),
    name: String(row.name),
    type: row.type as ConnectedAccount["type"],
    mask: String(row.mask ?? "0000"),
    balance: Number(row.balance ?? 0),
    accent: String(row.accent ?? "#6366F1"),
    logo: String(row.logo ?? "FS"),
    lastSyncedAt: String(row.last_synced_at ?? new Date().toISOString()),
    creditLimit: row.credit_limit == null ? undefined : Number(row.credit_limit),
    apr: row.apr == null ? undefined : Number(row.apr),
    minimumPayment: row.minimum_payment == null ? undefined : Number(row.minimum_payment),
    dueDay: row.due_day == null ? undefined : Number(row.due_day),
    originalBalance: row.original_balance == null ? undefined : Number(row.original_balance),
    termMonths: row.term_months == null ? undefined : Number(row.term_months),
    remainingMonths: row.remaining_months == null ? undefined : Number(row.remaining_months),
    loanKind: (row.loan_kind as ConnectedAccount["loanKind"]) ?? undefined,
  };
}

function mapTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: String(row.id),
    accountId: String(row.account_id ?? ""),
    merchant: String(row.merchant),
    category: row.category as Transaction["category"],
    amount: Number(row.amount ?? 0),
    date: String(row.occurred_at),
    type: row.type as Transaction["type"],
    recurring: Boolean(row.recurring),
    subscription: Boolean(row.is_subscription),
  };
}

function mapGoal(row: Record<string, unknown>): SavingsGoal {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ""),
    target: Number(row.target ?? 0),
    saved: Number(row.saved ?? 0),
    targetDate: row.target_date ? String(row.target_date) : undefined,
    accountId: row.account_id ? String(row.account_id) : undefined,
    priority: (row.priority as SavingsGoal["priority"]) ?? "medium",
    color: String(row.color ?? "#5EEAD4"),
    icon: (row.icon as SavingsGoal["icon"]) ?? "sparkles",
  };
}

function mapPreferences(row: Record<string, unknown> | null): Preferences {
  if (!row) return { ...PREFERENCES };
  return {
    personalizedOffers: Boolean(row.personalized_offers),
    aiAnalysis: Boolean(row.ai_analysis),
    productAnalytics: Boolean(row.product_analytics),
    thirdPartySharing: Boolean(row.third_party_sharing),
    weeklyDigest: Boolean(row.weekly_digest),
    billReminders: Boolean(row.bill_reminders),
    goalMilestones: Boolean(row.goal_milestones),
    enrolledChallenges: (row.enrolled_challenges as string[]) ?? [],
    cancelledSubscriptions: (row.cancelled_subscriptions as string[]) ?? [],
    diningBudget: Number(row.dining_budget ?? 450),
  };
}

function mapChat(row: Record<string, unknown>): AdvisorMessage {
  return {
    id: String(row.id),
    role: row.role === "user" ? "user" : "assistant",
    content: String(row.content ?? ""),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    suggestions: (row.suggestions as string[]) ?? [],
  };
}

function mapOffer(row: Record<string, unknown>): PartnerOffer {
  return {
    id: String(row.id),
    partner: String(row.partner),
    tagline: String(row.tagline),
    description: String(row.description),
    discount: String(row.discount),
    category: row.category as PartnerOffer["category"],
    expiresAt: String(row.expires_at),
    eligibility: String(row.eligibility),
    sponsored: Boolean(row.sponsored),
    accent: String(row.accent ?? "#38BDF8"),
    savingsModel: (row.savings_model as PartnerOffer["savingsModel"]) ?? undefined,
    savingsValue: row.savings_value == null ? undefined : Number(row.savings_value),
  };
}

/**
 * Loads the signed-in customer's data when Supabase is configured, otherwise
 * returns the curated demo customer. Falls back to demo mode when a signed-in
 * account has not been seeded yet so the product is never an empty shell.
 */
export async function loadProfileBundle(): Promise<ProfileBundle> {
  if (!isSupabaseConfigured) return demoBundle();

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return demoBundle();

    const [profileResult, accountsResult, transactionsResult, goalsResult, prefsResult, chatResult, offersResult] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("accounts").select("*").eq("user_id", user.id).order("created_at"),
        supabase
          .from("transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("occurred_at", { ascending: false }),
        supabase.from("goals").select("*").eq("user_id", user.id).order("created_at"),
        supabase.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("chat_messages")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(60),
        supabase.from("partner_offers").select("*").order("partner"),
      ]);

    const accounts = (accountsResult.data ?? []).map(mapAccount);
    if (accounts.length === 0) return demoBundle();

    const offerRows = offersResult.data ?? [];
    const offers = offerRows.length > 0 ? offerRows.map(mapOffer) : OFFERS;
    const chat = (chatResult.data ?? []).map(mapChat);

    const profile: FinancialProfile = {
      customer: {
        id: user.id,
        name:
          String(profileResult.data?.full_name ?? "").trim() ||
          user.email?.split("@")[0] ||
          "PoyoVault customer",
        email: String(profileResult.data?.email ?? user.email ?? ""),
        since: String(profileResult.data?.created_at ?? user.created_at ?? new Date().toISOString()),
        avatarInitials: (
          String(profileResult.data?.full_name ?? user.email ?? "FS")
            .split(/\s+/)
            .map((part) => part[0])
            .join("")
            .slice(0, 2) || "FS"
        ).toUpperCase(),
        plan: String(profileResult.data?.plan ?? "PoyoVault Premium"),
      },
      accounts,
      transactions: (transactionsResult.data ?? []).map(mapTransaction),
      goals: (goalsResult.data ?? []).map(mapGoal),
      preferences: mapPreferences(prefsResult.data as Record<string, unknown> | null),
      offers,
      asOf: new Date().toISOString(),
    };

    return { profile, chat, mode: "cloud" };
  } catch (error) {
    console.error("PoyoVault: falling back to demo data", error);
    return demoBundle();
  }
}
