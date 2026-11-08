import type { FinancialProfile } from "../types";
import { getDashboardMetrics, getEssentialExpenses } from "./aggregate";
import { formatCurrency } from "./format";

export interface WhatIfInput {
  name: string;
  /** Total cost of the trip, purchase or move. */
  cost: number;
  /** Money already set aside for it. */
  saved: number;
  /** How many months until you want it. */
  months: number;
  /** Optional salary-derived monthly income; falls back to the account estimate. */
  monthlyIncome?: number;
}

export type WhatIfVerdict = "clear" | "tight" | "wait";

export interface WhatIfMilestone {
  month: number;
  label: string;
  saved: number;
  pct: number;
}

export interface WhatIfPlan {
  name: string;
  cost: number;
  saved: number;
  months: number;
  remaining: number;
  requiredMonthly: number;
  income: number;
  essentials: number;
  afterEssentials: number;
  currentSpendingLeftover: number;
  leftover: number;
  cashLeftover: number;
  shortfall: number;
  cashGap: number;
  monthsAtCurrentPace: number | null;
  essentialsFit: boolean;
  cashFit: boolean;
  needsCuts: boolean;
  onTrack: boolean;
  tight: boolean;
  verdict: WhatIfVerdict;
  projectedIncome: number;
  incomeShare: number;
  headline: string;
  poyo: string;
  detail: string;
  targetDate: string;
  targetLabel: string;
  emergencyMonths: number;
  emergencyWarning: boolean;
  milestones: WhatIfMilestone[];
}

function isoMonth(base: Date, months: number) {
  const date = new Date(base.getFullYear(), base.getMonth() + months, 1);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}-01`;
}

function monthLabel(base: Date, months: number) {
  return new Date(base.getFullYear(), base.getMonth() + months, 1).toLocaleDateString(
    "en-US",
    { month: "short", year: "numeric" },
  );
}

/**
 * Explainable scenario math. The fit check first subtracts essentials
 * (housing, food, transport, insurance and required debt payments), then
 * checks what the customer's current spending leaves behind. A plan only
 * "fits" when both are covered.
 */
export function buildWhatIfPlan(
  profile: FinancialProfile,
  input: WhatIfInput,
  baseDate: Date = new Date(),
): WhatIfPlan {
  const cost = Math.max(0, Number(input.cost) || 0);
  const saved = Math.min(cost, Math.max(0, Number(input.saved) || 0));
  const months = Math.max(1, Math.round(Number(input.months) || 1));
  const metrics = getDashboardMetrics(profile);
  const essentials = getEssentialExpenses(profile);

  const income = Math.max(
    0,
    Number(
      input.monthlyIncome !== undefined ? input.monthlyIncome : metrics.monthlyIncome,
    ) || 0,
  );
  const afterEssentials = income - essentials.total;
  const currentSpendingLeftover = income - metrics.monthlyExpenses;

  const remaining = Math.max(0, cost - saved);
  const requiredMonthly = remaining / months;
  const leftover = afterEssentials - requiredMonthly;
  const cashLeftover = currentSpendingLeftover - requiredMonthly;
  const shortfall = Math.max(0, requiredMonthly - Math.max(0, afterEssentials));
  const cashGap = Math.max(0, requiredMonthly - Math.max(0, currentSpendingLeftover));

  const essentialsFit = requiredMonthly <= Math.max(0, afterEssentials) + 0.5;
  const cashFit = requiredMonthly <= currentSpendingLeftover + 0.5;
  const needsCuts = essentialsFit && !cashFit;
  const onTrack = essentialsFit && cashFit;

  const monthsAtCurrentPace =
    remaining === 0
      ? 0
      : currentSpendingLeftover > 0
        ? Math.ceil(remaining / currentSpendingLeftover)
        : null;

  const tight =
    onTrack &&
    (leftover < Math.max(150, Math.max(0, afterEssentials) * 0.15) || cashLeftover < 100);
  const verdict: WhatIfVerdict = !essentialsFit ? "wait" : !cashFit || tight ? "tight" : "clear";

  const name = input.name.trim() || "this plan";
  const targetLabel = monthLabel(baseDate, months);
  const projectedIncome = income * months;
  const incomeShare = projectedIncome > 0 ? cost / projectedIncome : 0;
  const incomePct = Math.round(incomeShare * 100);

  const headline =
    remaining === 0
      ? "Already covered."
      : verdict === "wait"
        ? "This needs more time."
        : needsCuts
          ? "Fits only with cutbacks."
          : verdict === "tight"
            ? "Doable, but tight."
            : "This fits.";

  const poyo =
    remaining === 0
      ? `You've already set aside ${formatCurrency(cost)} for ${name}. Nothing else to do — just don't spend it on something else.`
      : !essentialsFit
        ? afterEssentials <= 0
          ? `After essentials, there's nothing left from ${formatCurrency(income)} a month — essentials alone are ${formatCurrency(essentials.total)}. ${name} can't come out of this budget until income rises or costs fall.`
          : `${name} doesn't fit yet. After essentials you have ${formatCurrency(afterEssentials)} a month, but it needs ${formatCurrency(requiredMonthly)} — you're ${formatCurrency(shortfall)} short. ${
              monthsAtCurrentPace === null
                ? "Your current spending leaves no room to save."
                : `At your current spending pace it would take ${monthsAtCurrentPace} months.`
            } Over ${months} months you'd earn about ${formatCurrency(projectedIncome)}.`
        : needsCuts
          ? `After essentials you have ${formatCurrency(afterEssentials)}, so ${formatCurrency(requiredMonthly)} is affordable on paper. But your current spending leaves only ${formatCurrency(currentSpendingLeftover)} — you'd need to cut about ${formatCurrency(cashGap)} from dining, shopping or subscriptions to make it fit. Over ${months} months you'd earn about ${formatCurrency(projectedIncome)}; this is roughly ${incomePct}% of it.`
          : verdict === "tight"
            ? `${name} fits, but it's tight. After essentials and the ${formatCurrency(requiredMonthly)} set-aside, you'd have ${formatCurrency(Math.max(0, leftover))} left. Over ${months} months you'd earn about ${formatCurrency(projectedIncome)}, so this is roughly ${incomePct}% of your income. One surprise would hurt.`
            : `Yeah, ${name} fits. After essentials (${formatCurrency(essentials.total)}) you have ${formatCurrency(afterEssentials)} a month; putting ${formatCurrency(requiredMonthly)} aside leaves ${formatCurrency(leftover)}. Over ${months} months you'd earn about ${formatCurrency(projectedIncome)}, so this is roughly ${incomePct}% of your income.`;

  const detail =
    remaining === 0
      ? `The full ${formatCurrency(cost)} is already saved.`
      : !essentialsFit
        ? `${formatCurrency(requiredMonthly)} a month is ${formatCurrency(shortfall)} more than the ${formatCurrency(Math.max(0, afterEssentials))} left after essentials.`
        : needsCuts
          ? `${formatCurrency(requiredMonthly)} a month fits after essentials, but current spending leaves ${formatCurrency(currentSpendingLeftover)}. Trim about ${formatCurrency(cashGap)} to stay on this timeline.`
          : `${formatCurrency(requiredMonthly)} a month for ${months} months, after ${formatCurrency(essentials.total)} of essentials and current spending.`;

  const steps = Math.min(6, months);
  const milestones = Array.from({ length: steps }, (_, index) => {
    const month = Math.max(1, Math.round(((index + 1) / steps) * months));
    const amount = Math.min(cost, saved + requiredMonthly * month);
    return {
      month,
      label: monthLabel(baseDate, month),
      saved: amount,
      pct: cost > 0 ? (amount / cost) * 100 : 100,
    };
  }).filter(
    (milestone, index, all) =>
      all.findIndex((entry) => entry.month === milestone.month) === index,
  );

  return {
    name,
    cost,
    saved,
    months,
    remaining,
    requiredMonthly,
    income,
    essentials: essentials.total,
    afterEssentials,
    currentSpendingLeftover,
    leftover,
    cashLeftover,
    shortfall,
    cashGap,
    monthsAtCurrentPace,
    essentialsFit,
    cashFit,
    needsCuts,
    onTrack,
    tight,
    verdict,
    projectedIncome,
    incomeShare,
    headline,
    poyo,
    detail,
    targetDate: isoMonth(baseDate, months),
    targetLabel,
    emergencyMonths: metrics.emergencyMonths,
    emergencyWarning: metrics.emergencyMonths < 3,
    milestones,
  };
}
