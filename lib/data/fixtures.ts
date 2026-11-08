import type {
  ConnectedAccount,
  PartnerOffer,
  Preferences,
  SavingsGoal,
  SpendingCategory,
} from "../types";

/**
 * Curated sample customer for the PoyoVault prototype.
 * Every number on screen is derived from this dataset — nothing is random at runtime.
 */
export const CUSTOMER = {
  id: "customer_maya_chen",
  name: "Maya Chen",
  email: "maya.chen@example.com",
  since: "2022-03-14",
  avatarInitials: "MC",
  plan: "PoyoVault Premium",
};

export const ACCOUNTS: ConnectedAccount[] = [
  {
    id: "acc_chase_checking",
    institution: "Chase",
    name: "Total Checking",
    type: "checking",
    mask: "4821",
    balance: 5240,
    accent: "#3B82F6",
    logo: "CH",
    lastSyncedAt: "",
  },
  {
    id: "acc_ally_savings",
    institution: "Ally Bank",
    name: "High-Yield Savings",
    type: "savings",
    mask: "7714",
    balance: 6100,
    accent: "#A78BFA",
    logo: "AL",
    apr: 0.042,
    lastSyncedAt: "",
  },
  {
    id: "acc_cap1_savings",
    institution: "Capital One",
    name: "360 Performance Savings",
    type: "savings",
    mask: "3390",
    balance: 2150,
    accent: "#FB923C",
    logo: "C1",
    apr: 0.041,
    lastSyncedAt: "",
  },
  {
    id: "acc_freedom",
    institution: "Chase",
    name: "Freedom Unlimited",
    type: "credit_card",
    mask: "2049",
    balance: 4850,
    accent: "#6366F1",
    logo: "CF",
    creditLimit: 16000,
    apr: 0.2449,
    minimumPayment: 165,
    dueDay: 18,
    lastSyncedAt: "",
  },
  {
    id: "acc_amex",
    institution: "American Express",
    name: "Blue Cash Everyday",
    type: "credit_card",
    mask: "1008",
    balance: 1240,
    accent: "#38BDF8",
    logo: "AX",
    creditLimit: 6000,
    apr: 0.2199,
    minimumPayment: 45,
    dueDay: 5,
    lastSyncedAt: "",
  },
  {
    id: "acc_mortgage",
    institution: "Rocket Mortgage",
    name: "30-Year Fixed · Primary Home",
    type: "loan",
    mask: "5527",
    balance: 248000,
    accent: "#F472B6",
    logo: "RM",
    apr: 0.059,
    minimumPayment: 1690,
    dueDay: 1,
    originalBalance: 265000,
    termMonths: 360,
    remainingMonths: 312,
    loanKind: "mortgage",
    lastSyncedAt: "",
  },
  {
    id: "acc_auto",
    institution: "Toyota Financial",
    name: "Camry Auto Loan",
    type: "loan",
    mask: "8830",
    balance: 13900,
    accent: "#34D399",
    logo: "TF",
    apr: 0.062,
    minimumPayment: 392,
    dueDay: 12,
    originalBalance: 24500,
    termMonths: 60,
    remainingMonths: 38,
    loanKind: "auto",
    lastSyncedAt: "",
  },
  {
    id: "acc_student",
    institution: "Nelnet",
    name: "Graduate Student Loan",
    type: "loan",
    mask: "6612",
    balance: 16200,
    accent: "#60A5FA",
    logo: "NL",
    apr: 0.051,
    minimumPayment: 285,
    dueDay: 24,
    originalBalance: 21000,
    termMonths: 120,
    remainingMonths: 78,
    loanKind: "student",
    lastSyncedAt: "",
  },
];

export const GOALS: SavingsGoal[] = [
  {
    id: "goal_emergency",
    name: "Emergency Fund",
    description: "Three months of essential expenses, kept liquid at Ally.",
    target: 12000,
    saved: 6100,
    targetDate: `${new Date().getFullYear() + 1}-04-30`,
    accountId: "acc_ally_savings",
    priority: "high",
    color: "#5EEAD4",
    icon: "shield",
  },
  {
    id: "goal_japan",
    name: "Japan 2027",
    description: "Two weeks in Tokyo and Kyoto — flights, rail pass and stays.",
    target: 5500,
    saved: 2150,
    targetDate: "2027-08-01",
    accountId: "acc_cap1_savings",
    priority: "medium",
    color: "#63D8FF",
    icon: "plane",
  },
  {
    id: "goal_home",
    name: "Home Maintenance",
    description: "A cushion for the roof, HVAC and the surprises in between.",
    target: 4000,
    saved: 1200,
    targetDate: `${new Date().getFullYear() + 1}-12-31`,
    priority: "medium",
    color: "#A78BFA",
    icon: "home",
  },
];

export const PAYROLL = {
  merchant: "Northwind Studio · Direct Deposit",
  amount: 3710,
  days: [1, 15],
  accountId: "acc_chase_checking",
};

export interface MerchantSpec {
  merchant: string;
  category: SpendingCategory;
  accountId: string;
  /** Monthly frequency range (inclusive). */
  perMonth: [number, number];
  amount: [number, number];
  /** Multiplier applied per month of history, used to model believable drift. */
  trend?: number;
  /** Only appears every N months (1-indexed offset). */
  everyNMonths?: number;
  /** Fixed day of month for recurring bills and subscriptions. */
  day?: number;
  subscription?: boolean;
}

const CHECKING = "acc_chase_checking";
const FREEDOM = "acc_freedom";
const AMEX = "acc_amex";

export const MERCHANTS: MerchantSpec[] = [
  // Groceries
  { merchant: "Whole Foods Market", category: "groceries", accountId: FREEDOM, perMonth: [2, 3], amount: [74, 118] },
  { merchant: "Trader Joe's", category: "groceries", accountId: AMEX, perMonth: [1, 2], amount: [48, 84] },
  { merchant: "Safeway", category: "groceries", accountId: FREEDOM, perMonth: [1, 1], amount: [58, 92] },
  { merchant: "Ferry Plaza Farmers Market", category: "groceries", accountId: CHECKING, perMonth: [0, 1], amount: [32, 54] },

  // Restaurants and takeout
  { merchant: "Sweetgreen", category: "dining", accountId: AMEX, perMonth: [2, 2], amount: [15, 19], trend: 0.025 },
  { merchant: "Blue Bottle Coffee", category: "dining", accountId: AMEX, perMonth: [3, 5], amount: [6.5, 9.5], trend: 0.03 },
  { merchant: "Chipotle", category: "dining", accountId: FREEDOM, perMonth: [1, 2], amount: [12, 18], trend: 0.03 },
  { merchant: "Toscano Ristorante", category: "dining", accountId: FREEDOM, perMonth: [1, 1], amount: [62, 94], trend: 0.02 },
  { merchant: "DoorDash", category: "dining", accountId: FREEDOM, perMonth: [2, 3], amount: [26, 44], trend: 0.045 },
  { merchant: "Sushi Ryu", category: "dining", accountId: FREEDOM, perMonth: [0, 1], amount: [88, 118], trend: 0.02 },

  // Entertainment
  { merchant: "AMC Theatres", category: "entertainment", accountId: AMEX, perMonth: [1, 1], amount: [28, 36] },
  { merchant: "Steam", category: "entertainment", accountId: FREEDOM, perMonth: [0, 1], amount: [18, 48] },
  { merchant: "Live Nation", category: "entertainment", accountId: FREEDOM, perMonth: [0, 1], amount: [72, 128], everyNMonths: 3 },

  // Shopping
  { merchant: "Amazon", category: "shopping", accountId: FREEDOM, perMonth: [3, 4], amount: [32, 88], trend: 0.05 },
  { merchant: "Target", category: "shopping", accountId: AMEX, perMonth: [1, 2], amount: [48, 86], trend: 0.035 },
  { merchant: "Nike", category: "shopping", accountId: FREEDOM, perMonth: [0, 1], amount: [96, 148], everyNMonths: 2 },
  { merchant: "Apple", category: "shopping", accountId: AMEX, perMonth: [0, 1], amount: [24, 129], everyNMonths: 3 },

  // Transportation
  { merchant: "Shell", category: "transportation", accountId: AMEX, perMonth: [2, 3], amount: [42, 64] },
  { merchant: "Uber", category: "transportation", accountId: FREEDOM, perMonth: [2, 4], amount: [12, 29], trend: 0.02 },
  { merchant: "Muni Mobile", category: "transportation", accountId: CHECKING, perMonth: [1, 1], amount: [64, 64], day: 3 },
  { merchant: "SFMTA Parking", category: "transportation", accountId: AMEX, perMonth: [1, 1], amount: [14, 26] },

  // Utilities
  { merchant: "Pacific Gas & Electric", category: "utilities", accountId: CHECKING, perMonth: [1, 1], amount: [116, 148], day: 8 },
  { merchant: "Xfinity Internet", category: "utilities", accountId: CHECKING, perMonth: [1, 1], amount: [85, 85], day: 11 },
  { merchant: "SF Water Power Sewer", category: "utilities", accountId: CHECKING, perMonth: [1, 1], amount: [28, 36], day: 20 },

  // Subscriptions — fixed monthly charges, used by the subscription tracker
  { merchant: "Netflix", category: "subscriptions", accountId: AMEX, perMonth: [1, 1], amount: [22.99, 22.99], day: 4, subscription: true },
  { merchant: "Spotify Premium", category: "subscriptions", accountId: FREEDOM, perMonth: [1, 1], amount: [11.99, 11.99], day: 9, subscription: true },
  { merchant: "Adobe Creative Cloud", category: "subscriptions", accountId: FREEDOM, perMonth: [1, 1], amount: [22.99, 22.99], day: 12, subscription: true },
  { merchant: "iCloud+", category: "subscriptions", accountId: CHECKING, perMonth: [1, 1], amount: [2.99, 2.99], day: 17, subscription: true },
  { merchant: "The New York Times", category: "subscriptions", accountId: FREEDOM, perMonth: [1, 1], amount: [17, 17], day: 21, subscription: true },
  { merchant: "Peloton App", category: "subscriptions", accountId: AMEX, perMonth: [1, 1], amount: [12.99, 12.99], day: 26, subscription: true },

  // Healthcare
  { merchant: "CVS Pharmacy", category: "healthcare", accountId: AMEX, perMonth: [1, 2], amount: [16, 58] },
  { merchant: "One Medical", category: "healthcare", accountId: CHECKING, perMonth: [1, 1], amount: [29, 29], day: 14 },
  { merchant: "Bay Area Dental", category: "healthcare", accountId: FREEDOM, perMonth: [0, 1], amount: [65, 145], everyNMonths: 6 },

  // Insurance
  { merchant: "State Farm", category: "insurance", accountId: CHECKING, perMonth: [1, 1], amount: [145, 145], day: 7 },

  // Travel — a couple of trips across the window
  { merchant: "Delta Air Lines", category: "travel", accountId: FREEDOM, perMonth: [0, 1], amount: [248, 318], everyNMonths: 3 },
  { merchant: "Airbnb", category: "travel", accountId: FREEDOM, perMonth: [0, 1], amount: [368, 452], everyNMonths: 3 },
  { merchant: "Hertz", category: "travel", accountId: AMEX, perMonth: [0, 1], amount: [96, 148], everyNMonths: 3 },

  // Other
  { merchant: "Everlane", category: "other", accountId: FREEDOM, perMonth: [0, 1], amount: [38, 96], everyNMonths: 2 },
  { merchant: "Green Cleaners", category: "other", accountId: CHECKING, perMonth: [1, 2], amount: [18, 34] },
];

export const PREFERENCES: Preferences = {
  personalizedOffers: true,
  aiAnalysis: true,
  productAnalytics: false,
  thirdPartySharing: false,
  weeklyDigest: true,
  billReminders: true,
  goalMilestones: true,
  enrolledChallenges: ["challenge_dining"],
  diningBudget: 450,
  cancelledSubscriptions: [],
};

function futureDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export const OFFERS: PartnerOffer[] = [
  {
    id: "offer_wholefoods",
    partner: "Whole Foods Market",
    tagline: "5% back on groceries, every week",
    description:
      "Use your linked Visa at any Whole Foods location and earn 5% back on up to $800 of qualifying groceries each month.",
    discount: "5% back",
    category: "groceries",
    expiresAt: futureDate(64),
    eligibility: "PoyoVault members with a linked eligible Visa card.",
    sponsored: true,
    accent: "#34D399",
    savingsModel: "percent",
    savingsValue: 0.05,
    savingsCadence: "monthly",
    maxSavings: 40,
  },
  {
    id: "offer_bluenote",
    partner: "Blue Bottle Coffee",
    tagline: "$10 off a monthly coffee subscription",
    description:
      "Take $10 off your first month of a Blue Bottle subscription and get free shipping on every delivery.",
    discount: "$10 off",
    category: "dining",
    expiresAt: futureDate(38),
    eligibility: "New Blue Bottle subscribers.",
    sponsored: true,
    accent: "#60A5FA",
    savingsModel: "flat",
    savingsValue: 10,
    savingsCadence: "one-time",
  },
  {
    id: "offer_doordash",
    partner: "DoorDash",
    tagline: "3 months of DashPass on us",
    description:
      "Enjoy $0 delivery fees and reduced service fees on orders over $12. Worth $9.99 a month after the trial ends.",
    discount: "$29.97 value",
    category: "dining",
    expiresAt: futureDate(22),
    eligibility: "Members who have not had DashPass in the last 12 months.",
    sponsored: true,
    accent: "#FB7185",
    savingsModel: "flat",
    savingsValue: 29.97,
    savingsCadence: "one-time",
  },
  {
    id: "offer_sweetgreen",
    partner: "Sweetgreen",
    tagline: "$5 off orders over $25",
    description:
      "A straightforward credit on your next Sweetgreen order, online or in the app. Stackable with rewards.",
    discount: "$5 off",
    category: "dining",
    expiresAt: futureDate(16),
    eligibility: "One redemption per member.",
    sponsored: false,
    accent: "#BEF264",
    savingsModel: "flat",
    savingsValue: 5,
    savingsCadence: "one-time",
  },
  {
    id: "offer_amtrak",
    partner: "Amtrak",
    tagline: "15% off regional rail",
    description:
      "Save 15% on Capitol Corridor and San Joaquins fares when you book with your PoyoVault-linked card.",
    discount: "15% off",
    category: "transportation",
    expiresAt: futureDate(91),
    eligibility: "California regional routes, advance booking required.",
    sponsored: true,
    accent: "#FBBF24",
    savingsModel: "percent",
    savingsValue: 0.15,
    savingsCadence: "one-time",
    maxSavings: 40,
  },
  {
    id: "offer_nike",
    partner: "Nike",
    tagline: "20% off one purchase",
    description:
      "Take 20% off a single order of $100 or more at Nike.com, including sale items.",
    discount: "20% off",
    category: "shopping",
    expiresAt: futureDate(53),
    eligibility: "Nike Members · one use per account.",
    sponsored: true,
    accent: "#F472B6",
    savingsModel: "percent",
    savingsValue: 0.2,
    savingsCadence: "one-time",
    maxSavings: 40,
  },
  {
    id: "offer_adobe",
    partner: "Adobe",
    tagline: "20% off an annual Creative Cloud plan",
    description:
      "Switch your monthly Creative Cloud plan to annual billing and save 20% for the first year.",
    discount: "20% off",
    category: "subscriptions",
    expiresAt: futureDate(74),
    eligibility: "Existing Creative Cloud subscribers on monthly billing.",
    sponsored: false,
    accent: "#A78BFA",
    savingsModel: "percent",
    savingsValue: 0.2,
    savingsCadence: "yearly",
    maxSavings: 60,
  },
  {
    id: "offer_airbnb",
    partner: "Airbnb",
    tagline: "$50 travel credit on your next stay",
    description:
      "Book a stay of three nights or more and receive a $50 credit applied after checkout.",
    discount: "$50 credit",
    category: "travel",
    expiresAt: futureDate(120),
    eligibility: "Minimum three-night stay · one credit per year.",
    sponsored: true,
    accent: "#F97316",
    savingsModel: "flat",
    savingsValue: 50,
    savingsCadence: "yearly",
  },
  {
    id: "offer_peloton",
    partner: "Peloton",
    tagline: "30-day guest pass for the App",
    description:
      "Full access to strength, cycling and meditation classes for 30 days — no equipment required.",
    discount: "30 days free",
    category: "wellness",
    expiresAt: futureDate(45),
    eligibility: "New App members only.",
    sponsored: false,
    accent: "#FB7185",
    savingsModel: "flat",
    savingsValue: 12.99,
    savingsCadence: "one-time",
  },
  {
    id: "offer_cvs",
    partner: "CVS Health",
    tagline: "20% off wellness essentials",
    description:
      "Save 20% on eligible over-the-counter health and wellness products, both in store and online.",
    discount: "20% off",
    category: "healthcare",
    expiresAt: futureDate(29),
    eligibility: "Excludes prescriptions and gift cards.",
    sponsored: true,
    accent: "#38BDF8",
    savingsModel: "percent",
    savingsValue: 0.2,
    savingsCadence: "monthly",
    maxSavings: 15,
  },
];

export const SUBSCRIPTION_BASELINE = [
  { merchant: "Netflix", day: 4, amount: 22.99, category: "Streaming" },
  { merchant: "Spotify Premium", day: 9, amount: 11.99, category: "Music" },
  { merchant: "Adobe Creative Cloud", day: 12, amount: 22.99, category: "Productivity" },
  { merchant: "iCloud+", day: 17, amount: 2.99, category: "Storage" },
  { merchant: "The New York Times", day: 21, amount: 17, category: "News" },
  { merchant: "Peloton App", day: 26, amount: 12.99, category: "Fitness" },
];
