"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarClock,
  CreditCard,
  Flame,
  Landmark,
  Percent,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import { useFinance } from "@/components/providers/finance-provider";
import {
  getDashboardMetrics,
  getUpcomingPayments,
} from "@/lib/finance/aggregate";
import {
  comparePayoffStrategies,
  getDebtSummary,
  type DebtScope,
  type PayoffStrategy,
} from "@/lib/finance/debt";
import { generateInsights } from "@/lib/finance/insights";
import { getPrinciple } from "@/lib/finance/principles";
import {
  formatCurrency,
  formatDate,
  formatMonths,
  formatPercent,
} from "@/lib/finance/format";
import { Badge, Button, Card, CardHeader, InfoNote, Progress, Segmented } from "@/components/ui/primitives";
import { DebtPayoffChart } from "@/components/charts/debt-payoff-chart";
import { SpendingDonut } from "@/components/charts/spending-donut";
import { InsightCard } from "@/components/shared/insight-card";
import { cn } from "@/lib/utils";

const KIND_META: Record<string, { label: string; color: string }> = {
  credit_card: { label: "Credit cards", color: "#FB7185" },
  mortgage: { label: "Mortgage", color: "#F472B6" },
  auto: { label: "Auto loans", color: "#34D399" },
  student: { label: "Student loans", color: "#60A5FA" },
  loan: { label: "Other loans", color: "#A78BFA" },
};

export function DebtView() {
  const { profile } = useFinance();
  const metrics = getDashboardMetrics(profile);
  const summary = getDebtSummary(profile);
  const [extra, setExtra] = useState(150);
  const [strategy, setStrategy] = useState<PayoffStrategy>("avalanche");
  const [scope, setScope] = useState<DebtScope>("consumer");
  const upcoming = getUpcomingPayments(profile);
  const [showAllDebts, setShowAllDebts] = useState(false);

  const comparison = useMemo(
    () => comparePayoffStrategies(profile, extra, scope),
    [profile, extra, scope],
  );
  const activePlan = strategy === "avalanche" ? comparison.avalanche : comparison.snowball;
  const interestSaved = Math.max(0, comparison.baseline.totalInterest - activePlan.totalInterest);
  const monthsSaved = Math.max(
    0,
    (Number.isFinite(comparison.baseline.months) ? comparison.baseline.months : 720) -
      (Number.isFinite(activePlan.months) ? activePlan.months : 720),
  );

  const breakdown = useMemo(() => {
    const groups = new Map<string, { category: string; label: string; amount: number; color: string }>();
    for (const debt of summary.portfolio) {
      const key = debt.kind === "loan" ? "loan" : debt.kind;
      const meta = KIND_META[key] ?? KIND_META.loan;
      const current = groups.get(key) ?? { category: key, label: meta.label, amount: 0, color: meta.color };
      current.amount += debt.balance;
      groups.set(key, current);
    }
    return Array.from(groups.values()).sort((a, b) => b.amount - a.amount);
  }, [summary.portfolio]);

  const chartData = useMemo(() => {
    const longest = Math.max(
      Number.isFinite(comparison.baseline.months) ? comparison.baseline.months : 60,
      Number.isFinite(comparison.avalanche.months) ? comparison.avalanche.months : 60,
      Number.isFinite(comparison.snowball.months) ? comparison.snowball.months : 60,
    );
    const capped = Math.min(360, Math.max(1, longest));
    const step = Math.max(1, Math.ceil(capped / 28));
    const points = [];
    for (let month = 0; month <= capped; month += step) {
      const baselinePoint = comparison.baseline.series[Math.min(month, comparison.baseline.series.length - 1)];
      const avalanchePoint = comparison.avalanche.series[Math.min(month, comparison.avalanche.series.length - 1)];
      const snowballPoint = comparison.snowball.series[Math.min(month, comparison.snowball.series.length - 1)];
      points.push({
        label: baselinePoint?.label ?? `${month}m`,
        minimum: baselinePoint?.totalBalance ?? 0,
        avalanche: avalanchePoint?.totalBalance ?? 0,
        snowball: snowballPoint?.totalBalance ?? 0,
      });
    }
    return points;
  }, [comparison]);

  const lowestRateDebt = [...summary.portfolio].sort((a, b) => a.apr - b.apr)[0];
  const highest = summary.highestRate;
  const debtInsights = generateInsights(profile).filter((insight) => insight.category === "debt");
  const principle = getPrinciple("debt_high_apr_first");
  const visibleDebts = showAllDebts ? summary.portfolio : summary.portfolio.slice(0, 6);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-coral/10 text-coral">
            <Landmark className="h-4 w-4" />
          </div>
          <p className="label mt-3">Total outstanding</p>
          <p className="num mt-1 font-display text-[22px] font-semibold tracking-tight text-white">
            {formatCurrency(summary.total)}
          </p>
          <p className="mt-1 text-[10.5px] text-white/35">
            {summary.portfolio.length} debts · {formatPercent(summary.weightedApr, 2)} weighted APR
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber/10 text-amber">
            <CalendarClock className="h-4 w-4" />
          </div>
          <p className="label mt-3">Required monthly</p>
          <p className="num mt-1 font-display text-[22px] font-semibold tracking-tight text-white">
            {formatCurrency(metrics.monthlyDebtPayments)}
          </p>
          <p className="mt-1 text-[10.5px] text-white/35">
            {formatPercent(metrics.debtToIncome, 1)} of take-home income
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/12 text-violet-300">
            <Percent className="h-4 w-4" />
          </div>
          <p className="label mt-3">Interest this month</p>
          <p className="num mt-1 font-display text-[22px] font-semibold tracking-tight text-white">
            {formatCurrency(summary.monthlyInterest)}
          </p>
          <p className="mt-1 text-[10.5px] text-white/35">
            {formatCurrency(summary.consumerInterest)} on consumer debt
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-300">
            <CreditCard className="h-4 w-4" />
          </div>
          <p className="label mt-3">Credit utilization</p>
          <p className="num mt-1 font-display text-[22px] font-semibold tracking-tight text-white">
            {formatPercent(metrics.utilization, 1)}
          </p>
          <Progress value={metrics.utilization * 100} tone={metrics.utilization > 0.3 ? "amber" : "mint"} size="sm" className="mt-2" />
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="p-5 sm:p-6 xl:col-span-5">
          <CardHeader
            title="Debt breakdown"
            description="How the outstanding balance is distributed."
            action={<Badge tone="coral">{summary.portfolio.length} accounts</Badge>}
          />
          <div className="mt-2">
            <SpendingDonut
              data={breakdown}
              total={summary.total}
              height={232}
              totalLabel="Total debt"
              totalCaption="current outstanding"
              amountNoun="debt"
            />
          </div>
          <div className="mt-4 space-y-2.5">
            <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5">
              <span className="text-[11px] text-white/45">Consumer debt (cards & loans)</span>
              <span className="num text-[12px] font-semibold text-white">{formatCurrency(summary.consumerTotal)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5">
              <span className="text-[11px] text-white/45">Mortgage</span>
              <span className="num text-[12px] font-semibold text-white">{formatCurrency(summary.mortgageTotal)}</span>
            </div>
          </div>
          <InfoNote className="mt-3">
            Mortgage debt is secured against your home and excluded from the consumer payoff comparison by default. Use the scope switch to include it.
          </InfoNote>
        </Card>

        <Card className="p-5 sm:p-6 xl:col-span-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <CardHeader
              title="Repayment strategy"
              description="Compare minimums, avalanche and snowball with an extra payment you choose."
            />
            <Segmented
              size="sm"
              value={scope}
              onChange={(value) => setScope(value)}
              options={[
                { value: "consumer", label: "Cards & loans" },
                { value: "all", label: "Include mortgage" },
              ]}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {(["avalanche", "snowball"] as PayoffStrategy[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setStrategy(option)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-left transition",
                  strategy === option
                    ? "border-violet-400/35 bg-violet-500/[0.1]"
                    : "border-white/[0.07] hover:border-white/15",
                )}
              >
                <span className="flex items-center gap-1.5 text-[11.5px] font-medium capitalize text-white/85">
                  {option === "avalanche" ? <Flame className="h-3.5 w-3.5 text-amber" /> : <TrendingDown className="h-3.5 w-3.5 text-brand-300" />}
                  {option}
                </span>
                <span className="mt-0.5 block text-[9.5px] text-white/35">
                  {option === "avalanche" ? "Highest rate first" : "Smallest balance first"}
                </span>
              </button>
            ))}
            <div className="ml-auto text-right">
              <p className="label">Extra payment</p>
              <p className="num text-sm font-semibold text-white">{formatCurrency(extra)}/mo</p>
            </div>
          </div>

          <div className="mt-4">
            <input
              type="range"
              min={0}
              max={1000}
              step={25}
              value={extra}
              onChange={(event) => setExtra(Number(event.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-violet-500"
              aria-label="Extra monthly debt payment"
            />
            <div className="mt-1.5 flex justify-between text-[9px] text-white/25">
              <span>$0</span>
              <span>$250</span>
              <span>$500</span>
              <span>$750</span>
              <span>$1,000</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="label">Debt-free in</p>
              <p className="num mt-1 text-[15px] font-semibold text-white">{formatMonths(activePlan.months)}</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="label">Payoff date</p>
              <p className="mt-1 text-[13px] font-semibold text-white">
                {activePlan.neverPaysOff ? "Not amortising" : formatDate(activePlan.payoffDate)}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="label">Interest saved</p>
              <p className="num mt-1 text-[15px] font-semibold text-mint">{formatCurrency(interestSaved)}</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="label">Months saved</p>
              <p className="num mt-1 text-[15px] font-semibold text-white">{monthsSaved}</p>
            </div>
          </div>

          <div className="mt-4">
            <DebtPayoffChart data={chartData} height={220} />
          </div>

          <div className="mt-2 flex items-start gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 text-[10.5px] leading-relaxed text-white/40">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-300" />
            <p>
              {strategy === "avalanche"
                ? `Avalanche targets ${highest?.name ?? "your highest-rate debt"} first (${formatPercent(highest?.apr ?? 0, 2)}), minimising interest.`
                : `Snowball targets ${comparison.smallestDebt?.name ?? "your smallest balance"} first (${formatCurrency(comparison.smallestDebt?.balance ?? 0)}), building momentum with early wins.`}{" "}
              Extra payment: {formatCurrency(extra)} a month. Minimum payments are always protected first.
            </p>
          </div>
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <CardHeader
          title="Your debts"
          description="Balances, rates, minimums and due dates for every connected debt."
          action={<Badge tone="neutral">{summary.portfolio.length} accounts</Badge>}
        />
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleDebts.map((debt) => {
            const payment = upcoming.find((entry) => entry.accountId === debt.id);
            const meta = KIND_META[debt.kind === "loan" ? "loan" : debt.kind] ?? KIND_META.loan;
            return (
              <div
                key={debt.id}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 transition hover:border-white/[0.12]"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-white/30">{meta.label}</p>
                    <p className="mt-1 text-[13px] font-medium text-white/85">{debt.name}</p>
                    <p className="text-[10px] text-white/35">{debt.institution}</p>
                  </div>
                  {highest?.id === debt.id ? <Badge tone="amber">Highest rate</Badge> : (
                    <span className="rounded-full border border-white/[0.06] px-2 py-1 text-[9px] text-white/35">
                      {formatPercent(debt.shareOfDebt, 1)} of debt
                    </span>
                  )}
                </div>
                <p className="num mt-3 font-display text-[22px] font-semibold tracking-tight text-white">
                  {formatCurrency(debt.balance)}
                </p>
                {debt.utilization !== undefined ? (
                  <Progress value={debt.utilization * 100} tone={debt.utilization > 0.3 ? "amber" : "mint"} size="sm" className="mt-2" />
                ) : debt.originalBalance ? (
                  <Progress
                    value={Math.max(0, ((debt.originalBalance - debt.balance) / debt.originalBalance) * 100)}
                    tone="brand"
                    size="sm"
                    className="mt-2"
                  />
                ) : null}
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/[0.05] pt-3 text-[10px]">
                  <div>
                    <p className="text-white/30">APR</p>
                    <p className="num mt-0.5 text-[11.5px] font-medium text-white/80">{formatPercent(debt.apr, 2)}</p>
                  </div>
                  <div>
                    <p className="text-white/30">Monthly payment</p>
                    <p className="num mt-0.5 text-[11.5px] font-medium text-white/80">{formatCurrency(debt.minimumPayment)}</p>
                  </div>
                  <div>
                    <p className="text-white/30">Interest / month</p>
                    <p className="num mt-0.5 text-[11.5px] font-medium text-white/80">{formatCurrency(debt.interestPerMonth)}</p>
                  </div>
                  <div>
                    <p className="text-white/30">Next due</p>
                    <p className="mt-0.5 text-[11.5px] font-medium text-white/80">
                      {payment ? formatDate(payment.dueDate, "short") : "—"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {summary.portfolio.length > 6 ? (
          <button
            type="button"
            onClick={() => setShowAllDebts((value) => !value)}
            className="mt-3 w-full rounded-xl border border-white/[0.07] py-2 text-[11px] text-white/45 transition hover:text-white"
          >
            {showAllDebts ? "Show fewer debts" : `Show all ${summary.portfolio.length} debts`}
          </button>
        ) : null}
      </Card>

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="relative overflow-hidden p-4 sm:p-5 xl:col-span-7">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.07] text-violet-300">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-[16px] font-semibold tracking-tight text-white">
                What I would do with the debt
              </h2>
              <p className="mt-1 text-[10.5px] uppercase tracking-[0.12em] text-white/30">
                Based on {principle?.source}
              </p>
            </div>
          </div>
          <p className="mt-4 text-[12.5px] leading-relaxed text-white/55">
            {highest ? (
              <>
                Your {highest.name} carries the highest rate at{" "}
                <span className="text-white">{formatPercent(highest.apr, 2)}</span>
                {lowestRateDebt && lowestRateDebt.id !== highest.id ? (
                  <>
                    , while your {lowestRateDebt.name} costs{" "}
                    <span className="text-white">{formatPercent(lowestRateDebt.apr, 2)}</span>
                  </>
                ) : null}
                . Each month the card alone accrues roughly{" "}
                <span className="text-white">{formatCurrency(highest.interestPerMonth)}</span> in interest. Directing an extra{" "}
                {formatCurrency(150)} there would save about{" "}
                <span className="text-mint">{formatCurrency(interestSaved)}</span> and clear consumer debt{" "}
                {monthsSaved} months sooner.
              </>
            ) : (
              "You have no consumer debt balances. Keep it that way by paying statements in full."
            )}
          </p>
          <p className="mt-3 text-[12.5px] leading-relaxed text-white/45">
            {metrics.emergencyMonths < 1
              ? `Hold off on aggressive extra payments until you have at least one month of essentials (${formatCurrency(metrics.essentialExpenses)}) in savings. Otherwise an unexpected bill goes straight back onto the card.`
              : `Your emergency cushion covers ${metrics.emergencyMonths.toFixed(1)} months of essentials. Keep every minimum on autopay, keep the cushion liquid, and send the extra to the highest-rate balance.`}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] text-white/45">
              Principle · {principle?.title}
            </span>
            <Link href="/advisor" className="inline-flex items-center gap-1 text-[10.5px] font-medium text-violet-300 hover:text-violet-200">
              Discuss this with the advisor <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </Card>

        <div className="space-y-4 xl:col-span-5">
          {profile.preferences.aiAnalysis ? (
            debtInsights.slice(0, 2).map((insight) => (
              <InsightCard key={insight.id} insight={insight} compact />
            ))
          ) : (
            <InfoNote icon={<Sparkles className="h-4 w-4" />}>
              AI analysis is paused. Debt calculations remain available, but personalised explanations are hidden.
            </InfoNote>
          )}
          <Card className="p-4">
            <p className="label">Minimum payments first</p>
            <p className="mt-2 text-[11.5px] leading-relaxed text-white/45">
              Every scenario above pays all minimums before any extra is allocated. Missing a minimum triggers fees, penalty interest and credit-report damage — costs that usually exceed the gains from optimising payoff order.
            </p>
            <Link href="/accounts" className="mt-3 inline-flex items-center gap-1 text-[10.5px] text-violet-300 hover:text-violet-200">
              Check autopay across accounts <ArrowUpRight className="h-3 w-3" />
            </Link>
          </Card>
        </div>
      </div>

      <InfoNote>
        These projections assume fixed rates, no new charges, and that every minimum is paid on time. They are illustrations based on your connected balances, not guarantees. If you are struggling to make minimums, contact your lenders about hardship options before taking on new credit.
      </InfoNote>
    </div>
  );
}
