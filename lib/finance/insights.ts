import type { FinancialProfile } from "../types";
import {
  CATEGORY_META,
  average,
  getActiveSubscriptions,
  getCheckingBalance,
  getCompleteMonths,
  getDashboardMetrics,
  getEmergencyTarget,
  getMonthlyHistory,
  getSubscriptionMonthlyTotal,
  getUpcomingPayments,
} from "./aggregate";
import { comparePayoffStrategies } from "./debt";
import { formatCurrency, formatPercent, monthLabel } from "./format";

export type InsightCategory =
  | "debt"
  | "savings"
  | "spending"
  | "subscriptions"
  | "cashflow"
  | "income";

export type InsightSeverity = "warning" | "opportunity" | "positive" | "info";

export interface Insight {
  id: string;
  title: string;
  body: string;
  severity: InsightSeverity;
  category: InsightCategory;
  principleId: string;
  monthlyImpact?: number;
  annualImpact?: number;
  action: { label: string; href: string };
  metric?: { value: string; label: string };
}

const SEVERITY_WEIGHT: Record<InsightSeverity, number> = {
  warning: 0,
  opportunity: 1,
  positive: 2,
  info: 3,
};

export function generateInsights(profile: FinancialProfile): Insight[] {
  const metrics = getDashboardMetrics(profile);
  const history = getMonthlyHistory(profile);
  const complete = getCompleteMonths(history);
  const latest = complete[complete.length - 1];
  const previous = complete[complete.length - 2];
  const subscriptions = getActiveSubscriptions(profile);
  const subscriptionTotal = getSubscriptionMonthlyTotal(profile);
  const insights: Insight[] = [];

  // Emergency savings
  const emergencyGap = Math.max(0, metrics.emergencyTarget - metrics.emergencySavings);
  const monthsToCloseAt250 = Math.ceil(emergencyGap / 250);
  if (metrics.emergencyMonths < 3) {
    insights.push({
      id: "emergency-gap",
      title:
        metrics.emergencyMonths < 1
          ? "Your emergency fund is too thin"
          : `You're ${formatCurrency(emergencyGap)} short on your emergency fund`,
      body: `Essential costs run ${formatCurrency(
        metrics.essentialExpenses,
      )} a month. Three months of essentials is ${formatCurrency(
        metrics.emergencyTarget,
      )}; you hold ${formatCurrency(
        metrics.emergencySavings,
      )}. That's ${formatCurrency(emergencyGap)} short. Setting aside $250 a month closes the gap in about ${monthsToCloseAt250} months.`,
      severity: metrics.emergencyMonths < 1 ? "warning" : "opportunity",
      category: "savings",
      principleId: "savings_emergency_target",
      action: { label: "Build the cushion", href: "/savings" },
      metric: { value: `${metrics.emergencyMonths.toFixed(1)} mo`, label: "covered" },
    });
  } else {
    insights.push({
      id: "emergency-healthy",
      title: "Your emergency fund is in good shape",
      body: `You hold ${formatCurrency(
        metrics.emergencySavings,
      )}, or ${metrics.emergencyMonths.toFixed(1)} months of essentials. That's enough to cover a surprise without reaching for a card.`,
      severity: "positive",
      category: "savings",
      principleId: "savings_keep_accessible",
      action: { label: "Review goals", href: "/savings" },
    });
  }

  // Credit card interest
  const cards = profile.accounts.filter((a) => a.type === "credit_card");
  const cardInterest = cards.reduce(
    (sum, card) => sum + card.balance * ((card.apr ?? 0) / 12),
    0,
  );
  const weightedCardApr =
    metrics.creditCardBalance > 0
      ? cards.reduce((sum, card) => sum + (card.apr ?? 0) * card.balance, 0) /
        metrics.creditCardBalance
      : 0;
  const comparison = comparePayoffStrategies(profile, 150, "consumer");
  if (metrics.creditCardBalance > 0) {
    insights.push({
      id: "card-interest",
      title:
        metrics.utilization > 0.3
          ? `Your card use is high — ${formatPercent(metrics.utilization, 0)} of your limits`
          : `Your cards are charging you about ${formatCurrency(cardInterest)} a month`,
      body: `You owe ${formatCurrency(metrics.creditCardBalance)} across your cards at an average ${formatPercent(
        weightedCardApr,
        1,
      )} APR. ${comparison.highestRateDebt?.name ?? "Your highest-rate card"} is the most expensive at ${formatPercent(
        comparison.highestRateDebt?.apr ?? 0,
        2,
      )}. Paying $150 extra there saves about ${formatCurrency(
        comparison.interestSaved,
      )} in interest.`,
      severity: metrics.utilization > 0.3 ? "warning" : "opportunity",
      category: "debt",
      principleId: "debt_high_apr_first",
      monthlyImpact: Math.round(cardInterest),
      annualImpact: Math.round(cardInterest * 12),
      action: { label: "Compare payoff plans", href: "/debt" },
      metric: { value: formatPercent(metrics.utilization, 0), label: "utilization" },
    });
  }

  // Dining trend
  if (latest && previous) {
    const latestDining = latest.byCategory.dining ?? 0;
    const previousDining = previous.byCategory.dining ?? 0;
    const difference = latestDining - previousDining;
    if (difference > 15) {
      const suggestedCut = Math.min(60, Math.max(20, Math.round(difference / 10) * 10));
      insights.push({
        id: "dining-trend",
        title: `You spent ${formatCurrency(difference)} more on takeout last month`,
        body: `Restaurants came to ${formatCurrency(latestDining)} in ${monthLabel(
          latest.key,
          "long",
        )}, up from ${formatCurrency(previousDining)} the month before. Cutting ${formatCurrency(
          suggestedCut,
        )} a month keeps ${formatCurrency(suggestedCut * 12)} a year.`,
        severity: "opportunity",
        category: "spending",
        principleId: "spending_limit_discretionary",
        monthlyImpact: suggestedCut,
        annualImpact: suggestedCut * 12,
        action: { label: "Open dining breakdown", href: "/spending" },
        metric: { value: formatCurrency(latestDining), label: "last month" },
      });
    }
  }

  // Subscriptions
  const subscriptionCut = Math.max(5, Math.round((subscriptionTotal * 0.2) / 5) * 5);
  if (subscriptions.length >= 3) {
    insights.push({
      id: "subscription-review",
      title: `${subscriptions.length} subscriptions cost ${formatCurrency(subscriptionTotal)} a month`,
      body: `${subscriptions
        .slice(0, 3)
        .map((sub) => sub.merchant)
        .join(", ")} and ${Math.max(0, subscriptions.length - 3)} more renew automatically. That's ${formatCurrency(
        subscriptionTotal * 12,
      )} a year. Cancel the ones you barely use and keep about ${formatCurrency(
        subscriptionCut * 12,
      )}.`,
      severity: "opportunity",
      category: "subscriptions",
      principleId: "spending_review_subscriptions",
      monthlyImpact: subscriptionCut,
      annualImpact: subscriptionCut * 12,
      action: { label: "Review subscriptions", href: "/spending" },
      metric: { value: formatCurrency(subscriptionTotal), label: "per month" },
    });
  }

  // Discretionary trend
  if (latest) {
    const flexibleCategories = [
      "dining",
      "shopping",
      "entertainment",
      "travel",
      "other",
    ];
    const priorFlexible = average(
      complete.slice(0, -1).map((month) =>
        flexibleCategories.reduce((sum, cat) => sum + (month.byCategory[cat] ?? 0), 0),
      ),
    );
    const latestFlexible = flexibleCategories.reduce(
      (sum, cat) => sum + (latest.byCategory[cat] ?? 0),
      0,
    );
    const increase = latestFlexible - priorFlexible;
    if (increase > 75) {
      insights.push({
        id: "flexible-spending",
        title: "You're spending more on the fun stuff",
        body: `Restaurants, shopping, entertainment and travel reached ${formatCurrency(
          latestFlexible,
        )} in ${monthLabel(latest.key)}, ${formatCurrency(
          increase,
        )} above your usual. That's ${formatPercent(
          latestFlexible / Math.max(1, latest.income),
          0,
        )} of income — staying near 15–20% keeps your savings on track.`,
        severity: "warning",
        category: "spending",
        principleId: "spending_compare_to_income",
        monthlyImpact: Math.round(increase),
        annualImpact: Math.round(increase * 12),
        action: { label: "See spending trends", href: "/spending" },
      });
    }
  }

  // Debt-to-income
  if (metrics.debtToIncome > 0.36) {
    insights.push({
      id: "dti",
      title: `Debt payments take ${formatPercent(metrics.debtToIncome, 0)} of your income`,
      body: `${formatCurrency(metrics.monthlyDebtPayments)} of your ${formatCurrency(
        metrics.monthlyIncome,
      )} is committed before everyday spending. Lenders look for 36% or less. Paying down the highest-rate card lowers both the interest and the minimum.`,
      severity: "warning",
      category: "debt",
      principleId: "debt_never_miss_minimum",
      action: { label: "Open debt manager", href: "/debt" },
      metric: { value: formatPercent(metrics.debtToIncome, 0), label: "of income" },
    });
  } else {
    insights.push({
      id: "dti-healthy",
      title: "Required debt payments are manageable",
      body: `Your ${formatCurrency(metrics.monthlyDebtPayments)} of required payments is ${formatPercent(
        metrics.debtToIncome,
        0,
      )} of monthly income. Keep all minimums covered automatically so a busy month cannot become a late payment.`,
      severity: "positive",
      category: "debt",
      principleId: "debt_never_miss_minimum",
      action: { label: "Review payments", href: "/debt" },
    });
  }

  // Cash flow
  if (metrics.disposableIncome > 0) {
    insights.push({
      id: "cashflow-positive",
      title: `You have ${formatCurrency(metrics.disposableIncome)} left after everything`,
      body: `That's a ${formatPercent(
        metrics.savingsRate,
        0,
      )} savings rate. Move it the day you get paid — money left sitting in checking tends to disappear.`,
      severity: "positive",
      category: "cashflow",
      principleId: "planning_sustainable_split",
      monthlyImpact: Math.round(metrics.disposableIncome),
      annualImpact: Math.round(metrics.disposableIncome * 12),
      action: { label: "Plan the surplus", href: "/advisor" },
      metric: { value: formatPercent(metrics.savingsRate, 0), label: "savings rate" },
    });
  } else {
    insights.push({
      id: "cashflow-negative",
      title: "Expenses are outpacing income",
      body: `Your monthly outflow exceeds take-home pay by ${formatCurrency(
        Math.abs(metrics.disposableIncome),
      )}. This is the most urgent lever: pause discretionary spending and protect minimum payments before anything else.`,
      severity: "warning",
      category: "cashflow",
      principleId: "planning_avoid_new_risk",
      action: { label: "Find cuts", href: "/spending" },
    });
  }

  // Upcoming obligations vs buffer
  const upcoming = getUpcomingPayments(profile);
  const dueSoon = upcoming.filter((payment) => payment.daysAway <= 14);
  const dueTotal = dueSoon.reduce((sum, payment) => sum + payment.amount, 0);
  const checking = getCheckingBalance(profile);
  if (dueTotal > 0 && checking < dueTotal + 500) {
    insights.push({
      id: "cash-buffer",
      title: "Checking is tight before your next bills",
      body: `${formatCurrency(dueTotal)} is due in the next 14 days and checking holds ${formatCurrency(
        checking,
      )}. Set that money aside now rather than spending it.`,
      severity: "warning",
      category: "cashflow",
      principleId: "planning_upcoming_obligations",
      action: { label: "View due dates", href: "/accounts" },
    });
  }

  // Month-over-month spending
  if (latest && previous) {
    const spendingChange = latest.expenses - previous.expenses;
    if (spendingChange > 100) {
      insights.push({
        id: "expense-growth",
        title: `Total spending rose ${formatCurrency(spendingChange)} last month`,
        body: `Outflow reached ${formatCurrency(latest.expenses)} in ${monthLabel(
          latest.key,
          "long",
        )}, up from ${formatCurrency(previous.expenses)}. Before adding new commitments, check which categories drove the increase.`,
        severity: "info",
        category: "spending",
        principleId: "spending_compare_to_income",
        monthlyImpact: Math.round(spendingChange),
        annualImpact: Math.round(spendingChange * 12),
        action: { label: "Compare months", href: "/spending" },
      });
    }
  }

  // Income consistency
  const payroll = profile.transactions.filter((tx) => tx.type === "income");
  if (payroll.length >= 3) {
    insights.push({
      id: "income-stable",
      title: "Your income arrives predictably",
      body: `${payroll[0].merchant} has deposited consistently into checking. Automate a transfer for the day after each payday — you cannot spend what never lands in checking.`,
      severity: "positive",
      category: "income",
      principleId: "savings_automatic",
      action: { label: "Automate savings", href: "/savings" },
    });
  }

  return insights.sort((a, b) => {
    const severity = SEVERITY_WEIGHT[a.severity] - SEVERITY_WEIGHT[b.severity];
    if (severity !== 0) return severity;
    return (b.annualImpact ?? 0) - (a.annualImpact ?? 0);
  });
}

export function getTopInsights(profile: FinancialProfile, count = 4) {
  return generateInsights(profile).slice(0, count);
}

export interface SurplusPlan {
  surplus: number;
  deployable: number;
  savingsAmount: number;
  debtAmount: number;
  savingsShare: number;
  emergencyMonths: number;
  highestApr?: { name: string; apr: number };
  headline: string;
  reasoning: string;
  principleId: string;
}

export function getSurplusPlan(profile: FinancialProfile): SurplusPlan {
  const metrics = getDashboardMetrics(profile);
  const comparison = comparePayoffStrategies(profile, 0, "consumer");
  const highest = comparison.highestRateDebt;
  const deployable = Math.max(0, Math.round(metrics.disposableIncome * 0.8));
  const needsCushion = metrics.emergencyMonths < 3;
  const savingsShare = needsCushion ? 0.6 : metrics.utilization > 0.3 ? 0.3 : 0.2;
  const savingsAmount = Math.round(deployable * savingsShare);
  const debtAmount = deployable - savingsAmount;
  const headline = needsCushion
    ? `Save ${formatCurrency(savingsAmount)} and put ${formatCurrency(debtAmount)} on the ${
        highest?.name ?? "highest-rate card"
      }`
    : `Put ${formatCurrency(debtAmount)} on the ${
        highest?.name ?? "highest-rate card"
      } and keep ${formatCurrency(savingsAmount)} for goals`;

  const reasoning = needsCushion
    ? `You have ${formatCurrency(
        deployable,
      )} a month to work with after bills. Your emergency fund covers ${metrics.emergencyMonths.toFixed(
        1,
      )} months, so ${formatCurrency(
        savingsAmount,
      )} goes there first and ${formatCurrency(debtAmount)} goes to the ${
        highest?.name ?? "highest-rate card"
      }${highest ? ` at ${formatPercent(highest.apr, 2)}` : ""}. Once the fund reaches three months, send that savings share to the card too.`
    : `You have ${formatCurrency(
        deployable,
      )} a month to work with. Your cushion covers ${metrics.emergencyMonths.toFixed(
        1,
      )} months, so it's in good shape: ${formatCurrency(debtAmount)} goes to the ${
        highest?.name ?? "highest-rate card"
      }${
        highest ? ` (${formatPercent(highest.apr, 2)})` : ""
      } and ${formatCurrency(savingsAmount)} stays with your goals.`;

  return {
    surplus: metrics.disposableIncome,
    deployable,
    savingsAmount,
    debtAmount,
    savingsShare,
    emergencyMonths: metrics.emergencyMonths,
    highestApr: highest ? { name: highest.name, apr: highest.apr } : undefined,
    headline,
    reasoning,
    principleId: "planning_sustainable_split",
  };
}

export function getSpendingHighlights(profile: FinancialProfile) {
  const history = getMonthlyHistory(profile);
  const complete = getCompleteMonths(history);
  const latest = complete[complete.length - 1];
  const previous = complete[complete.length - 2];
  const subscriptionTotal = getSubscriptionMonthlyTotal(profile);
  const categories = Object.entries(latest?.byCategory ?? {})
    .map(([category, amount]) => ({
      category,
      label: CATEGORY_META[category]?.label ?? category,
      color: CATEGORY_META[category]?.color ?? "#818CF8",
      amount,
      previous: previous?.byCategory[category] ?? 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    latest,
    previous,
    categories,
    topCategory: categories[0],
    subscriptionTotal,
    diningChange: (latest?.byCategory.dining ?? 0) - (previous?.byCategory.dining ?? 0),
  };
}
