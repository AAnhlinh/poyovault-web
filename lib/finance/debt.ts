import type { ConnectedAccount, FinancialProfile } from "../types";
import { addMonths, formatCurrency, monthLabel } from "./format";
import { getDebtAccounts, getMonthlyDebtPayments } from "./aggregate";

export type PayoffStrategy = "avalanche" | "snowball" | "minimum";
export type DebtScope = "consumer" | "all";

export interface DebtInput {
  id: string;
  name: string;
  institution: string;
  balance: number;
  apr: number;
  minimumPayment: number;
  kind: "credit_card" | "loan" | "mortgage";
  dueDay?: number;
  originalBalance?: number;
}

export interface PayoffMonthPoint {
  monthKey: string;
  label: string;
  monthIndex: number;
  totalBalance: number;
  totalPaid: number;
  interestPaid: number;
  balances: Record<string, number>;
}

export interface PayoffPlan {
  strategy: PayoffStrategy;
  months: number;
  totalInterest: number;
  totalPaid: number;
  payoffDate: string;
  series: PayoffMonthPoint[];
  payoffOrder: { id: string; name: string; months: number }[];
  neverPaysOff: boolean;
  monthlyBudget: number;
  startingBalance: number;
}

export function toDebtInput(account: ConnectedAccount): DebtInput {
  return {
    id: account.id,
    name: account.name,
    institution: account.institution,
    balance: account.balance,
    apr: account.apr ?? 0,
    minimumPayment:
      account.minimumPayment ?? Math.max(25, Math.round(account.balance * 0.02)),
    kind:
      account.type === "credit_card"
        ? "credit_card"
        : account.loanKind === "mortgage"
          ? "mortgage"
          : "loan",
    dueDay: account.dueDay,
    originalBalance: account.originalBalance,
  };
}

export function getDebtInputs(profile: FinancialProfile, scope: DebtScope = "consumer") {
  return getDebtAccounts(profile)
    .filter((account) => (scope === "all" ? true : account.loanKind !== "mortgage"))
    .map(toDebtInput)
    .filter((debt) => debt.balance > 0.01);
}

function orderDebts(debts: DebtInput[], strategy: PayoffStrategy) {
  const active = debts.filter((debt) => debt.balance > 0.01);
  if (strategy === "snowball") {
    return [...active].sort((a, b) => a.balance - b.balance || b.apr - a.apr);
  }
  return [...active].sort((a, b) => b.apr - a.apr || a.balance - b.balance);
}

/**
 * Month-by-month payoff simulation. Every active debt receives its minimum;
 * surplus is concentrated on one target at a time (avalanche or snowball).
 * Payments freed by a cleared debt stay in the budget and roll to the next.
 */
export function simulatePayoff(
  debts: DebtInput[],
  extraMonthly: number,
  strategy: PayoffStrategy,
  from = new Date(),
): PayoffPlan {
  const working = debts
    .filter((debt) => debt.balance > 0.01)
    .map((debt) => ({ ...debt, balance: debt.balance }));
  const startingBalance = working.reduce((sum, debt) => sum + debt.balance, 0);
  const monthlyBudget =
    working.reduce((sum, debt) => sum + debt.minimumPayment, 0) + Math.max(0, extraMonthly);
  const series: PayoffMonthPoint[] = [];
  const payoffOrder: PayoffPlan["payoffOrder"] = [];
  let totalInterest = 0;
  let totalPaid = 0;
  let months = 0;
  let neverPaysOff = false;

  const date = new Date(from.getFullYear(), from.getMonth(), 1);

  series.push({
    monthKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
    label: monthLabel(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`),
    monthIndex: 0,
    totalBalance: startingBalance,
    totalPaid: 0,
    interestPaid: 0,
    balances: Object.fromEntries(working.map((d) => [d.id, d.balance])),
  });

  while (working.some((debt) => debt.balance > 0.01)) {
    if (months >= 720) {
      neverPaysOff = true;
      break;
    }
    months += 1;
    let interestThisMonth = 0;

    for (const debt of working) {
      if (debt.balance <= 0.01) continue;
      const interest = debt.balance * (debt.apr / 12);
      debt.balance += interest;
      interestThisMonth += interest;
    }

    let budget = monthlyBudget;
    // Required minimums first, always.
    for (const debt of working) {
      if (debt.balance <= 0.01) continue;
      const payment = Math.min(debt.minimumPayment, budget, debt.balance);
      debt.balance -= payment;
      budget -= payment;
    }

    // Surplus to the chosen target, then next target if it clears.
    if (budget > 0.01) {
      for (const target of orderDebts(working, strategy)) {
        if (budget <= 0.01) break;
        if (target.balance <= 0.01) continue;
        const payment = Math.min(target.balance, budget);
        target.balance -= payment;
        budget -= payment;
      }
    }

    const paidThisMonth = monthlyBudget - Math.max(0, budget);
    totalPaid += paidThisMonth;
    totalInterest += interestThisMonth;

    for (const debt of working) {
      if (debt.balance <= 0.01 && !payoffOrder.some((entry) => entry.id === debt.id)) {
        debt.balance = 0;
        payoffOrder.push({ id: debt.id, name: debt.name, months });
      }
    }

    const nextDate = addMonths(date, months);
    series.push({
      monthKey: `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`,
      label: monthLabel(
        `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`,
      ),
      monthIndex: months,
      totalBalance: working.reduce((sum, debt) => sum + Math.max(0, debt.balance), 0),
      totalPaid: paidThisMonth,
      interestPaid: interestThisMonth,
      balances: Object.fromEntries(working.map((debt) => [debt.id, Math.max(0, debt.balance)])),
    });
  }

  const payoffDate = addMonths(date, months).toISOString();

  return {
    strategy,
    months: neverPaysOff ? Number.POSITIVE_INFINITY : months,
    totalInterest,
    totalPaid,
    payoffDate,
    series,
    payoffOrder,
    neverPaysOff,
    monthlyBudget,
    startingBalance,
  };
}

export interface PayoffComparison {
  avalanche: PayoffPlan;
  snowball: PayoffPlan;
  baseline: PayoffPlan;
  interestSaved: number;
  baselineInterest: number;
  monthsSaved: number;
  extraPayment: number;
  scope: DebtScope;
  debts: DebtInput[];
  highestRateDebt?: DebtInput;
  smallestDebt?: DebtInput;
}

export function comparePayoffStrategies(
  profile: FinancialProfile,
  extraMonthly: number,
  scope: DebtScope = "consumer",
): PayoffComparison {
  const debts = getDebtInputs(profile, scope);
  const avalanche = simulatePayoff(debts, extraMonthly, "avalanche", new Date(profile.asOf));
  const snowball = simulatePayoff(debts, extraMonthly, "snowball", new Date(profile.asOf));
  const baseline = simulatePayoff(debts, 0, "minimum", new Date(profile.asOf));
  const highestRateDebt = [...debts].sort((a, b) => b.apr - a.apr)[0];
  const smallestDebt = [...debts].sort((a, b) => a.balance - b.balance)[0];

  return {
    avalanche,
    snowball,
    baseline,
    interestSaved: Math.max(0, baseline.totalInterest - avalanche.totalInterest),
    baselineInterest: baseline.totalInterest,
    monthsSaved: Math.max(
      0,
      (Number.isFinite(baseline.months) ? baseline.months : 720) -
        (Number.isFinite(avalanche.months) ? avalanche.months : 720),
    ),
    extraPayment: extraMonthly,
    scope,
    debts,
    highestRateDebt,
    smallestDebt,
  };
}

export interface DebtPortfolioItem extends DebtInput {
  shareOfDebt: number;
  interestPerMonth: number;
  utilization?: number;
  remainingMonths?: number;
  originalBalance?: number;
}

export function getDebtPortfolio(profile: FinancialProfile): DebtPortfolioItem[] {
  const accounts = getDebtAccounts(profile);
  const total = accounts.reduce((sum, account) => sum + account.balance, 0);
  return accounts
    .map((account) => {
      const debt = toDebtInput(account);
      return {
        ...debt,
        shareOfDebt: total > 0 ? account.balance / total : 0,
        interestPerMonth: account.balance * ((account.apr ?? 0) / 12),
        utilization:
          account.type === "credit_card" && account.creditLimit
            ? account.balance / account.creditLimit
            : undefined,
        remainingMonths: account.remainingMonths,
        originalBalance: account.originalBalance,
      };
    })
    .sort((a, b) => b.balance - a.balance);
}

export function getDebtSummary(profile: FinancialProfile) {
  const portfolio = getDebtPortfolio(profile);
  const consumer = portfolio.filter((debt) => debt.kind !== "mortgage");
  const total = portfolio.reduce((sum, debt) => sum + debt.balance, 0);
  const consumerTotal = consumer.reduce((sum, debt) => sum + debt.balance, 0);
  const monthlyInterest = portfolio.reduce((sum, debt) => sum + debt.interestPerMonth, 0);
  const consumerInterest = consumer.reduce((sum, debt) => sum + debt.interestPerMonth, 0);
  const monthlyPayments = getMonthlyDebtPayments(profile);
  const weightedApr =
    total > 0
      ? portfolio.reduce((sum, debt) => sum + debt.apr * debt.balance, 0) / total
      : 0;

  return {
    portfolio,
    total,
    consumerTotal,
    monthlyInterest,
    consumerInterest,
    monthlyPayments,
    weightedApr,
    mortgageTotal: total - consumerTotal,
    highestRate: [...portfolio].sort((a, b) => b.apr - a.apr)[0],
  };
}

export function payoffExplanation(
  comparison: PayoffComparison,
  highestRateDebt?: DebtInput,
  smallestDebt?: DebtInput,
) {
  const target = highestRateDebt ?? smallestDebt;
  if (!target) return "Add a debt to see a payoff plan.";
  return `Directing ${formatCurrency(comparison.extraPayment, { cents: false })} extra each month to ${
    target.name
  } first saves about ${formatCurrency(comparison.interestSaved)} in interest and clears your consumer debt ${comparison.monthsSaved} months sooner than minimum payments alone.`;
}
