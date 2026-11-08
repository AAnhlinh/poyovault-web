import type { FinancialProfile } from "../types";
import {
  CATEGORY_META,
  getCheckingBalance,
  getCompleteMonths,
  getDashboardMetrics,
  getEmergencyTarget,
  getEssentialExpenses,
  getMonthlyDebtPayments,
  getMonthlyHistory,
  getTotalSavings,
  getUpcomingPayments,
} from "./aggregate";
import { simulatePayoff, getDebtInputs } from "./debt";
import { addMonths, formatCurrency, formatPercent, monthKey, monthLabel } from "./format";

export type ForecastHorizon = 3 | 6 | 12;
export type ForecastConfidence = "high" | "medium" | "low";

export interface ForecastPoint {
  key: string;
  label: string;
  monthDate: string;
  income: number;
  expenses: number;
  debtPayments: number;
  savings: number;
  debtBalance: number;
  netCashFlow: number;
  byCategory: Record<string, number>;
  projected: true;
}

export interface ForecastWarning {
  id: string;
  title: string;
  detail: string;
  severity: "high" | "medium" | "low";
  principleId: string;
  actionHref: string;
  actionLabel: string;
}

export interface ScenarioInput {
  extraDebtPayment?: number;
  extraSavings?: number;
}

export interface ForecastResult {
  points: ForecastPoint[];
  horizon: ForecastHorizon;
  totalIncome: number;
  totalExpenses: number;
  totalDebtPayments: number;
  endingSavings: number;
  endingDebt: number;
  monthlySurplus: number;
  projectedExpenseChange: number;
  projectedSavingsChange: number;
  projectedDebtChange: number;
  warnings: ForecastWarning[];
  summary: string;
  confidence: ForecastConfidence;
  categoryTrends: { category: string; label: string; start: number; end: number; change: number }[];
  scenario: Required<ScenarioInput>;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function linearSlope(values: number[]) {
  if (values.length < 2) return 0;
  const n = values.length;
  const meanX = (n - 1) / 2;
  const meanY = average(values);
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i += 1) {
    numerator += (i - meanX) * (values[i] - meanY);
    denominator += (i - meanX) ** 2;
  }
  return denominator === 0 ? 0 : numerator / denominator;
}

export function buildForecast(
  profile: FinancialProfile,
  horizon: ForecastHorizon = 6,
  scenario: ScenarioInput = {},
): ForecastResult {
  const history = getMonthlyHistory(profile);
  const complete = getCompleteMonths(history);
  const metrics = getDashboardMetrics(profile);
  const extraDebtPayment = Math.max(0, scenario.extraDebtPayment ?? 0);
  const extraSavings = Math.max(0, scenario.extraSavings ?? 0);

  const categoryKeys = Object.keys(CATEGORY_META).filter((key) => key !== "income");
  const categoryForecasts = categoryKeys.map((category) => {
    const series = complete.map((month) => month.byCategory[category] ?? 0);
    const mean = average(series);
    const rawSlope = linearSlope(series);
    // Dampen extrapolation so a single unusual month cannot explode a forecast.
    const maxMonthlyChange = Math.max(4, mean * 0.06);
    const slope = Math.max(-maxMonthlyChange, Math.min(maxMonthlyChange, rawSlope));
    return { category, mean, slope };
  });

  const incomeMean = average(complete.map((month) => month.income));
  const debts = getDebtInputs(profile, "all");
  const payoff = simulatePayoff(debts, extraDebtPayment, "avalanche", new Date(profile.asOf));
  const totalSavings = getTotalSavings(profile);
  const essential = getEssentialExpenses(profile);
  const emergencyTarget = getEmergencyTarget(profile);
  const upcoming = getUpcomingPayments(profile);
  const checking = getCheckingBalance(profile);

  let savingsBalance = totalSavings;
  let cumulativeExpenseChange = 0;
  const points: ForecastPoint[] = [];

  const now = new Date(profile.asOf);
  for (let monthAhead = 1; monthAhead <= horizon; monthAhead += 1) {
    const date = addMonths(new Date(now.getFullYear(), now.getMonth(), 1), monthAhead);
    const key = monthKey(date);
    const income = incomeMean;

    const byCategory: Record<string, number> = {};
    let expenses = 0;
    for (const { category, mean, slope } of categoryForecasts) {
      const projected = Math.max(0, mean + slope * (monthAhead + 1));
      byCategory[category] = projected;
      expenses += projected;
    }

    const debtPoint = payoff.series[Math.min(monthAhead, payoff.series.length - 1)];
    const debtPayments = debtPoint?.totalPaid ?? getMonthlyDebtPayments(profile);
    const debtBalance = debtPoint?.totalBalance ?? metrics.totalDebt;
    const netCashFlow = income - expenses - debtPayments - extraSavings;
    savingsBalance += netCashFlow;

    if (monthAhead === horizon) {
      cumulativeExpenseChange = expenses - average(complete.map((month) => month.expenses));
    }

    points.push({
      key,
      label: monthLabel(key),
      monthDate: date.toISOString(),
      income,
      expenses,
      debtPayments,
      savings: savingsBalance,
      debtBalance,
      netCashFlow,
      byCategory,
      projected: true,
    });
  }

  const totalIncome = points.reduce((sum, point) => sum + point.income, 0);
  const totalExpenses = points.reduce((sum, point) => sum + point.expenses, 0);
  const totalDebtPayments = points.reduce((sum, point) => sum + point.debtPayments, 0);
  const endingSavings = points[points.length - 1]?.savings ?? totalSavings;
  const endingDebt = points[points.length - 1]?.debtBalance ?? metrics.totalDebt;
  const monthlySurplus = points[0]?.netCashFlow ?? 0;

  const warnings: ForecastWarning[] = [];
  const firstDeficit = points.find((point) => point.netCashFlow < 0);
  if (firstDeficit) {
    warnings.push({
      id: "deficit",
      title: "Spending is projected to exceed income",
      detail: `By ${monthLabel(firstDeficit.key, "long")} your projected outflow is ${formatCurrency(
        Math.abs(firstDeficit.netCashFlow),
      )} more than take-home pay. That gap would need to come from savings or new borrowing.`,
      severity: "high",
      principleId: "planning_upcoming_obligations",
      actionHref: "/spending",
      actionLabel: "Review flexible spending",
    });
  }

  if (endingSavings < totalSavings * 0.9) {
    warnings.push({
      id: "savings-decline",
      title: "Savings trend is heading down",
      detail: `On this path, savings fall from ${formatCurrency(totalSavings)} to ${formatCurrency(
        Math.max(0, endingSavings),
      )} over ${horizon} months. Keep liquid savings separate from money you plan to spend.`,
      severity: "high",
      principleId: "savings_keep_accessible",
      actionHref: "/savings",
      actionLabel: "Adjust savings plan",
    });
  }

  if (metrics.debtToIncome > 0.36) {
    warnings.push({
      id: "debt-burden",
      title: "Debt payments use a large share of income",
      detail: `${formatPercent(
        metrics.debtToIncome,
        0,
      )} of take-home pay is already committed to required debt payments. A rise in expenses has little room to be absorbed.`,
      severity: "medium",
      principleId: "debt_never_miss_minimum",
      actionHref: "/debt",
      actionLabel: "Compare payoff strategies",
    });
  }

  const risingCategory = points.length
    ? categoryForecasts
        .filter((entry) => entry.mean > 40)
        .map((entry) => ({
          category: entry.category,
          label: CATEGORY_META[entry.category].label,
          change:
            (points[points.length - 1].byCategory[entry.category] ?? 0) - entry.mean,
        }))
        .filter((entry) => entry.change > 35)
        .sort((a, b) => b.change - a.change)[0]
    : undefined;

  if (risingCategory) {
    warnings.push({
      id: "category-growth",
      title: `${risingCategory.label} is projected to climb`,
      detail: `Average ${risingCategory.label.toLowerCase()} spending of ${formatCurrency(
        average(complete.map((month) => month.byCategory[risingCategory.category] ?? 0)),
      )} per month trends toward ${formatCurrency(
        points[points.length - 1].byCategory[risingCategory.category] ?? 0,
      )} by ${monthLabel(points[points.length - 1].key, "long")} if the last six months repeat. A limit of ${formatCurrency(
        Math.round(average(complete.map((month) => month.byCategory[risingCategory.category] ?? 0))),
      )} would cap the drift.`,
      severity: "medium",
      principleId: "spending_limit_discretionary",
      actionHref: "/spending",
      actionLabel: "Set a category limit",
    });
  }

  const nextTwoWeeks = upcoming.filter((payment) => payment.daysAway <= 14);
  const dueSoon = nextTwoWeeks.reduce((sum, payment) => sum + payment.amount, 0);
  if (dueSoon > 0 && checking < dueSoon + 500) {
    warnings.push({
      id: "cash-buffer",
      title: "Tight cash buffer around upcoming payments",
      detail: `${formatCurrency(
        dueSoon,
      )} of required payments are due in the next 14 days, against a checking balance of ${formatCurrency(
        checking,
      )}. Moving money before the due date avoids overdraft or new card use.`,
      severity: "medium",
      principleId: "planning_upcoming_obligations",
      actionHref: "/accounts",
      actionLabel: "Check account balances",
    });
  }

  if (endingSavings < emergencyTarget) {
    warnings.push({
      id: "emergency-gap",
      title: "Emergency cushion stays below target",
      detail: `Even after ${horizon} months, projected savings of ${formatCurrency(
        Math.max(0, endingSavings),
      )} are below the ${formatCurrency(
        emergencyTarget,
      )} three-month target. Directing ${formatCurrency(
        Math.max(50, Math.round((emergencyTarget - Math.max(0, endingSavings)) / Math.max(1, horizon))),
      )} a month toward the cushion would close the gap.`,
      severity: "low",
      principleId: "savings_emergency_target",
      actionHref: "/savings",
      actionLabel: "Fund the emergency goal",
    });
  }

  if (metrics.utilization > 0.3 && endingDebt > metrics.creditCardBalance) {
    warnings.push({
      id: "card-growth",
      title: "Credit card balances could rise",
      detail:
        "Revolving balances above 30% of your limit are expensive and can weigh on your credit profile. Keep new charges below what you repay each month.",
      severity: "high",
      principleId: "debt_avoid_new_high_interest",
      actionHref: "/debt",
      actionLabel: "Plan the card payoff",
    });
  }

  const severityOrder = { high: 0, medium: 1, low: 2 };
  warnings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const projectedExpenseChange =
    points.length > 0
      ? points[points.length - 1].expenses - average(complete.slice(-3).map((m) => m.expenses))
      : 0;

  const confidence: ForecastConfidence =
    complete.length >= 6 ? "high" : complete.length >= 3 ? "medium" : "low";

  const topWarnings = warnings.slice(0, 1);
  const summary = points.length
    ? `If nothing changes, ${formatCurrency(
        monthlySurplus,
      )} per month would flow into savings, ending ${horizon} months with about ${formatCurrency(
        Math.max(0, endingSavings),
      )} in savings and ${formatCurrency(endingDebt)} of debt. Monthly expenses are projected to ${
        projectedExpenseChange >= 0 ? "rise" : "fall"
      } by ${formatCurrency(Math.abs(projectedExpenseChange))} against your recent three-month average.${
        topWarnings.length ? ` ${topWarnings[0].title}: ${topWarnings[0].detail}` : ""
      }`
    : "Add a few months of transaction history to generate a forecast.";

  const categoryTrends = categoryForecasts
    .filter((entry) => entry.mean > 0)
    .map((entry) => ({
      category: entry.category,
      label: CATEGORY_META[entry.category].label,
      start: entry.mean,
      end: Math.max(0, entry.mean + entry.slope * (horizon + 1)),
      change: entry.slope * (horizon + 1),
    }))
    .sort((a, b) => b.end - a.end);

  return {
    points,
    horizon,
    totalIncome,
    totalExpenses,
    totalDebtPayments,
    endingSavings,
    endingDebt,
    monthlySurplus,
    projectedExpenseChange,
    projectedSavingsChange: endingSavings - totalSavings,
    projectedDebtChange: endingDebt - metrics.totalDebt,
    warnings,
    summary,
    confidence,
    categoryTrends,
    scenario: { extraDebtPayment, extraSavings },
  };
}

export function describeConfidence(confidence: ForecastConfidence) {
  if (confidence === "high") return "Based on six full months of connected transaction data.";
  if (confidence === "medium") return "Based on three to five months of transactions. Treat the range as wider.";
  return "Based on limited transaction history. Forecast accuracy is low.";
}

export function buildForecastSummaryForAdvisor(profile: FinancialProfile) {
  const forecast = buildForecast(profile, 6);
  return {
    forecast,
    income: forecast.points[0]?.income ?? 0,
    expenseChange: forecast.projectedExpenseChange,
  };
}
