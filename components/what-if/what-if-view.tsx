"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Compass,
  Plus,
  ShieldCheck,
  Target,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { useFinance } from "@/components/providers/finance-provider";
import { buildWhatIfPlan } from "@/lib/finance/what-if";
import { getDashboardMetrics } from "@/lib/finance/aggregate";
import { formatCurrency, formatDate } from "@/lib/finance/format";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  InfoNote,
  Progress,
} from "@/components/ui/primitives";
import { Poyo } from "@/components/shared/poyo";
import { askPoyo } from "@/components/shared/poyo-chat";
import { cn } from "@/lib/utils";

const DEFAULT_SCENARIO = {
  name: "Trip to Japan",
  cost: 3200,
  saved: 400,
  months: 10,
};

const VERDICT = {
  clear: {
    tone: "mint" as const,
    label: "Fits your plan",
    ring: "border-mint/25 bg-mint/[0.05]",
  },
  tight: {
    tone: "amber" as const,
    label: "Tight but possible",
    ring: "border-amber/25 bg-amber/[0.05]",
  },
  wait: {
    tone: "coral" as const,
    label: "Better to wait",
    ring: "border-coral/25 bg-coral/[0.05]",
  },
};

export function WhatIfView() {
  const { profile, createGoal } = useFinance();
  const metrics = getDashboardMetrics(profile);
  const estimatedAnnual = Math.round(metrics.monthlyIncome * 12);

  const [name, setName] = useState<string>(DEFAULT_SCENARIO.name);
  const [cost, setCost] = useState<number>(DEFAULT_SCENARIO.cost);
  const [saved, setSaved] = useState<number>(DEFAULT_SCENARIO.saved);
  const [months, setMonths] = useState<number>(DEFAULT_SCENARIO.months);
  const [incomeMode, setIncomeMode] = useState<"salary" | "hourly">("salary");
  const [annualSalary, setAnnualSalary] = useState<number>(estimatedAnnual);
  const [hourlyWage, setHourlyWage] = useState<number>(
    Math.round((estimatedAnnual / 2080) * 100) / 100,
  );
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(40);
  const [customIncome, setCustomIncome] = useState(false);
  const [goalCreated, setGoalCreated] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const baseDate = useMemo(() => new Date(), []);

  const monthlyIncome =
    incomeMode === "salary"
      ? Math.max(0, annualSalary) / 12
      : (Math.max(0, hourlyWage) * Math.max(0, hoursPerWeek) * 52) / 12;

  const plan = useMemo(
    () =>
      buildWhatIfPlan(
        profile,
        { name, cost, saved, months, monthlyIncome },
        baseDate,
      ),
    [baseDate, cost, monthlyIncome, months, name, profile, saved],
  );
  const verdict = VERDICT[plan.verdict];

  const update = (patch: { name?: string; cost?: number; saved?: number; months?: number }) => {
    if (patch.name !== undefined) setName(patch.name);
    if (patch.cost !== undefined) setCost(patch.cost);
    if (patch.saved !== undefined) setSaved(patch.saved);
    if (patch.months !== undefined) setMonths(patch.months);
    setGoalCreated(false);
    setMessage(null);
  };

  const chooseIncomeMode = (mode: "salary" | "hourly") => {
    if (mode === incomeMode) return;
    if (mode === "hourly") {
      setHourlyWage(
        Math.round((annualSalary / (Math.max(1, hoursPerWeek) * 52)) * 100) / 100,
      );
    } else {
      setAnnualSalary(Math.round(hourlyWage * Math.max(1, hoursPerWeek) * 52));
    }
    setIncomeMode(mode);
    setCustomIncome(true);
  };

  const resetIncome = () => {
    setAnnualSalary(estimatedAnnual);
    setHourlyWage(Math.round((estimatedAnnual / 2080) * 100) / 100);
    setHoursPerWeek(40);
    setCustomIncome(false);
  };

  const saveAsGoal = () => {
    const result = createGoal({
      name: plan.name,
      target: plan.cost,
      saved: plan.saved,
      targetDate: plan.targetDate,
      priority: "medium",
      color: "#38BDF8",
      icon: "plane",
    });
    setGoalCreated(result.ok);
    setMessage(result.message);
  };

  const askAboutPlan = () =>
    askPoyo(
      `I'm thinking about ${plan.name} for ${formatCurrency(plan.cost)} in ${plan.months} months. What should I hold off on?`,
    );

  return (
    <div className="space-y-4 sm:space-y-5">
      {message ? (
        <div
          className={cn(
            "flex items-center justify-between gap-3 rounded-2xl border px-4 py-2.5 text-[11.5px]",
            goalCreated
              ? "border-mint/20 bg-mint/[0.06] text-mint"
              : "border-coral/20 bg-coral/[0.06] text-coral",
          )}
        >
          <span className="flex items-center gap-2">
            {goalCreated ? <CheckCircle2 className="h-4 w-4" /> : null}
            {message}
          </span>
          {goalCreated ? (
            <Link href="/savings" className="shrink-0 text-[10px] underline-offset-2 hover:underline">
              See it in Goals
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-12 xl:items-start">
        <Card className="relative overflow-hidden p-4 sm:p-5 xl:col-span-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="order-2 shrink-0 sm:order-1">
              <Poyo size={64} variant="bust" look="curious" glow={false} />
            </div>
            <div className="order-1 min-w-0 flex-1 sm:order-2">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-violet-300/20 bg-violet-500/10 text-violet-300">
                  <Target className="h-3.5 w-3.5" />
                </span>
                <p className="label text-violet-200/70">What if</p>
              </div>
              <h1 className="mt-2 font-display text-[20px] font-semibold leading-tight tracking-tight text-white sm:text-[22px]">
                Try the trip before you book it.
              </h1>
              <p className="mt-1.5 max-w-lg text-[11.5px] leading-relaxed text-white/45">
                Pick something you want, set the date, and I&apos;ll tell you what it really costs
                each month — and whether now is the right time.
              </p>
            </div>
          </div>
        </Card>

        <div className="space-y-4 xl:col-span-5">
          <Card className="p-5 sm:p-6">
            <p className="label">Your scenario</p>
            <div className="mt-3 space-y-3">
              <div>
                <label htmlFor="what-if-name" className="label">
                  What is it?
                </label>
                <input
                  id="what-if-name"
                  value={name}
                  onChange={(event) => update({ name: event.target.value })}
                  placeholder="Trip to Japan"
                  className="field mt-1.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="what-if-cost" className="label">
                    Total cost
                  </label>
                  <div className="relative mt-1.5">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/30">
                      $
                    </span>
                    <input
                      id="what-if-cost"
                      type="number"
                      min={0}
                      step={50}
                      value={cost}
                      onChange={(event) => update({ cost: Number(event.target.value) })}
                      className="field pl-6"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="what-if-saved" className="label">
                    Already saved
                  </label>
                  <div className="relative mt-1.5">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/30">
                      $
                    </span>
                    <input
                      id="what-if-saved"
                      type="number"
                      min={0}
                      step={50}
                      value={saved}
                      onChange={(event) => update({ saved: Number(event.target.value) })}
                      className="field pl-6"
                    />
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="what-if-months" className="label">
                    How far away?
                  </label>
                  <span className="num text-[11px] text-white/65">
                    {months} {months === 1 ? "month" : "months"} · {plan.targetLabel}
                  </span>
                </div>
                <input
                  id="what-if-months"
                  type="range"
                  min={1}
                  max={24}
                  step={1}
                  value={months}
                  onChange={(event) => update({ months: Number(event.target.value) })}
                  className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-violet-500"
                />
                <div className="mt-1 flex justify-between font-mono text-[8px] uppercase tracking-[0.1em] text-white/20">
                  <span>1 month</span>
                  <span>2 years</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="label">Your income</p>
                <h2 className="mt-0.5 font-display text-[15px] font-semibold tracking-tight text-white">
                  What you&apos;ll earn
                </h2>
              </div>
              <div className="inline-flex rounded-lg border border-white/10 bg-black/20 p-0.5 text-[9.5px]">
                {(["salary", "hourly"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={incomeMode === mode}
                    onClick={() => chooseIncomeMode(mode)}
                    className={cn(
                      "rounded-md px-2 py-1 font-medium capitalize transition",
                      incomeMode === mode
                        ? "bg-white/[0.1] text-white"
                        : "text-white/35 hover:text-white/70",
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-white/35">
              {customIncome
                ? "Using the income you entered."
                : `Estimated from your accounts: ${formatCurrency(metrics.monthlyIncome)} a month.`}
            </p>

            {incomeMode === "salary" ? (
              <div className="mt-3">
                <label htmlFor="what-if-salary" className="label">
                  Annual salary
                </label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/30">
                    $
                  </span>
                  <input
                    id="what-if-salary"
                    type="number"
                    min={0}
                    step={1000}
                    value={annualSalary}
                    onChange={(event) => {
                      setAnnualSalary(Number(event.target.value));
                      setCustomIncome(true);
                    }}
                    className="field pl-6"
                  />
                </div>
                <p className="mt-1 text-[9.5px] text-white/25">
                  {formatCurrency(Math.max(0, annualSalary) / 12)} a month before tax.
                </p>
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="what-if-hourly" className="label">
                    Hourly wage
                  </label>
                  <div className="relative mt-1.5">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/30">
                      $
                    </span>
                    <input
                      id="what-if-hourly"
                      type="number"
                      min={0}
                      step={0.5}
                      value={hourlyWage}
                      onChange={(event) => {
                        setHourlyWage(Number(event.target.value));
                        setCustomIncome(true);
                      }}
                      className="field pl-6"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="what-if-hours" className="label">
                    Hours / week
                  </label>
                  <input
                    id="what-if-hours"
                    type="number"
                    min={1}
                    max={80}
                    step={1}
                    value={hoursPerWeek}
                    onChange={(event) => {
                      setHoursPerWeek(Number(event.target.value));
                      setCustomIncome(true);
                    }}
                    className="field mt-1.5"
                  />
                </div>
                <p className="col-span-2 text-[9.5px] text-white/25">
                  {formatCurrency(monthlyIncome)} a month before tax.
                </p>
              </div>
            )}

            <div className="mt-3 rounded-xl border border-white/[0.06] bg-black/15 p-3">
              <p className="label">Projected over {months} months</p>
              <p className="num mt-1 text-[16px] font-semibold text-white">
                {formatCurrency(plan.projectedIncome)}
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-white/30">
                Estimated gross income. This plan is about {Math.round(plan.incomeShare * 100)}% of
                it.
              </p>
            </div>
            {customIncome ? (
              <button
                type="button"
                onClick={resetIncome}
                className="mt-2 text-[9.5px] font-medium text-violet-300 hover:text-violet-200"
              >
                Reset to account estimate
              </button>
            ) : null}
          </Card>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Card
          className={cn(
            "relative overflow-hidden p-5 sm:p-6 xl:col-span-7",
            verdict.ring,
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                key={`${plan.cost}-${plan.months}-${plan.verdict}`}
                className="poyo-pop flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]"
              >
                <Poyo size={46} variant="mark" />
              </div>
              <div>
                <p className="label text-white/40">Poyo&apos;s read</p>
                <h2 className="mt-0.5 font-display text-[19px] font-semibold leading-tight tracking-tight text-white">
                  {plan.headline}
                </h2>
              </div>
            </div>
            <Badge tone={verdict.tone}>
              {plan.needsCuts ? "Needs cutbacks" : verdict.label}
            </Badge>
          </div>

          <p className="mt-3 text-[12.5px] leading-relaxed text-white/60">{plan.poyo}</p>
          <p className="mt-2 text-[10.5px] leading-relaxed text-white/30">{plan.detail}</p>

          {plan.emergencyWarning ? (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber/15 bg-amber/[0.04] px-3 py-2.5 text-[10.5px] leading-relaxed text-amber/90">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Your emergency fund covers {plan.emergencyMonths.toFixed(1)} months. Poyo would
                rather see 3 months set aside before a discretionary purchase.
              </span>
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-xl border border-white/[0.06] bg-black/15 p-3">
              <p className="label">Needed monthly</p>
              <p className="num mt-1 text-[15px] font-semibold text-white">
                {formatCurrency(plan.requiredMonthly)}
              </p>
              <p className="mt-0.5 text-[9px] text-white/25">for {plan.months} months</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-black/15 p-3">
              <p className="label">After essentials</p>
              <p
                className={cn(
                  "num mt-1 text-[15px] font-semibold",
                  plan.afterEssentials >= 0 ? "text-white" : "text-coral",
                )}
              >
                {formatCurrency(plan.afterEssentials)}
              </p>
              <p className="mt-0.5 text-[9px] text-white/25">available each month</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-black/15 p-3">
              <p className="label">Left after this</p>
              <p
                className={cn(
                  "num mt-1 text-[15px] font-semibold",
                  plan.leftover >= 0 && plan.cashLeftover >= 0 ? "text-mint" : "text-coral",
                )}
              >
                {formatCurrency(plan.leftover)}
              </p>
              <p className="mt-0.5 text-[9px] text-white/25">after essentials + plan</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-black/15 p-3">
              <p className="label">Ready by</p>
              <p className="num mt-1 text-[15px] font-semibold text-white">{plan.targetLabel}</p>
              <p className="mt-0.5 text-[9px] text-white/25">
                {plan.onTrack ? "on this timeline" : "if you push the date"}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={saveAsGoal} disabled={goalCreated || plan.cost <= 0}>
              {goalCreated ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Goal created
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" /> Make this a goal
                </>
              )}
            </Button>
            <Button size="sm" variant="secondary" onClick={askAboutPlan}>
              <Poyo size={18} variant="mark" animated={false} glow={false} />
              Talk it through
            </Button>
            <span className="text-[9.5px] text-white/25">
              {plan.remaining > 0
                ? `${formatCurrency(plan.remaining)} left to save`
                : "Fully funded already"}
            </span>
          </div>
        </Card>

        <Card className="p-5 sm:p-6 xl:col-span-5">
          <CardHeader
            title="The math"
            description="What the plan looks like month by month."
            action={<Badge tone="neutral">{formatCurrency(plan.cost)} total</Badge>}
          />
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="label">Saved so far</p>
              <p className="num mt-1 font-display text-[24px] font-semibold tracking-tight text-white">
                {formatCurrency(plan.saved)}
              </p>
            </div>
            <p className="text-[10.5px] text-white/35">of {formatCurrency(plan.cost)}</p>
          </div>
          <Progress
            value={plan.cost > 0 ? (plan.saved / plan.cost) * 100 : 100}
            tone="brand"
            size="md"
            className="mt-2.5"
            label="What-if funding progress"
          />

          <div className="mt-4 space-y-2.5">
            {plan.milestones.map((milestone) => (
              <div key={milestone.month} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-[9.5px] text-white/30">
                  {milestone.label}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-400 to-brand-400"
                    style={{ width: `${Math.max(3, Math.min(100, milestone.pct))}%` }}
                  />
                </div>
                <span className="num w-14 shrink-0 text-right text-[9.5px] text-white/45">
                  {formatCurrency(milestone.saved)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/[0.06] pt-3.5">
            <div className="flex items-center gap-2">
              <Wallet className="h-3.5 w-3.5 text-white/25" />
              <div>
                <p className="text-[9px] uppercase tracking-[0.08em] text-white/25">
                  After essentials
                </p>
                <p className="num text-[11.5px] text-white/70">
                  {formatCurrency(plan.afterEssentials)}/mo
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5 text-white/25" />
              <div>
                <p className="text-[9px] uppercase tracking-[0.08em] text-white/25">Target date</p>
                <p className="text-[11.5px] text-white/70">{formatDate(plan.targetDate)}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <CardHeader
          title="How it fits the rest of your plan"
          description="The fit check subtracts essentials first — housing, food, transport, insurance and minimum debt payments — then compares the set-aside with what your current spending leaves."
          action={<ShieldCheck className="h-4 w-4 text-mint/60" />}
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
            <p className="label">Monthly income</p>
            <p className="num mt-1 text-[16px] font-semibold text-white">
              {formatCurrency(plan.income)}
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-white/30">
              Gross, before tax. Edit the salary or hourly estimate above if it is off.
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
            <p className="label">Essentials</p>
            <p className="num mt-1 text-[16px] font-semibold text-white">
              {formatCurrency(plan.essentials)}
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-white/30">
              Housing, utilities, groceries, transport, healthcare, insurance and minimum payments.
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
            <p className="label">Left after essentials</p>
            <p
              className={cn(
                "num mt-1 text-[16px] font-semibold",
                plan.afterEssentials >= 0 ? "text-mint" : "text-coral",
              )}
            >
              {formatCurrency(plan.afterEssentials)}
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-white/30">
              What is available before discretionary spending. Poyo never counts this as free money
              twice.
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/[0.06] bg-black/15 p-3">
            <p className="label">Current spending leaves</p>
            <p
              className={cn(
                "num mt-1 text-[14px] font-semibold",
                plan.currentSpendingLeftover >= 0 ? "text-white" : "text-coral",
              )}
            >
              {formatCurrency(plan.currentSpendingLeftover)}
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-black/15 p-3">
            <p className="label">This plan needs</p>
            <p className="num mt-1 text-[14px] font-semibold text-white">
              {formatCurrency(plan.requiredMonthly)}
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-black/15 p-3">
            <p className="label">Left after both</p>
            <p
              className={cn(
                "num mt-1 text-[14px] font-semibold",
                plan.cashLeftover >= 0 ? "text-mint" : "text-coral",
              )}
            >
              {formatCurrency(plan.cashLeftover)}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-white/30">
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-mint" /> Essentials covered first
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400" /> No new borrowing assumed
          </span>
          <Link
            href="/forecast"
            className="ml-auto inline-flex items-center gap-1 text-violet-300 hover:text-violet-200"
          >
            See the full forecast <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </Card>

      <InfoNote icon={<Compass className="h-4 w-4" />}>
        This is a planning illustration, not a recommendation or a guarantee. Fits subtracts
        essentials before counting anything as available, then compares the set-aside with what your
        current spending leaves. The income estimate comes from your recent deposits unless you
        enter a salary or hourly wage; projected earnings assume that income stays the same and are
        shown before tax. Required debt payments and a three-month emergency cushion still come
        first.
      </InfoNote>
    </div>
  );
}
