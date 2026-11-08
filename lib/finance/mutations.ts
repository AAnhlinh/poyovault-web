import type {
  AccountType,
  AdvisorMessage,
  LoanKind,
  Preferences,
  SavingsGoal,
  TransactionCategory,
  TransactionType,
} from "../types";

export interface ConnectAccountInput {
  institution: string;
  name: string;
  type: AccountType;
  balance: number;
  mask?: string;
  creditLimit?: number;
  apr?: number;
  minimumPayment?: number;
  dueDay?: number;
  loanKind?: LoanKind;
}

export interface NewGoalInput {
  name: string;
  target: number;
  saved?: number;
  targetDate?: string;
  priority?: SavingsGoal["priority"];
  color?: string;
  icon?: SavingsGoal["icon"];
}

export interface NewTransactionInput {
  accountId: string;
  merchant: string;
  category: TransactionCategory;
  amount: number;
  date: string;
  type: TransactionType;
}

export type FinanceMutation =
  | { type: "goal.contribute"; goalId: string; amount: number }
  | { type: "goal.target"; goalId: string; target: number }
  | { type: "goal.create"; goal: NewGoalInput & { id: string } }
  | { type: "transaction.create"; transaction: NewTransactionInput & { id: string } }
  | { type: "account.connect"; account: ConnectAccountInput & { id: string } }
  | { type: "account.disconnect"; id: string }
  | { type: "preferences.update"; patch: Partial<Preferences> }
  | { type: "subscription.cancel"; merchant: string }
  | { type: "subscription.reactivate"; merchant: string }
  | { type: "chat.append"; message: AdvisorMessage };

export const PREFERENCE_KEYS: (keyof Preferences)[] = [
  "personalizedOffers",
  "aiAnalysis",
  "productAnalytics",
  "thirdPartySharing",
  "weeklyDigest",
  "billReminders",
  "goalMilestones",
  "enrolledChallenges",
  "cancelledSubscriptions",
  "diningBudget",
];
