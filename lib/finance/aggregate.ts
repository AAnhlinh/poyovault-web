import type {
  ConnectedAccount,
  FinancialProfile,
  Transaction,
} from "../types";
import { addMonths, monthKey, nextDueDate } from "./format";

export interface MonthlyPoint {
  key: string;
  label: string;
  income: number;
  expenses: number;
  debtPayments: number;
  netCashFlow: number;
  byCategory: Record<string, number>;
  isPartial: boolean;
}

export const CATEGORY_META: Record<
  string,
  { label: string; color: string }
> = {
  groceries: { label: "Groceries", color: "#5EEAD4" },
  dining: { label: "Restaurants", color: "#FB7185" },
  entertainment: { label: "Entertainment", color: "#C4B5FD" },
  shopping: { label: "Shopping", color: "#FBBF24" },
  transportation: { label: "Transportation", color: "#63D8FF" },
  housing: { label: "Housing", color: "#A78BFA" },
  utilities: { label: "Utilities", color: "#60A5FA" },
  subscriptions: { label: "Subscriptions", color: "#F472B6" },
  healthcare: { label: "Healthcare", color: "#34D399" },
  travel: { label: "Travel", color: "#38BDF8" },
  insurance: { label: "Insurance", color: "#94A3B8" },
  other: { label: "Other", color: "#818CF8" },
  income: { label: "Income", color: "#BEF264" },
};

export const SPENDING_CATEGORIES = Object.keys(CATEGORY_META).filter(
  (key) => key !== "income",
) as (keyof typeof CATEGORY_META)[];

export function getCreditCards(profile: FinancialProfile) {
  return profile.accounts.filter((a) => a.type === "credit_card");
}

export function getLoans(profile: FinancialProfile) {
  return profile.accounts.filter((a) => a.type === "loan");
}

export function getDepositAccounts(profile: FinancialProfile) {
  return profile.accounts.filter((a) => a.type === "checking" || a.type === "savings");
}

export function getSavingsAccounts(profile: FinancialProfile) {
  return profile.accounts.filter((a) => a.type === "savings");
}

export function getDebtAccounts(profile: FinancialProfile) {
  return profile.accounts.filter((a) => a.type === "credit_card" || a.type === "loan");
}

export function getCheckingBalance(profile: FinancialProfile) {
  return getDepositAccounts(profile)
    .filter((a) => a.type === "checking")
    .reduce((sum, a) => sum + a.balance, 0);
}

export function getTotalSavings(profile: FinancialProfile) {
  return getSavingsAccounts(profile).reduce((sum, a) => sum + a.balance, 0);
}

export function getEmergencySavings(profile: FinancialProfile) {
  const goal = profile.goals.find((g) => g.id === "goal_emergency");
  if (goal?.accountId) {
    const account = profile.accounts.find((a) => a.id === goal.accountId);
    if (account) return account.balance;
  }
  return getTotalSavings(profile);
}

export function getCreditCardBalance(profile: FinancialProfile) {
  return getCreditCards(profile).reduce((sum, a) => sum + a.balance, 0);
}

export function getCreditLimit(profile: FinancialProfile) {
  return getCreditCards(profile).reduce((sum, a) => sum + (a.creditLimit ?? 0), 0);
}

export function getLoanBalance(profile: FinancialProfile) {
  return getLoans(profile).reduce((sum, a) => sum + a.balance, 0);
}

export function getTotalDebt(profile: FinancialProfile) {
  return getCreditCardBalance(profile) + getLoanBalance(profile);
}

export function getMonthlyDebtPayments(profile: FinancialProfile) {
  return getDebtAccounts(profile).reduce((sum, a) => sum + (a.minimumPayment ?? 0), 0);
}

export function getNonMortgageDebtPayments(profile: FinancialProfile) {
  return getDebtAccounts(profile)
    .filter((a) => a.loanKind !== "mortgage")
    .reduce((sum, a) => sum + (a.minimumPayment ?? 0), 0);
}

export function getUtilization(profile: FinancialProfile) {
  const limit = getCreditLimit(profile);
  return limit > 0 ? getCreditCardBalance(profile) / limit : 0;
}

/** Monthly history built directly from the transaction ledger. */
export function getMonthlyHistory(profile: FinancialProfile): MonthlyPoint[] {
  const now = new Date(profile.asOf);
  const buckets = new Map<string, MonthlyPoint>();

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = monthKey(date);
    buckets.set(key, {
      key,
      label: date.toLocaleDateString("en-US", { month: "short" }),
      income: 0,
      expenses: 0,
      debtPayments: 0,
      netCashFlow: 0,
      byCategory: {},
      isPartial: offset === 0,
    });
  }

  for (const tx of profile.transactions) {
    const key = monthKey(tx.date);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (tx.type === "income") {
      bucket.income += tx.amount;
      continue;
    }
    bucket.expenses += tx.amount;
    bucket.byCategory[tx.category] = (bucket.byCategory[tx.category] ?? 0) + tx.amount;
  }

  const debtPayments = getMonthlyDebtPayments(profile);
  for (const bucket of buckets.values()) {
    bucket.debtPayments = debtPayments;
    bucket.netCashFlow = bucket.income - bucket.expenses - bucket.debtPayments;
  }

  return Array.from(buckets.values());
}

export function getCompleteMonths(history: MonthlyPoint[]) {
  return history.filter((month) => !month.isPartial);
}

export function getCurrentMonth(profile: FinancialProfile) {
  const key = monthKey(profile.asOf);
  const history = getMonthlyHistory(profile);
  return history.find((m) => m.key === key) ?? history[history.length - 1];
}

export function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function getTrailingAverage(
  history: MonthlyPoint[],
  field: "income" | "expenses" | "debtPayments",
  months = 3,
) {
  const complete = getCompleteMonths(history).slice(-months);
  return average(complete.map((m) => m[field]));
}

export interface EssentialExpenses {
  housing: number;
  utilities: number;
  groceries: number;
  transportation: number;
  healthcare: number;
  insurance: number;
  minimumDebtPayments: number;
  total: number;
  breakdown: { label: string; amount: number }[];
}

/**
 * Essential expenses deliberately exclude discretionary categories
 * (dining, shopping, entertainment, travel, subscriptions, other).
 */
export function getEssentialExpenses(profile: FinancialProfile): EssentialExpenses {
  const history = getMonthlyHistory(profile);
  const categories: (keyof typeof CATEGORY_META)[] = [
    "utilities",
    "groceries",
    "transportation",
    "healthcare",
    "insurance",
  ];
  const averages = Object.fromEntries(
    categories.map((category) => [
      category,
      average(
        getCompleteMonths(history)
          .slice(-3)
          .map((month) => month.byCategory[category] ?? 0),
      ),
    ]),
  ) as Record<string, number>;

  const mortgage = profile.accounts.find((a) => a.loanKind === "mortgage");
  const housing = mortgage?.minimumPayment ?? 0;
  const minimumDebtPayments = getMonthlyDebtPayments(profile) - housing;

  const breakdown = [
    { label: "Housing payment", amount: housing },
    { label: "Utilities", amount: Math.round(averages.utilities) },
    { label: "Groceries", amount: Math.round(averages.groceries) },
    { label: "Transportation", amount: Math.round(averages.transportation) },
    { label: "Healthcare", amount: Math.round(averages.healthcare) },
    { label: "Insurance", amount: Math.round(averages.insurance) },
    { label: "Minimum debt payments", amount: minimumDebtPayments },
  ];

  return {
    housing,
    utilities: averages.utilities,
    groceries: averages.groceries,
    transportation: averages.transportation,
    healthcare: averages.healthcare,
    insurance: averages.insurance,
    minimumDebtPayments,
    total: breakdown.reduce((sum, item) => sum + item.amount, 0),
    breakdown,
  };
}

export function getEmergencyTarget(profile: FinancialProfile) {
  return getEssentialExpenses(profile).total * 3;
}

export interface DashboardMetrics {
  monthlyIncome: number;
  monthlyExpenses: number;
  totalDebt: number;
  creditCardBalance: number;
  creditLimit: number;
  loanBalance: number;
  totalSavings: number;
  emergencySavings: number;
  monthlyDebtPayments: number;
  disposableIncome: number;
  debtToIncome: number;
  utilization: number;
  savingsRate: number;
  essentialExpenses: number;
  emergencyTarget: number;
  emergencyMonths: number;
  checkingBalance: number;
  netWorth: number;
}

export function getDashboardMetrics(profile: FinancialProfile): DashboardMetrics {
  const history = getMonthlyHistory(profile);
  const monthlyIncome = getTrailingAverage(history, "income");
  const monthlyDebtPayments = getMonthlyDebtPayments(profile);
  const monthlyExpenses =
    getTrailingAverage(history, "expenses") + monthlyDebtPayments;
  const essential = getEssentialExpenses(profile);
  const totalSavings = getTotalSavings(profile);
  const emergencySavings = getEmergencySavings(profile);
  const totalDebt = getTotalDebt(profile);
  const disposableIncome = monthlyIncome - monthlyExpenses;

  return {
    monthlyIncome,
    monthlyExpenses,
    totalDebt,
    creditCardBalance: getCreditCardBalance(profile),
    creditLimit: getCreditLimit(profile),
    loanBalance: getLoanBalance(profile),
    totalSavings,
    emergencySavings,
    monthlyDebtPayments,
    disposableIncome,
    debtToIncome: monthlyIncome > 0 ? monthlyDebtPayments / monthlyIncome : 0,
    utilization: getUtilization(profile),
    savingsRate: monthlyIncome > 0 ? disposableIncome / monthlyIncome : 0,
    essentialExpenses: essential.total,
    emergencyTarget: essential.total * 3,
    emergencyMonths: essential.total > 0 ? emergencySavings / essential.total : 0,
    checkingBalance: getCheckingBalance(profile),
    netWorth:
      totalSavings +
      getCheckingBalance(profile) -
      totalDebt,
  };
}

export interface IncomeSource {
  merchant: string;
  accountId: string;
  monthlyAverage: number;
  occurrences: number;
  lastDate: string;
  consistent: boolean;
}

export function getIncomeSources(profile: FinancialProfile): IncomeSource[] {
  const groups = new Map<string, Transaction[]>();
  for (const tx of profile.transactions) {
    if (tx.type !== "income") continue;
    const list = groups.get(tx.merchant) ?? [];
    list.push(tx);
    groups.set(tx.merchant, list);
  }

  const months = new Set(
    profile.transactions.filter((t) => t.type === "income").map((t) => monthKey(t.date)),
  ).size || 1;

  return Array.from(groups.entries()).map(([merchant, transactions]) => {
    const monthsWithIncome = new Set(transactions.map((t) => monthKey(t.date))).size;
    const sorted = [...transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    const amounts = transactions.map((t) => t.amount);
    const mean = average(amounts);
    const variance = average(amounts.map((amount) => (amount - mean) ** 2));
    const coefficient = mean > 0 ? Math.sqrt(variance) / mean : 1;
    return {
      merchant,
      accountId: sorted[0].accountId,
      monthlyAverage:
        transactions.reduce((sum, tx) => sum + tx.amount, 0) / months,
      occurrences: transactions.length,
      lastDate: sorted[0].date,
      consistent:
        coefficient < 0.08 && monthsWithIncome >= Math.min(3, months),
    };
  });
}

export interface Subscription {
  merchant: string;
  category: string;
  amount: number;
  day: number;
  accountId: string;
  lastCharged: string;
  nextCharge: string;
  active: boolean;
}

export function getSubscriptions(profile: FinancialProfile): Subscription[] {
  const byMerchant = new Map<string, Transaction>();
  for (const tx of profile.transactions) {
    if (!tx.subscription) continue;
    const existing = byMerchant.get(tx.merchant);
    if (!existing || new Date(tx.date) > new Date(existing.date)) {
      byMerchant.set(tx.merchant, tx);
    }
  }

  return Array.from(byMerchant.values())
    .map((tx) => {
      const last = new Date(tx.date);
      const next = nextDueDate(last.getDate(), profile.asOf ? new Date(profile.asOf) : new Date());
      return {
        merchant: tx.merchant,
        category:
          tx.merchant === "Peloton App"
            ? "Fitness"
            : tx.merchant === "The New York Times"
              ? "News"
              : tx.merchant === "Adobe Creative Cloud"
                ? "Productivity"
                : tx.merchant === "iCloud+"
                  ? "Storage"
                  : tx.merchant === "Spotify Premium"
                    ? "Music"
                    : "Streaming",
        amount: tx.amount,
        day: last.getDate(),
        accountId: tx.accountId,
        lastCharged: tx.date,
        nextCharge: next,
        active: !profile.preferences.cancelledSubscriptions.includes(tx.merchant),
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

export function getActiveSubscriptions(profile: FinancialProfile) {
  return getSubscriptions(profile).filter((s) => s.active);
}

export function getSubscriptionMonthlyTotal(profile: FinancialProfile) {
  return getActiveSubscriptions(profile).reduce((sum, sub) => sum + sub.amount, 0);
}

export function getCategoryTotals(
  transactions: Transaction[],
): { category: string; amount: number }[] {
  const totals = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== "expense") continue;
    totals.set(tx.category, (totals.get(tx.category) ?? 0) + tx.amount);
  }
  return Array.from(totals.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function getTransactionsForMonth(profile: FinancialProfile, month: string) {
  return profile.transactions
    .filter((tx) => monthKey(tx.date) === month)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getRecentTransactions(profile: FinancialProfile, limit = 6) {
  return [...profile.transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

export function groupTransactionsByMonth(transactions: Transaction[]) {
  const groups = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const key = monthKey(tx.date);
    const list = groups.get(key) ?? [];
    list.push(tx);
    groups.set(key, list);
  }
  return groups;
}

export interface UpcomingPayment {
  accountId: string;
  name: string;
  institution: string;
  amount: number;
  dueDate: string;
  kind: "credit_card" | "loan";
  daysAway: number;
}

export function getUpcomingPayments(profile: FinancialProfile): UpcomingPayment[] {
  const today = new Date(profile.asOf);
  return getDebtAccounts(profile)
    .filter((a) => a.minimumPayment && a.dueDay)
    .map((account) => {
      const dueDate = new Date(nextDueDate(account.dueDay!, today));
      const daysAway = Math.max(
        0,
        Math.round((dueDate.getTime() - today.getTime()) / 86_400_000),
      );
      return {
        accountId: account.id,
        name: account.name,
        institution: account.institution,
        amount: account.minimumPayment ?? 0,
        dueDate: dueDate.toISOString(),
        kind: account.type as "credit_card" | "loan",
        daysAway,
      };
    })
    .sort((a, b) => a.daysAway - b.daysAway);
}

export function accountTypeLabel(account: ConnectedAccount) {
  if (account.type === "credit_card") return "Credit card";
  if (account.type === "loan") {
    if (account.loanKind === "mortgage") return "Mortgage";
    if (account.loanKind === "auto") return "Auto loan";
    if (account.loanKind === "student") return "Student loan";
    return "Loan";
  }
  if (account.type === "savings") return "Savings";
  return "Checking";
}

export function nextStatementDate(account: ConnectedAccount) {
  if (!account.dueDay) return null;
  return nextDueDate(account.dueDay);
}

export function projectMonthDate(monthsAhead: number) {
  return monthKey(addMonths(new Date(), monthsAhead));
}
