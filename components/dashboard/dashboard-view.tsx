"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarClock,
  ChevronDown,
  Compass,
  ChevronRight,
  Landmark,
  Lightbulb,
  Plus,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useFinance } from "@/components/providers/finance-provider";
import {
  CATEGORY_META,
  getCompleteMonths,
  getDashboardMetrics,
  getMonthlyHistory,
  getRecentTransactions,
  getUpcomingPayments,
} from "@/lib/finance/aggregate";
import { computeHealthScore, factorBarClass, factorToneClass } from "@/lib/finance/score";
import { generateInsights } from "@/lib/finance/insights";
import { formatCurrency, formatDate, formatRelativeSync } from "@/lib/finance/format";
import { HealthGauge } from "@/components/charts/health-gauge";
import { FlowChart } from "@/components/charts/flow-chart";
import { SpendingDonut } from "@/components/charts/spending-donut";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  InfoNote,
  Progress,
  TextLink,
  buttonClass,
} from "@/components/ui/primitives";
import { InsightCard } from "@/components/shared/insight-card";
import { CategoryAvatar } from "@/components/shared/category-icon";
import { GamificationPanel } from "@/components/shared/gamification-panel";
import { PortfolioSummary } from "@/components/dashboard/portfolio-summary";
import { AccountsTable } from "@/components/dashboard/accounts-table";
import { PoyoPlan } from "@/components/dashboard/poyo-plan";
import { RecentCallCard } from "@/components/dashboard/recent-call-card";
import { Poyo } from "@/components/shared/poyo";
import { PoyoAskButton } from "@/components/shared/poyo-chat";
import { buildPoyoPlan } from "@/lib/finance/priorities";
import { AddTransactionDialog } from "@/components/shared/add-transaction-dialog";
import { AddGoalDialog } from "@/components/shared/add-goal-dialog";
import type { FinancialProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

const HOME_TABS = ["overview", "accounts", "activity", "goals"] as const;
type HomeTab = (typeof HOME_TABS)[number];

const TAB_META: Record<HomeTab, { label: string; hint: string }> = {
  overview: { label: "Overview", hint: "Position and next moves" },
  accounts: { label: "Accounts", hint: "Balances, due dates, activity" },
  activity: { label: "Activity", hint: "Income, spending, patterns" },
  goals: { label: "Goals", hint: "Targets and momentum" },
};

type HealthScore = ReturnType<typeof computeHealthScore>;
type Insight = ReturnType<typeof generateInsights>[number];
type UpcomingPayment = ReturnType<typeof getUpcomingPayments>[number];
type RecentTransaction = ReturnType<typeof getRecentTransactions>[number];
type DashboardMetrics = ReturnType<typeof getDashboardMetrics>;
type CashFlowPoint = { label: string; income: number; expenses: number };
type SpendingSlice = { category: string; label: string; amount: number; color: string };

function FactorRow({
  label,
  score,
  weight,
  summary,
  valueLabel,
  status,
}: {
  label: string;
  score: number;
  weight: number;
  summary: string;
  valueLabel: string;
  status: "strength" | "watch" | "risk";
}) {
  return (
    <div className="py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[11px] font-medium text-white/70">{label}</span>
          <span className="shrink-0 rounded border border-white/[0.07] px-1 py-0.5 font-mono text-[8px] text-white/25">
            {weight}%
          </span>
        </div>
        <span className={cn("num shrink-0 text-[11px] font-semibold", factorToneClass(status))}>
          {score}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-3">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={cn("h-full rounded-full transition-all duration-700", factorBarClass(status))}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className="w-16 shrink-0 truncate text-right font-mono text-[8.5px] text-white/30">
          {valueLabel}
        </span>
      </div>
      <p className="mt-1.5 line-clamp-1 text-[9.5px] text-white/30">{summary}</p>
    </div>
  );
}

function HealthCard({
  score,
  expanded,
  onToggle,
}: {
  score: HealthScore;
  expanded: boolean;
  onToggle: () => void;
}) {
  const rows = expanded ? score.factors : score.factors.slice(0, 3);

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <p className="label">Financial health</p>
            <p className="text-[10px] text-white/35">Why you scored this</p>
          </div>
        </div>
        <Badge
          tone={
            score.tone === "mint"
              ? "mint"
              : score.tone === "blue"
                ? "blue"
                : score.tone === "amber"
                  ? "amber"
                  : "coral"
          }
        >
          {score.band}
        </Badge>
      </div>

      <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row">
        <HealthGauge score={score.score} tone={score.tone} size={132} />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[15px] font-semibold leading-snug text-white">
            {score.headline}
          </h2>
          <p className="mt-1.5 line-clamp-4 text-[11px] leading-relaxed text-white/45">
            {score.summary}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {score.strengths.slice(0, 1).map((factor) => (
              <span
                key={factor.id}
                className="rounded-full border border-mint/20 bg-mint/[0.07] px-2 py-0.5 text-[9px] text-mint"
              >
                Strong · {factor.label}
              </span>
            ))}
            {score.watchouts.slice(0, 1).map((factor) => (
              <span
                key={factor.id}
                className="rounded-full border border-amber/20 bg-amber/[0.06] px-2 py-0.5 text-[9px] text-amber"
              >
                Watch · {factor.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 divide-y divide-white/[0.05] rounded-md border border-white/[0.06] bg-white/[0.012] px-3">
        {rows.map((factor) => (
          <FactorRow
            key={factor.id}
            label={factor.label}
            score={factor.score}
            weight={factor.weight}
            summary={factor.summary}
            valueLabel={factor.valueLabel}
            status={factor.status}
          />
        ))}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center gap-1 text-[10px] font-medium text-white/45 transition hover:text-white/80"
        >
          {expanded ? "Show less" : `All ${score.factors.length} factors`}
          <ChevronDown className={cn("h-3 w-3 transition", expanded && "rotate-180")} />
        </button>
        <Link
          href="/advisor"
          className="inline-flex items-center gap-1 text-[10px] font-medium text-violet-300 hover:text-violet-200"
        >
          Ask about this <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </Card>
  );
}

function ObservationsCard({
  profile,
  insights,
  aiEnabled,
  onEnable,
}: {
  profile: FinancialProfile;
  insights: Insight[];
  aiEnabled: boolean;
  onEnable: () => void;
}) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
            <Lightbulb className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-[16px] font-semibold tracking-tight text-white">
              What else Poyo noticed
            </h2>
            <p className="mt-1 text-[11px] text-white/40">
              Based on {profile.transactions.length} transactions and your connected balances.
            </p>
          </div>
        </div>
        <Link
          href="/advisor"
          className="text-[10.5px] font-medium text-violet-300 hover:text-violet-200"
        >
          Open advisor
        </Link>
      </div>

      {aiEnabled ? (
        <div className="mt-3.5 space-y-2.5">
          {insights.slice(0, 2).map((insight) => (
            <InsightCard key={insight.id} insight={insight} compact />
          ))}
        </div>
      ) : (
        <div className="mt-3.5 rounded-xl border border-dashed border-white/10 p-6 text-center">
          <Lightbulb className="mx-auto h-5 w-5 text-white/30" />
          <p className="mt-2 text-sm font-medium text-white/80">AI analysis is paused</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-white/40">
            Your transactions are not being analysed. You can turn analysis back on at any time — it
            only uses the accounts you have connected.
          </p>
          <Button className="mt-3" size="sm" onClick={onEnable}>
            Enable AI analysis
          </Button>
        </div>
      )}

      <div className="mt-3 flex items-center gap-1.5 text-[9.5px] text-white/25">
        <Lightbulb className="h-3 w-3" />
        Educational guidance from your data — not financial advice or a guaranteed outcome.
      </div>
    </Card>
  );
}

function CashFlowCard({ metrics, data }: { metrics: DashboardMetrics; data: CashFlowPoint[] }) {
  return (
    <Card className="p-5 sm:p-6">
      <CardHeader
        title="Cash flow"
        description="Income against spending and required debt payments, month by month."
        action={<Badge tone="neutral">Last 6 months</Badge>}
      />
      <div className="mt-4">
        <FlowChart data={data} height={232} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-4">
        <div>
          <p className="label">Avg income</p>
          <p className="num mt-1 text-sm font-semibold text-white">
            {formatCurrency(metrics.monthlyIncome)}
          </p>
        </div>
        <div>
          <p className="label">Avg outflow</p>
          <p className="num mt-1 text-sm font-semibold text-white">
            {formatCurrency(metrics.monthlyExpenses)}
          </p>
        </div>
        <div>
          <p className="label">Avg surplus</p>
          <p className="num mt-1 text-sm font-semibold text-mint">
            {formatCurrency(metrics.disposableIncome)}
          </p>
        </div>
      </div>
    </Card>
  );
}

function SpendingCard({
  latest,
  slices,
}: {
  latest: ReturnType<typeof getMonthlyHistory>[number] | undefined;
  slices: SpendingSlice[];
}) {
  return (
    <Card className="p-5 sm:p-6">
      <CardHeader
        title="Spending"
        description={
          latest
            ? `${formatDate(latest.key + "-02")} · ${formatCurrency(latest.expenses)} across accounts`
            : "Last complete month"
        }
        action={
          <TextLink href="/spending">
            Details <ArrowUpRight className="h-3 w-3" />
          </TextLink>
        }
      />
      <div className="mt-2">
        <SpendingDonut data={slices} total={latest?.expenses ?? 0} height={214} />
      </div>
      <InfoNote className="mt-3">
        {latest
          ? `Your largest category was ${slices[0]?.label.toLowerCase()} at ${formatCurrency(
              slices[0]?.amount ?? 0,
            )}. ${
              latest.isPartial
                ? ""
                : "Required debt payments are tracked separately and not included above."
            }`
          : "Connect an account to see a spending breakdown."}
      </InfoNote>
    </Card>
  );
}

function UpcomingCard({
  profile,
  upcoming,
  dueNext30,
}: {
  profile: FinancialProfile;
  upcoming: UpcomingPayment[];
  dueNext30: number;
}) {
  const accountMap = new Map(profile.accounts.map((account) => [account.id, account]));

  return (
    <Card className="flex flex-col p-5 sm:p-6">
      <CardHeader
        title="Upcoming payments"
        description="Required payments ordered by due date."
        action={<CalendarClock className="h-4 w-4 text-white/30" />}
      />
      <div className="mt-3 flex-1 space-y-1">
        {upcoming.map((payment) => {
          const account = accountMap.get(payment.accountId);
          return (
            <Link
              key={payment.accountId}
              href="/accounts"
              className="flex items-center gap-3 rounded-lg px-1.5 py-2.5 transition hover:bg-white/[0.035]"
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/[0.06] text-[9px] font-semibold"
                style={{
                  backgroundColor: `${account?.accent ?? "#6366F1"}14`,
                  color: account?.accent ?? "#A5B4FC",
                }}
              >
                {account?.logo ?? "FS"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-white/85">{payment.name}</p>
                <p className="font-mono text-[9px] text-white/30">
                  {payment.institution} · due {formatDate(payment.dueDate, "short")}
                </p>
              </div>
              <div className="text-right">
                <p className="num text-[12px] font-semibold text-white">
                  {formatCurrency(payment.amount)}
                </p>
                <p
                  className={cn(
                    "font-mono text-[8.5px] uppercase tracking-[0.08em]",
                    payment.daysAway <= 7 ? "text-amber" : "text-white/30",
                  )}
                >
                  {payment.daysAway === 0 ? "today" : `in ${payment.daysAway}d`}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3.5">
        <div>
          <p className="label">Due in 30 days</p>
          <p className="num mt-0.5 text-sm font-semibold text-white">
            {formatCurrency(dueNext30)}
          </p>
        </div>
        <Link
          href="/accounts"
          className="inline-flex items-center gap-1 text-[10.5px] text-violet-300 hover:text-violet-200"
        >
          All accounts <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </Card>
  );
}

function GoalsCard({
  profile,
  metrics,
  onNewGoal,
}: {
  profile: FinancialProfile;
  metrics: DashboardMetrics;
  onNewGoal: () => void;
}) {
  return (
    <Card className="p-5 sm:p-6">
      <CardHeader
        title="Financial goals"
        description="What you are building, and how close you are."
        action={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onNewGoal}
              className="inline-flex items-center gap-1 text-[10.5px] font-medium text-violet-300 hover:text-violet-200"
            >
              <Plus className="h-3 w-3" /> New goal
            </button>
            <TextLink href="/savings">
              Manage <ChevronRight className="h-3 w-3" />
            </TextLink>
          </div>
        }
      />
      <div className="mt-4 space-y-2.5">
        {profile.goals.map((goal) => {
          const progress = Math.min(100, (goal.saved / Math.max(1, goal.target)) * 100);
          const remaining = Math.max(0, goal.target - goal.saved);
          return (
            <Link
              key={goal.id}
              href="/savings"
              className="block rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 transition hover:border-white/[0.12] hover:bg-white/[0.04]"
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06]"
                  style={{ backgroundColor: `${goal.color}14`, color: goal.color }}
                >
                  {goal.id === "goal_emergency" ? (
                    <ShieldCheck className="h-4 w-4" />
                  ) : goal.id === "goal_japan" ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <Landmark className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-[12px] font-medium text-white/85">{goal.name}</p>
                    <p className="num shrink-0 text-[10.5px] text-white/45">
                      {formatCurrency(goal.saved)}{" "}
                      <span className="text-white/25">of {formatCurrency(goal.target)}</span>
                    </p>
                  </div>
                  <Progress value={progress} tone="brand" size="sm" className="mt-2" />
                  <div className="mt-1.5 flex items-center justify-between font-mono text-[8.5px] text-white/30">
                    <span>
                      {Math.round(progress)}% funded · {formatCurrency(remaining)} to go
                    </span>
                    {goal.targetDate ? <span>{formatDate(goal.targetDate)}</span> : null}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5">
        <div>
          <p className="text-[11px] font-medium text-white/80">
            Emergency coverage: {metrics.emergencyMonths.toFixed(1)} of 3 months
          </p>
          <p className="mt-0.5 text-[9.5px] text-white/35">
            {formatCurrency(metrics.emergencyTarget)} recommended ·{" "}
            {formatCurrency(Math.max(0, metrics.emergencyTarget - metrics.emergencySavings))}{" "}
            remaining
          </p>
        </div>
        <Badge tone={metrics.emergencyMonths >= 3 ? "mint" : "amber"}>
          {metrics.emergencyMonths >= 3 ? "On target" : "Build first"}
        </Badge>
      </div>
    </Card>
  );
}

function RecentActivityCard({
  profile,
  recent,
  onAddTransaction,
}: {
  profile: FinancialProfile;
  recent: RecentTransaction[];
  onAddTransaction: () => void;
}) {
  const accountMap = new Map(profile.accounts.map((account) => [account.id, account]));

  return (
    <Card className="p-5 sm:p-6">
      <CardHeader
        title="Recent activity"
        description="The latest transactions across every connected account."
        action={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onAddTransaction}
              className="inline-flex items-center gap-1 text-[10.5px] font-medium text-violet-300 hover:text-violet-200"
            >
              <Plus className="h-3 w-3" /> Add transaction
            </button>
            <TextLink href="/spending">
              All transactions <ChevronRight className="h-3 w-3" />
            </TextLink>
          </div>
        }
      />
      <div className="mt-2 divide-y divide-white/[0.045]">
        {recent.map((tx) => {
          const account = accountMap.get(tx.accountId);
          const isIncome = tx.type === "income";
          return (
            <div key={tx.id} className="flex items-center gap-3 py-2.5">
              <CategoryAvatar category={tx.category} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-white/85">{tx.merchant}</p>
                <p className="font-mono text-[9px] text-white/30">
                  {account?.institution ?? "Connected account"} ·{" "}
                  {formatDate(tx.date, "short")}
                </p>
              </div>
              <span className="hidden rounded border border-white/[0.06] px-1.5 py-0.5 text-[9px] text-white/35 sm:inline">
                {CATEGORY_META[tx.category]?.label ?? tx.category}
              </span>
              <p
                className={cn(
                  "num w-20 shrink-0 text-right text-[12px] font-semibold",
                  isIncome ? "text-mint" : "text-white/85",
                )}
              >
                {isIncome ? "+" : "−"}
                {formatCurrency(tx.amount, { cents: true })}
              </p>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-1.5 border-t border-white/[0.05] pt-3 text-[9px] text-white/25">
        <ShieldCheck className="h-3 w-3" />
        Simulated data · last synced{" "}
        {formatRelativeSync(profile.accounts[0]?.lastSyncedAt ?? profile.asOf)}
      </div>
    </Card>
  );
}

function PoyoCheckIn({ profile }: { profile: FinancialProfile }) {
  const plan = buildPoyoPlan(profile);
  const top = plan.moves[0];
  if (!top) return null;

  return (
    <div className="flex items-center gap-3 rounded-md border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
      <Poyo size={34} variant="bust" className="-my-1" glow={false} />
      <div className="min-w-0 flex-1">
        <p className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-violet-200/60">
          Poyo checked in
        </p>
        <p className="line-clamp-1 text-[11.5px] leading-snug text-white/70">{top.title}</p>
      </div>
      <PoyoAskButton question={top.question} className="shrink-0">
        Ask why
      </PoyoAskButton>
    </div>
  );
}

function WhatIfCard() {
  return (
    <Card className="relative overflow-hidden p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="hidden shrink-0 sm:block">
          <Poyo size={56} variant="bust" look="wink" glow={false} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="label text-brand-300/70">What if</p>
          <h2 className="mt-1 font-display text-[16px] font-semibold tracking-tight text-white">
            Could you take that trip next year?
          </h2>
          <p className="mt-1 max-w-xl text-[11.5px] leading-relaxed text-white/45">
            Pick a trip, a big purchase or a move. Poyo works out what it costs each month and
            whether the timing actually works.
          </p>
        </div>
        <Link href="/what-if" className={cn(buttonClass("outline", "sm"), "shrink-0")}>
          Try a what-if <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </Card>
  );
}

export function DashboardView() {
  const { profile, updatePreferences } = useFinance();
  const [tab, setTab] = useState<HomeTab>("overview");
  const [expanded, setExpanded] = useState(false);
  const [addTransactionOpen, setAddTransactionOpen] = useState(false);
  const [addGoalOpen, setAddGoalOpen] = useState(false);
  const [dataNotice, setDataNotice] = useState<string | null>(null);
  const metrics = getDashboardMetrics(profile);
  const score = computeHealthScore(profile);
  const history = getMonthlyHistory(profile);
  const complete = getCompleteMonths(history);
  const insights = generateInsights(profile);
  const recent = getRecentTransactions(profile, 6);
  const upcoming = getUpcomingPayments(profile).slice(0, 4);
  const aiEnabled = profile.preferences.aiAnalysis;
  const latest = complete[complete.length - 1];

  const spendingSlices = useMemo(() => {
    const entries = Object.entries(latest?.byCategory ?? {})
      .map(([category, amount]) => ({
        category,
        label: CATEGORY_META[category]?.label ?? category,
        amount,
        color: CATEGORY_META[category]?.color ?? "#818CF8",
      }))
      .sort((a, b) => b.amount - a.amount);
    const top = entries.slice(0, 5);
    const rest = entries.slice(5).reduce((sum, entry) => sum + entry.amount, 0);
    return rest > 0
      ? [...top, { category: "other_group", label: "Everything else", amount: rest, color: "#64748B" }]
      : top;
  }, [latest]);

  const chartData = history.slice(-6).map((month) => ({
    label: month.isPartial ? `${month.label} MTD` : month.label,
    income: month.income,
    expenses: month.expenses,
  }));

  const dueNext30 = getUpcomingPayments(profile)
    .filter((payment) => payment.daysAway <= 30)
    .reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="space-y-4">
      <PoyoCheckIn profile={profile} />

      {dataNotice ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-mint/20 bg-mint/[0.06] px-4 py-2.5 text-[11.5px] text-mint">
          <span>{dataNotice}</span>
          <button
            type="button"
            onClick={() => setDataNotice(null)}
            className="text-[10px] text-mint/60 hover:text-mint"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-white/[0.08]">
        <div
          role="tablist"
          aria-label="Home sections"
          className="flex max-w-full gap-0.5 overflow-x-auto"
        >
          {HOME_TABS.map((id) => {
            const active = tab === id;
            const count =
              id === "accounts"
                ? profile.accounts.length
                : id === "goals"
                  ? profile.goals.length
                  : null;
            return (
              <button
                key={id}
                id={`home-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`home-panel-${id}`}
                onClick={() => setTab(id)}
                className={cn(
                  "relative shrink-0 border-b-2 px-3 py-2.5 text-[11.5px] font-medium transition sm:px-4",
                  active
                    ? "border-violet-400 text-white"
                    : "border-transparent text-white/40 hover:text-white/75",
                )}
              >
                {TAB_META[id].label}
                {count !== null ? (
                  <span
                    className={cn(
                      "ml-1.5 font-mono text-[9px]",
                      active ? "text-violet-300" : "text-white/25",
                    )}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <p className="hidden pb-2.5 font-mono text-[8px] uppercase tracking-[0.16em] text-white/25 sm:block">
          {TAB_META[tab].hint}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link href="/accounts" className={buttonClass("outline", "sm")}>
          <Plus className="h-3.5 w-3.5" /> Add account
        </Link>
        <Button size="sm" variant="outline" onClick={() => setAddTransactionOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Add transaction
        </Button>
        <Button size="sm" variant="outline" onClick={() => setAddGoalOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> New goal
        </Button>
        <Link href="/what-if" className={buttonClass("outline", "sm")}>
          <Compass className="h-3.5 w-3.5" /> What if
        </Link>
        <span className="ml-auto hidden font-mono text-[8.5px] uppercase tracking-[0.12em] text-white/20 sm:block">
          Add your own data
        </span>
      </div>

      <div
        role="tabpanel"
        id="home-panel-overview"
        aria-labelledby="home-tab-overview"
        hidden={tab !== "overview"}
        className="space-y-4"
      >
        <PortfolioSummary profile={profile} />

        <div className="grid gap-4 xl:grid-cols-12 xl:items-start">
          <div className="xl:col-span-7">
            <PoyoPlan profile={profile} />
          </div>
          <div className="xl:col-span-5">
            <HealthCard score={score} expanded={expanded} onToggle={() => setExpanded((v) => !v)} />
          </div>
        </div>

        <WhatIfCard />
        <RecentCallCard />
      </div>

      <div
        role="tabpanel"
        id="home-panel-accounts"
        aria-labelledby="home-tab-accounts"
        hidden={tab !== "accounts"}
        className="space-y-4"
      >
        <div className="grid gap-4 xl:grid-cols-12 xl:items-start">
          <div className="xl:col-span-7">
            <AccountsTable profile={profile} />
          </div>
          <div className="xl:col-span-5">
            <UpcomingCard profile={profile} upcoming={upcoming} dueNext30={dueNext30} />
          </div>
        </div>
        <RecentActivityCard
          profile={profile}
          recent={recent}
          onAddTransaction={() => setAddTransactionOpen(true)}
        />
      </div>

      <div
        role="tabpanel"
        id="home-panel-activity"
        aria-labelledby="home-tab-activity"
        hidden={tab !== "activity"}
        className="space-y-4"
      >
        <div className="grid gap-4 xl:grid-cols-12 xl:items-start">
          <div className="xl:col-span-7">
            <CashFlowCard metrics={metrics} data={chartData} />
          </div>
          <div className="xl:col-span-5">
            <SpendingCard latest={latest} slices={spendingSlices} />
          </div>
        </div>
        <ObservationsCard
          profile={profile}
          insights={insights}
          aiEnabled={aiEnabled}
          onEnable={() => updatePreferences({ aiAnalysis: true })}
        />
      </div>

      <div
        role="tabpanel"
        id="home-panel-goals"
        aria-labelledby="home-tab-goals"
        hidden={tab !== "goals"}
        className="space-y-4"
      >
        <div className="grid gap-4 xl:grid-cols-12 xl:items-start">
          <div className="xl:col-span-7">
            <GoalsCard profile={profile} metrics={metrics} onNewGoal={() => setAddGoalOpen(true)} />
          </div>
          <div className="xl:col-span-5">
            <GamificationPanel compact />
          </div>
        </div>
      </div>

      <AddTransactionDialog
        open={addTransactionOpen}
        onClose={() => setAddTransactionOpen(false)}
        onAdded={(message) => setDataNotice(message)}
      />
      <AddGoalDialog
        open={addGoalOpen}
        onClose={() => setAddGoalOpen(false)}
        onAdded={(message) => setDataNotice(message)}
      />
    </div>
  );
}
