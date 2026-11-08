"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarRange,
  Info,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useFinance } from "@/components/providers/finance-provider";
import {
  buildForecast,
  describeConfidence,
  type ForecastHorizon,
} from "@/lib/finance/forecast";
import { getDashboardMetrics } from "@/lib/finance/aggregate";
import { formatCurrency, formatDate, formatPercent } from "@/lib/finance/format";
import { Badge, Button, Card, CardHeader, InfoNote, Segmented } from "@/components/ui/primitives";
import { ForecastChart } from "@/components/charts/forecast-chart";
import { cn } from "@/lib/utils";

const HORIZONS: { value: ForecastHorizon; label: string }[] = [
  { value: 3, label: "3 months" },
  { value: 6, label: "6 months" },
  { value: 12, label: "12 months" },
];

const SEVERITY_TONE = {
  high: "coral",
  medium: "amber",
  low: "blue",
} as const;

export function ForecastView() {
  const { profile } = useFinance();
  const metrics = getDashboardMetrics(profile);
  const [horizon, setHorizon] = useState<ForecastHorizon>(6);
  const [extraDebt, setExtraDebt] = useState(0);
  const [extraSavings, setExtraSavings] = useState(0);

  const baseline = useMemo(() => buildForecast(profile, horizon), [profile, horizon]);
  const forecast = useMemo(
    () => buildForecast(profile, horizon, { extraDebtPayment: extraDebt, extraSavings }),
    [profile, horizon, extraDebt, extraSavings],
  );

  const savingsDelta = forecast.endingSavings - metrics.totalSavings;
  const debtDelta = forecast.endingDebt - metrics.totalDebt;
  const scenarioActive = extraDebt > 0 || extraSavings > 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] text-white/35">
          <Sparkles className="h-3.5 w-3.5 text-violet-300" />
          Projection based on six months of habits and your current obligations
        </div>
        <Segmented value={horizon} onChange={setHorizon} options={HORIZONS} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint/10 text-mint">
              <Wallet className="h-4 w-4" />
            </div>
            <span className={cn("text-[10px]", savingsDelta >= 0 ? "text-mint" : "text-coral")}>
              {savingsDelta >= 0 ? "+" : "−"}{formatCurrency(Math.abs(savingsDelta))}
            </span>
          </div>
          <p className="label mt-3">Savings in {horizon} months</p>
          <p className="num mt-1 font-display text-[22px] font-semibold tracking-tight text-white">
            {formatCurrency(Math.max(0, forecast.endingSavings))}
          </p>
          <p className="mt-1 text-[10.5px] text-white/35">
            From {formatCurrency(metrics.totalSavings)} today
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-coral/10 text-coral">
              <TrendingDown className="h-4 w-4" />
            </div>
            <span className="text-[10px] text-white/35">
              {debtDelta < 0 ? "Falling" : "Rising"}
            </span>
          </div>
          <p className="label mt-3">Debt in {horizon} months</p>
          <p className="num mt-1 font-display text-[22px] font-semibold tracking-tight text-white">
            {formatCurrency(forecast.endingDebt)}
          </p>
          <p className="mt-1 text-[10.5px] text-white/35">
            {formatCurrency(Math.abs(debtDelta))} {debtDelta <= 0 ? "repaid" : "higher"}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-300">
            <CalendarRange className="h-4 w-4" />
          </div>
          <p className="label mt-3">Expected monthly surplus</p>
          <p className={cn("num mt-1 font-display text-[22px] font-semibold tracking-tight", forecast.monthlySurplus >= 0 ? "text-white" : "text-coral")}>
            {formatCurrency(forecast.monthlySurplus)}
          </p>
          <p className="mt-1 text-[10.5px] text-white/35">
            After projected spending and debt payments
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/12 text-violet-300">
              <ArrowUpRight className="h-4 w-4" />
            </div>
            <Badge tone={baseline.projectedExpenseChange > 0 ? "amber" : "mint"}>
              {baseline.projectedExpenseChange >= 0 ? "Rising" : "Falling"}
            </Badge>
          </div>
          <p className="label mt-3">Expenses, month {horizon}</p>
          <p className="num mt-1 font-display text-[22px] font-semibold tracking-tight text-white">
            {formatCurrency(forecast.points[forecast.points.length - 1]?.expenses ?? 0)}
          </p>
          <p className="mt-1 text-[10.5px] text-white/35">
            {formatCurrency(Math.abs(baseline.projectedExpenseChange))} {baseline.projectedExpenseChange >= 0 ? "above" : "below"} recent average
          </p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="p-5 sm:p-6 xl:col-span-8">
          <CardHeader
            title="Projected cash flow and balances"
            description="Monthly flows use the left axis; savings and debt balances use the right."
            action={<Badge tone={scenarioActive ? "violet" : "neutral"}>{scenarioActive ? "Scenario applied" : "Current habits"}</Badge>}
          />
          <div className="mt-4">
            <ForecastChart
              data={forecast.points.map((point) => ({
                label: point.label,
                income: point.income,
                expenses: point.expenses,
                debtPayments: point.debtPayments,
                savings: Math.max(0, point.savings),
              }))}
              height={288}
            />
          </div>

          <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11.5px] font-medium text-white/70">Stress-test the plan</p>
              {scenarioActive ? (
                <button
                  type="button"
                  onClick={() => {
                    setExtraDebt(0);
                    setExtraSavings(0);
                  }}
                  className="text-[10px] text-white/35 hover:text-white/70"
                >
                  Reset scenario
                </button>
              ) : (
                <span className="text-[10px] text-white/30">Optional what-if</span>
              )}
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <div className="flex items-center justify-between text-[10.5px]">
                  <label htmlFor="extraDebt" className="text-white/45">Extra to highest-rate debt</label>
                  <span className="num font-medium text-white/75">{formatCurrency(extraDebt)}</span>
                </div>
                <input
                  id="extraDebt"
                  type="range"
                  min={0}
                  max={500}
                  step={25}
                  value={extraDebt}
                  onChange={(event) => setExtraDebt(Number(event.target.value))}
                  className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-violet-500"
                />
              </div>
              <div>
                <div className="flex items-center justify-between text-[10.5px]">
                  <label htmlFor="extraSavings" className="text-white/45">Extra to savings</label>
                  <span className="num font-medium text-white/75">{formatCurrency(extraSavings)}</span>
                </div>
                <input
                  id="extraSavings"
                  type="range"
                  min={0}
                  max={500}
                  step={25}
                  value={extraSavings}
                  onChange={(event) => setExtraSavings(Number(event.target.value))}
                  className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-violet-500"
                />
              </div>
            </div>
            <p className="mt-2 text-[9.5px] leading-relaxed text-white/25">
              This is a what-if illustration, not a recommendation. Minimum payments are always made first; extra money
              is allocated to the highest-rate balance. Savings balances exclude investment returns.
            </p>
          </div>
        </Card>

        <Card className="relative overflow-hidden p-4 sm:p-5 xl:col-span-4">
          <div className="flex items-start gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.07] text-violet-300">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-[16px] font-semibold tracking-tight text-white">AI forecast</h2>
              <p className="text-[10px] text-white/30">Based on current habits</p>
            </div>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-white/55">{forecast.summary}</p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/[0.06] bg-black/15 p-3">
              <p className="label">Total income</p>
              <p className="num mt-1 text-[12.5px] font-semibold text-white">{formatCurrency(forecast.totalIncome)}</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-black/15 p-3">
              <p className="label">Total expenses</p>
              <p className="num mt-1 text-[12.5px] font-semibold text-white">{formatCurrency(forecast.totalExpenses)}</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-black/15 p-3">
              <p className="label">Debt payments</p>
              <p className="num mt-1 text-[12.5px] font-semibold text-white">{formatCurrency(forecast.totalDebtPayments)}</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-black/15 p-3">
              <p className="label">Ending savings</p>
              <p className="num mt-1 text-[12.5px] font-semibold text-white">{formatCurrency(Math.max(0, forecast.endingSavings))}</p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-[10px] text-white/30">
            <Info className="h-3 w-3 shrink-0" />
            {describeConfidence(forecast.confidence)}
          </div>
          <Link href="/advisor" className="mt-4 inline-flex items-center gap-1 text-[10.5px] font-medium text-violet-300 hover:text-violet-200">
            Ask the advisor about this <ArrowRight className="h-3 w-3" />
          </Link>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="p-5 sm:p-6 xl:col-span-7">
          <CardHeader
            title="What could go wrong"
            description="Risks that appear if your current patterns continue unchanged."
            action={<Badge tone={forecast.warnings.some((warning) => warning.severity === "high") ? "coral" : "amber"}>{forecast.warnings.length} flagged</Badge>}
          />
          <div className="mt-4 space-y-2.5">
            {forecast.warnings.map((warning) => (
              <div
                key={warning.id}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5"
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={cn(
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                      warning.severity === "high" ? "bg-coral/10 text-coral" : warning.severity === "medium" ? "bg-amber/10 text-amber" : "bg-brand-500/10 text-brand-300",
                    )}
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[12.5px] font-medium text-white/85">{warning.title}</p>
                      <Badge tone={SEVERITY_TONE[warning.severity]}>{warning.severity}</Badge>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-white/40">{warning.detail}</p>
                    <Link href={warning.actionHref} className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-violet-300 hover:text-violet-200">
                      {warning.actionLabel} <ArrowUpRight className="h-2.5 w-2.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
            {forecast.warnings.length === 0 ? (
              <div className="rounded-2xl border border-mint/15 bg-mint/[0.04] p-4 text-[11.5px] text-mint/80">
                No material risks detected in this horizon. That means the projection balances — not that it is guaranteed.
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="p-5 sm:p-6 xl:col-span-5">
          <CardHeader
            title="Category drift"
            description="Categories projected to move most over the horizon."
            action={<Badge tone="neutral">Trend</Badge>}
          />
          <div className="mt-4 space-y-3">
            {forecast.categoryTrends.slice(0, 6).map((trend) => {
              const rising = trend.change >= 0;
              const max = Math.max(...forecast.categoryTrends.slice(0, 6).map((entry) => Math.max(entry.start, entry.end)));
              return (
                <div key={trend.category}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-white/55">{trend.label}</span>
                    <span className={cn("flex items-center gap-1 text-[10px]", rising ? "text-amber" : "text-mint")}>
                      {rising ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {formatCurrency(Math.abs(trend.change))}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                      <div
                        className={cn("h-full rounded-full", rising ? "bg-gradient-to-r from-amber to-orange-400" : "bg-gradient-to-r from-mint to-emerald-400")}
                        style={{ width: `${Math.max(4, (Math.max(trend.start, trend.end) / Math.max(1, max)) * 100)}%` }}
                      />
                    </div>
                    <span className="num w-24 shrink-0 text-right text-[9.5px] text-white/30">
                      {formatCurrency(trend.start)} → {formatCurrency(trend.end)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <CardHeader
          title="Month-by-month projection"
          description="A complete view of what today's habits imply. All figures are estimates."
          action={<Badge tone="neutral">{horizon} months</Badge>}
        />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.06] text-[9.5px] uppercase tracking-[0.12em] text-white/30">
                <th className="pb-2.5 font-medium">Month</th>
                <th className="pb-2.5 font-medium">Income</th>
                <th className="pb-2.5 font-medium">Expenses</th>
                <th className="pb-2.5 font-medium">Debt payments</th>
                <th className="pb-2.5 font-medium">Net cash flow</th>
                <th className="pb-2.5 font-medium">Savings</th>
                <th className="pb-2.5 font-medium">Debt balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {forecast.points.map((point) => (
                <tr key={point.key} className="text-[11.5px] transition hover:bg-white/[0.02]">
                  <td className="py-2.5 text-white/70">{formatDate(point.monthDate)}</td>
                  <td className="num py-2.5 text-white/65">{formatCurrency(point.income)}</td>
                  <td className="num py-2.5 text-white/65">{formatCurrency(point.expenses)}</td>
                  <td className="num py-2.5 text-white/65">{formatCurrency(point.debtPayments)}</td>
                  <td className={cn("num py-2.5 font-medium", point.netCashFlow >= 0 ? "text-mint" : "text-coral")}>
                    {formatCurrency(point.netCashFlow, { sign: true })}
                  </td>
                  <td className="num py-2.5 text-white/65">{formatCurrency(Math.max(0, point.savings))}</td>
                  <td className="num py-2.5 text-white/65">{formatCurrency(point.debtBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <InfoNote icon={<Info className="h-4 w-4" />}>
        How this is calculated: income is your recent average; each spending category is projected from its six-month
        trend, dampened so one unusual month cannot dominate; debt is amortised with interest at the stated APR;
        required minimums are paid first. The model assumes no new borrowing, fixed rates, no investment returns and
        no large one-off purchases. Forecasts are illustrations, not guarantees — review them when your situation
        changes.
        <span className="mt-1 block text-white/30">
          Forecast horizon: {horizon} months · starting savings {formatCurrency(metrics.totalSavings)} · total projected
          surplus {formatPercent(forecast.totalIncome > 0 ? (forecast.totalIncome - forecast.totalExpenses - forecast.totalDebtPayments) / forecast.totalIncome : 0, 1)} of income.
        </span>
      </InfoNote>
    </div>
  );
}
