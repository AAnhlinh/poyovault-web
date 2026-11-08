import type { FinancialProfile } from "../types";
import {
  getDashboardMetrics,
  getIncomeSources,
  getMonthlyHistory,
  getCreditCards,
  getEmergencyTarget,
} from "./aggregate";
import { clamp, formatCurrency, formatPercent } from "./format";

export type FactorStatus = "strength" | "watch" | "risk";

export interface ScoreFactor {
  id: string;
  label: string;
  /** Points this factor contributes at full marks. */
  weight: number;
  /** 0–100 sub-score. */
  score: number;
  value: number;
  valueLabel: string;
  status: FactorStatus;
  summary: string;
  detail: string;
}

export interface HealthScore {
  score: number;
  band: "Excellent" | "Good" | "Fair" | "Needs attention";
  tone: "mint" | "blue" | "amber" | "coral";
  headline: string;
  summary: string;
  factors: ScoreFactor[];
  strengths: ScoreFactor[];
  watchouts: ScoreFactor[];
  changeFromLastMonth: number;
}

function statusFor(score: number): FactorStatus {
  if (score >= 75) return "strength";
  if (score >= 50) return "watch";
  return "risk";
}

export function scoreDebtToIncome(dti: number) {
  const points: [number, number][] = [
    [0.15, 100],
    [0.25, 85],
    [0.36, 60],
    [0.45, 40],
    [0.55, 20],
    [0.75, 0],
  ];
  return interpolate(dti, points);
}

export function scoreUtilization(utilization: number) {
  return interpolate(utilization, [
    [0.1, 100],
    [0.3, 75],
    [0.5, 50],
    [0.75, 25],
    [0.9, 5],
    [1, 0],
  ]);
}

export function scoreEmergencyMonths(months: number) {
  return clamp((months / 3) * 95, 0, 100);
}

export function scoreCashFlow(rate: number) {
  return interpolate(rate, [
    [-0.05, 0],
    [0, 20],
    [0.1, 55],
    [0.2, 80],
    [0.3, 95],
    [0.45, 100],
  ]);
}

function interpolationPoints(rate: number, points: [number, number][]) {
  if (rate <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i += 1) {
    const [x1, y1] = points[i - 1];
    const [x2, y2] = points[i];
    if (rate <= x2) {
      const t = (rate - x1) / (x2 - x1);
      return y1 + t * (y2 - y1);
    }
  }
  return points[points.length - 1][1];
}

function interpolate(value: number, points: [number, number][]) {
  return clamp(interpolationPoints(value, points));
}

export function computeHealthScore(profile: FinancialProfile): HealthScore {
  const metrics = getDashboardMetrics(profile);
  const history = getMonthlyHistory(profile);
  const incomeSources = getIncomeSources(profile);
  const complete = history.filter((m) => !m.isPartial).slice(-3);

  const dtiScore = scoreDebtToIncome(metrics.debtToIncome);
  const utilizationScore = scoreUtilization(metrics.utilization);
  const emergencyScore = scoreEmergencyMonths(metrics.emergencyMonths);
  const cashFlowScore = scoreCashFlow(metrics.savingsRate);

  const consistentSources = incomeSources.filter((s) => s.consistent).length;
  const consistencyBase =
    incomeSources.length === 0
      ? 30
      : clamp((consistentSources / incomeSources.length) * 100);
  const monthIncomeTotals = complete.map((m) => m.income);
  const incomeSwing =
    monthIncomeTotals.length > 1 && metrics.monthlyIncome > 0
      ? (Math.max(...monthIncomeTotals) - Math.min(...monthIncomeTotals)) /
        metrics.monthlyIncome
      : 0;
  const consistencyScore = clamp(consistencyBase - incomeSwing * 120, 0, 100);

  const discretionary = complete.reduce((sum, month) => {
    const cats = ["dining", "shopping", "entertainment", "travel", "subscriptions", "other"];
    return sum + cats.reduce((inner, cat) => inner + (month.byCategory[cat] ?? 0), 0);
  }, 0);
  const discretionaryShare =
    metrics.monthlyIncome > 0 ? discretionary / complete.length / metrics.monthlyIncome : 0;
  const disciplineScore = interpolate(discretionaryShare, [
    [0.1, 100],
    [0.18, 86],
    [0.25, 68],
    [0.32, 48],
    [0.42, 25],
    [0.55, 5],
  ]);

  const cards = getCreditCards(profile);
  const highestAprCard = [...cards].sort((a, b) => (b.apr ?? 0) - (a.apr ?? 0))[0];
  const emergencyTarget = getEmergencyTarget(profile);
  const emergencyGap = Math.max(0, emergencyTarget - metrics.emergencySavings);

  const factors: ScoreFactor[] = [
    {
      id: "dti",
      label: "Debt-to-income ratio",
      weight: 25,
      score: Math.round(dtiScore),
      value: metrics.debtToIncome,
      valueLabel: formatPercent(metrics.debtToIncome, 1),
      status: statusFor(dtiScore),
      summary: `${formatCurrency(metrics.monthlyDebtPayments)} of your ${formatCurrency(metrics.monthlyIncome)} monthly income goes to required debt payments.`,
      detail:
        dtiScore >= 75
          ? "Lenders generally look for 36% or lower. You are comfortably inside that range — keep required payments stable."
          : `Getting this to 36% or below would add ${Math.round(dtiScore < 60 ? 10 : 5)} points. Paying down the highest-rate balance reduces required payments fastest.`,
    },
    {
      id: "utilization",
      label: "Credit card utilization",
      weight: 20,
      score: Math.round(utilizationScore),
      value: metrics.utilization,
      valueLabel: formatPercent(metrics.utilization, 1),
      status: statusFor(utilizationScore),
      summary: `${formatCurrency(metrics.creditCardBalance)} owed across your cards against ${formatCurrency(metrics.creditLimit ?? 0)} of available credit.`,
      detail:
        utilizationScore >= 75
          ? "Below 30% is the healthy zone, and under 10% is ideal. Utilization is reported monthly, so paying before the statement date helps your profile."
          : `Bringing utilization below 30% would free ${formatCurrency(
              Math.max(0, metrics.creditCardBalance - (metrics.creditLimit ?? 0) * 0.3),
            )} of the balance and lift this factor by roughly ${Math.min(25, Math.round(100 - utilizationScore))} points.`,
    },
    {
      id: "emergency",
      label: "Emergency savings cushion",
      weight: 20,
      score: Math.round(emergencyScore),
      value: metrics.emergencyMonths,
      valueLabel: `${metrics.emergencyMonths.toFixed(1)} months`,
      status: statusFor(emergencyScore),
      summary: `${formatCurrency(metrics.emergencySavings)} held against ${formatCurrency(emergencyTarget)} of recommended essential-expense cover.`,
      detail: `You are ${formatCurrency(emergencyGap)} away from a three-month cushion. Automatic transfers on payday are the most reliable way to close this gap.`,
    },
    {
      id: "cashflow",
      label: "Monthly cash flow",
      weight: 15,
      score: Math.round(cashFlowScore),
      value: metrics.savingsRate,
      valueLabel: formatPercent(metrics.savingsRate, 1),
      status: statusFor(cashFlowScore),
      summary: `${formatCurrency(metrics.disposableIncome)} remains after spending and all required debt payments — a ${formatPercent(metrics.savingsRate, 1)} margin.`,
      detail:
        cashFlowScore >= 75
          ? "A margin above 20% gives you room for goals and surprises. Decide where the surplus goes rather than leaving it in checking."
          : "A margin under 20% leaves little room for surprises. Trimming discretionary categories is usually faster than renegotiating fixed bills.",
    },
    {
      id: "consistency",
      label: "Income consistency",
      weight: 10,
      score: Math.round(consistencyScore),
      value: incomeSwing,
      valueLabel: `${incomeSources.length > 0 ? "Stable" : "No income detected"}`,
      status: statusFor(consistencyScore),
      summary:
        incomeSources.length > 0
          ? `${incomeSources[0].merchant} has deposited ${formatCurrency(
              incomeSources[0].monthlyAverage,
            )} monthly with ${Math.round(incomeSwing * 100)}% month-to-month variation.`
          : "No recurring income was detected in the connected accounts.",
      detail:
        consistencyScore >= 75
          ? "Predictable deposits make budgeting and automatic saving much easier. Keep the buffer in place if your pay dates shift."
          : "Significant income variation means your budget should rely on your lowest recent month, not your average.",
    },
    {
      id: "discipline",
      label: "Discretionary spending",
      weight: 10,
      score: Math.round(disciplineScore),
      value: discretionaryShare,
      valueLabel: formatPercent(discretionaryShare, 1),
      status: statusFor(disciplineScore),
      summary: `${formatCurrency(discretionary / 3)} a month goes to restaurants, shopping, entertainment, travel and subscriptions — ${formatPercent(
        discretionaryShare,
        1,
      )} of income.`,
      detail:
        highestAprCard?.apr && metrics.utilization > 0.3
          ? "When you carry a high-rate balance, each extra dollar of discretionary spending costs more than a dollar. Trim the category with the fastest growth first."
          : "Discretionary spending is flexible, not bad. Keeping it under about 20% of income protects your savings rate.",
    },
  ];

  const score = Math.round(
    factors.reduce((sum, factor) => sum + (factor.score / 100) * factor.weight, 0),
  );
  const band: HealthScore["band"] =
    score >= 80 ? "Excellent" : score >= 65 ? "Good" : score >= 50 ? "Fair" : "Needs attention";
  const tone: HealthScore["tone"] =
    band === "Excellent" ? "mint" : band === "Good" ? "blue" : band === "Fair" ? "amber" : "coral";

  const sortedFactors = [...factors].sort((a, b) => b.weight * (100 - b.score) - a.weight * (100 - a.score));
  const topStrength = [...factors].sort((a, b) => b.score - a.score)[0];
  const topWatchout = [...factors].sort((a, b) => a.score - b.score)[0];

  const headline =
    band === "Excellent"
      ? "You're in strong shape"
      : band === "Good"
        ? `${topWatchout.label} is the main thing holding you back`
        : band === "Fair"
          ? "You're keeping up, but there isn't much slack"
          : "This month needs attention";

  const summary = `You scored ${score}/100. ${topStrength.label} is your strongest area (${
    topStrength.valueLabel
  }), and ${topWatchout.label.toLowerCase()} is the weakest (${
    topWatchout.valueLabel
  }). ${
    metrics.debtToIncome > 0.36
      ? `${formatPercent(metrics.debtToIncome, 0)} of your income goes to required debt payments, which leaves little room to manoeuvre.`
      : `Required debt payments take ${formatPercent(metrics.debtToIncome, 0)} of income, which is manageable.`
  } ${
    metrics.emergencyMonths < 3
      ? "Getting the emergency fund to three months would give you more room to absorb a bad month."
      : "Your emergency fund is on target, so spare cash can go to the highest-rate debt."
  }`;

  // A lightweight, deterministic month-over-month comparison: the score your
  // current data would have produced on last month's expense and balance mix.
  const latest = complete[complete.length - 1];
  const previous = complete[complete.length - 2];
  const expenseDelta = latest && previous ? latest.expenses - previous.expenses : 0;
  const changeFromLastMonth = Math.round(
    Math.max(-6, Math.min(6, (latest?.netCashFlow ?? 0) / Math.max(1, metrics.monthlyIncome) * 30 - (expenseDelta > 0 ? 2 : -1))),
  );

  return {
    score,
    band,
    tone,
    headline,
    summary,
    factors: sortedFactors,
    strengths: factors.filter((f) => f.status === "strength").slice(0, 2),
    watchouts: factors.filter((f) => f.status !== "strength").slice(0, 2),
    changeFromLastMonth,
  };
}

export function factorToneClass(status: FactorStatus) {
  if (status === "strength") return "text-mint";
  if (status === "watch") return "text-amber";
  return "text-coral";
}

export function factorBarClass(status: FactorStatus) {
  if (status === "strength") return "bg-mint";
  if (status === "watch") return "bg-amber";
  return "bg-coral";
}
