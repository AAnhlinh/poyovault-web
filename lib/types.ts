// Core domain types shared by the sample dataset, the finance engine and Supabase mappers.

export type AccountType = "checking" | "savings" | "credit_card" | "loan";
export type LoanKind = "mortgage" | "auto" | "student" | "personal";

export interface ConnectedAccount {
  id: string;
  institution: string;
  name: string;
  type: AccountType;
  mask: string;
  /** Deposit accounts: current balance. Credit/loan accounts: outstanding balance (positive). */
  balance: number;
  /** Brand accent used for the institution tile. */
  accent: string;
  logo: string;
  lastSyncedAt: string;
  creditLimit?: number;
  apr?: number;
  minimumPayment?: number;
  dueDay?: number;
  originalBalance?: number;
  termMonths?: number;
  remainingMonths?: number;
  loanKind?: LoanKind;
  /** True when the account was added through the in-app connection flow. */
  userAdded?: boolean;
}

export type SpendingCategory =
  | "groceries"
  | "dining"
  | "entertainment"
  | "shopping"
  | "transportation"
  | "housing"
  | "utilities"
  | "subscriptions"
  | "healthcare"
  | "travel"
  | "insurance"
  | "other";

export type TransactionCategory = SpendingCategory | "income";

export type TransactionType = "expense" | "income";

export interface Transaction {
  id: string;
  accountId: string;
  merchant: string;
  category: TransactionCategory;
  /** Always positive; `type` determines the direction. */
  amount: number;
  date: string;
  type: TransactionType;
  recurring?: boolean;
  subscription?: boolean;
}

export interface SavingsGoal {
  id: string;
  name: string;
  description: string;
  target: number;
  saved: number;
  targetDate?: string;
  accountId?: string;
  priority: "high" | "medium" | "low";
  color: string;
  icon: "shield" | "plane" | "home" | "sparkles";
}

export interface Preferences {
  personalizedOffers: boolean;
  aiAnalysis: boolean;
  productAnalytics: boolean;
  thirdPartySharing: boolean;
  weeklyDigest: boolean;
  billReminders: boolean;
  goalMilestones: boolean;
  enrolledChallenges: string[];
  cancelledSubscriptions: string[];
  diningBudget: number;
}

export interface PartnerOffer {
  id: string;
  partner: string;
  tagline: string;
  description: string;
  discount: string;
  category: SpendingCategory | "wellness" | "travel";
  expiresAt: string;
  eligibility: string;
  sponsored: boolean;
  accent: string;
  /** How the benefit is valued, used to size realistic savings. */
  savingsModel?: "percent" | "flat";
  savingsValue?: number;
  /** Whether the benefit repeats monthly, repeats yearly, or is a one-time credit. */
  savingsCadence?: "monthly" | "one-time" | "yearly";
  /** Optional cap on the annual or one-off benefit. */
  maxSavings?: number;
}

export interface FinancialProfile {
  customer: {
    id: string;
    name: string;
    email: string;
    since: string;
    avatarInitials: string;
    plan: string;
  };
  accounts: ConnectedAccount[];
  transactions: Transaction[];
  goals: SavingsGoal[];
  preferences: Preferences;
  offers: PartnerOffer[];
  asOf: string;
}

export type AdvisorRole = "user" | "assistant";

export interface AdvisorMessage {
  id: string;
  role: AdvisorRole;
  content: string;
  createdAt: string;
  /** Optional structured follow-ups rendered as chips. */
  suggestions?: string[];
}

export interface ProfileBundle {
  profile: FinancialProfile;
  chat: AdvisorMessage[];
  mode: "demo" | "cloud";
}
