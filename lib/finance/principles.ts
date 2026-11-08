/**
 * Trusted financial-education catalogue.
 *
 * These are the principles the recommendation engine is allowed to draw on.
 * Each recommendation elsewhere in the app references one of these ids so we
 * can explain *why* advice was surfaced. This is educational guidance, not
 * personalised financial advice or a promise of outcomes.
 */

export type PrincipleCategory = "debt" | "savings" | "spending" | "planning";

export interface FinancialPrinciple {
  id: string;
  category: PrincipleCategory;
  title: string;
  principle: string;
  rationale: string;
  appliesWhen: string;
  source: string;
  reference: string;
}

export const PRINCIPLES: FinancialPrinciple[] = [
  {
    id: "debt_high_apr_first",
    category: "debt",
    title: "Retire the most expensive balance first",
    principle:
      "When you have spare money, direct extra payments to the debt with the highest interest rate before lower-rate balances.",
    rationale:
      "Interest compounds against you. A 24% credit card costs roughly four times as much per dollar borrowed as a 6% auto loan.",
    appliesWhen: "Two or more debts carry materially different interest rates.",
    source: "Consumer Financial Protection Bureau",
    reference: "cfpb.gov · pay off debt",
  },
  {
    id: "debt_never_miss_minimum",
    category: "debt",
    title: "Protect every minimum payment",
    principle:
      "Always cover required minimum payments on all debts before directing extra money anywhere else.",
    rationale:
      "Missed payments trigger late fees, penalty interest and credit-report damage that can cost far more than the extra payment would have saved.",
    appliesWhen: "Any month with more than one active debt payment.",
    source: "Consumer Financial Protection Bureau",
    reference: "cfpb.gov · credit reports",
  },
  {
    id: "debt_avoid_new_high_interest",
    category: "debt",
    title: "Do not grow high-interest debt",
    principle:
      "Avoid adding new balances to high-interest cards while paying them down.",
    rationale:
      "Paying $200 toward a card while charging $250 back leaves the balance rising and the payoff date moving further away.",
    appliesWhen: "A revolving credit card balance is above zero.",
    source: "FDIC",
    reference: "fdic.gov · credit card basics",
  },
  {
    id: "debt_snowball_order",
    category: "debt",
    title: "Momentum is a real strategy",
    principle:
      "The snowball method — clearing the smallest balances first — can help people stay consistent even when it costs slightly more interest.",
    rationale:
      "Early wins reinforce the habit. Behavioural consistency often matters more than the mathematically optimal ordering.",
    appliesWhen: "Several small balances exist alongside larger ones.",
    source: "Harvard Business Review · Gal & McShane",
    reference: "research on debt repayment behaviour",
  },
  {
    id: "savings_emergency_target",
    category: "savings",
    title: "Build three to six months of essentials",
    principle:
      "Aim for three to six months of essential living expenses in an accessible emergency fund, measured against expenses rather than income.",
    rationale:
      "The fund exists to cover unavoidable costs — housing, food, utilities, insurance and minimum debt payments — if income stops.",
    appliesWhen: "Always; recalculate whenever essentials change.",
    source: "Consumer Financial Protection Bureau",
    reference: "cfpb.gov · emergency savings",
  },
  {
    id: "savings_before_extra_debt",
    category: "savings",
    title: "A thin cushion comes before aggressive payoff",
    principle:
      "If emergency savings cover less than about one month of essentials, prioritise a small cushion before sending every spare dollar to debt.",
    rationale:
      "Without a cushion, an unexpected bill goes straight onto a credit card — often reversing the debt progress you just made.",
    appliesWhen: "Emergency coverage is below one month and card rates are high.",
    source: "Federal Reserve · SHED research",
    reference: "federalreserve.gov · household financial resilience",
  },
  {
    id: "savings_automatic",
    category: "savings",
    title: "Automate the transfer",
    principle:
      "Move savings automatically on payday instead of saving whatever is left at the end of the month.",
    rationale:
      "Saving first makes the transfer a fixed cost, like rent. Saving last makes it optional, and optional rarely happens consistently.",
    appliesWhen: "Income arrives on a predictable schedule.",
    source: "Behavioural Insights Team",
    reference: "automatic enrolment research",
  },
  {
    id: "savings_keep_accessible",
    category: "savings",
    title: "Keep emergency money accessible",
    principle:
      "Hold emergency savings somewhere safe and quickly reachable, accepting a modest return in exchange for liquidity.",
    rationale:
      "An emergency fund that is locked up, volatile or hard to withdraw does not do the job it was built for.",
    appliesWhen: "Choosing where to hold emergency savings.",
    source: "FDIC",
    reference: "fdic.gov · deposit insurance",
  },
  {
    id: "spending_review_subscriptions",
    category: "spending",
    title: "Audit recurring subscriptions",
    principle:
      "Review recurring charges at least twice a year and cancel anything you no longer actively use.",
    rationale:
      "Subscriptions are small, automatic and easy to forget. A handful of unused services can quietly cost several hundred dollars a year.",
    appliesWhen: "Recurring subscription charges are detected.",
    source: "Consumer Financial Protection Bureau",
    reference: "cfpb.gov · managing recurring charges",
  },
  {
    id: "spending_limit_discretionary",
    category: "spending",
    title: "Set limits on flexible spending",
    principle:
      "Give flexible categories — dining, shopping, entertainment — a clear monthly number instead of tracking them after the fact.",
    rationale:
      "A limit converts vague intentions into a decision rule, which is easier to follow than constant self-assessment.",
    appliesWhen: "Discretionary spending is growing relative to income.",
    source: "Behavioural Insights Team",
    reference: "commitment devices in household finance",
  },
  {
    id: "spending_compare_to_income",
    category: "spending",
    title: "Compare spending to income, not just last month",
    principle:
      "Judge a category by its share of take-home income, not only by whether it rose or fell.",
    rationale:
      "A $50 increase matters differently on a $3,000 income than on a $9,000 one. Share of income keeps the comparison honest.",
    appliesWhen: "Evaluating whether a spending change is material.",
    source: "Consumer Financial Protection Bureau",
    reference: "cfpb.gov · budgeting",
  },
  {
    id: "planning_upcoming_obligations",
    category: "planning",
    title: "Reserve money already committed",
    principle:
      "Before spending, subtract upcoming bills, minimum payments and known annual costs from the balance you can see.",
    rationale:
      "Available balance is not spendable balance. Committed money spent twice becomes overdraft or credit-card debt.",
    appliesWhen: "Payments are due within the next two weeks.",
    source: "Consumer Financial Protection Bureau",
    reference: "cfpb.gov · managing your bills",
  },
  {
    id: "planning_annual_costs",
    category: "planning",
    title: "Plan for the bills that are not monthly",
    principle:
      "Break annual and irregular costs into monthly set-asides so they do not become debt when they arrive.",
    rationale:
      "Insurance premiums, registration, holidays and travel are predictable in aggregate even when the exact amount is not.",
    appliesWhen: "Irregular expenses appear in transaction history.",
    source: "Consumer Financial Protection Bureau",
    reference: "cfpb.gov · saving for irregular expenses",
  },
  {
    id: "planning_sustainable_split",
    category: "planning",
    title: "Balance saving and repayment",
    principle:
      "Split surplus between liquidity and debt reduction rather than choosing one extreme, unless the numbers clearly favour one.",
    rationale:
      "Paying debt earns a guaranteed return equal to the interest rate, but only savings provide liquidity when something breaks.",
    appliesWhen: "There is a monthly surplus and both savings and debt goals exist.",
    source: "FINRA Investor Education Foundation",
    reference: "finrafoundation.org · financial capability",
  },
  {
    id: "planning_forecast_disclaimer",
    category: "planning",
    title: "Treat projections as ranges, not promises",
    principle:
      "Forecasts describe what today's habits imply, not what will happen. Revisit them as new transactions arrive.",
    rationale:
      "Income changes, prices move and life intervenes. A forecast is a decision aid, not a guarantee.",
    appliesWhen: "Any projection or scenario comparison is shown.",
    source: "FINRA",
    reference: "finra.org · investor education",
  },
  {
    id: "planning_avoid_new_risk",
    category: "planning",
    title: "Do not take on new risk to fix a cash-flow gap",
    principle:
      "High-cost borrowing, early retirement withdrawals or speculative investments are not substitutes for a budget that balances.",
    rationale:
      "Using expensive or volatile money to cover routine expenses converts a short-term squeeze into a long-term problem.",
    appliesWhen: "Spending exceeds income or savings are falling.",
    source: "FINRA Investor Education Foundation",
    reference: "finrafoundation.org · borrowing",
  },
];

export const PRINCIPLE_MAP = new Map(PRINCIPLES.map((principle) => [principle.id, principle]));

export function getPrinciple(id: string) {
  return PRINCIPLE_MAP.get(id);
}

export function principlesFor(category?: PrincipleCategory) {
  if (!category) return PRINCIPLES;
  return PRINCIPLES.filter((principle) => principle.category === category);
}
