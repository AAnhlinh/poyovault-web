"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  Home,
  Plane,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { useFinance } from "@/components/providers/finance-provider";
import type { SavingsGoal } from "@/lib/types";
import {
  getCompleteMonths,
  getDashboardMetrics,
  getEmergencyTarget,
  getEssentialExpenses,
  getMonthlyHistory,
  getSavingsAccounts,
} from "@/lib/finance/aggregate";
import { generateInsights, getSurplusPlan } from "@/lib/finance/insights";
import { getPrinciple } from "@/lib/finance/principles";
import { formatCurrency, formatDate, formatPercent } from "@/lib/finance/format";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  InfoNote,
  Progress,
  TextLink,
} from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { AddGoalDialog } from "@/components/shared/add-goal-dialog";
import { InsightCard } from "@/components/shared/insight-card";
import { GamificationPanel } from "@/components/shared/gamification-panel";
import { cn } from "@/lib/utils";

function GoalIcon({ icon, className }: { icon: SavingsGoal["icon"]; className?: string }) {
  if (icon === "shield") return <ShieldCheck className={className} />;
  if (icon === "plane") return <Plane className={className} />;
  if (icon === "home") return <Home className={className} />;
  return <Sparkles className={className} />;
}

function monthsUntil(date?: string) {
  if (!date) return null;
  const now = new Date();
  const target = new Date(date);
  return Math.max(
    1,
    (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth()),
  );
}

export function SavingsView() {
  const { profile, contribute, setGoalTarget } = useFinance();
  const metrics = getDashboardMetrics(profile);
  const essential = getEssentialExpenses(profile);
  const recommendedTarget = getEmergencyTarget(profile);
  const savingsAccounts = getSavingsAccounts(profile);
  const emergencyGoal = profile.goals.find((goal) => goal.id === "goal_emergency");
  const emergencyProgress = emergencyGoal
    ? Math.min(100, (emergencyGoal.saved / Math.max(1, emergencyGoal.target)) * 100)
    : 0;
  const gapToRecommended = Math.max(0, recommendedTarget - metrics.emergencySavings);
  const surplusPlan = getSurplusPlan(profile);
  const savingsInsights = generateInsights(profile).filter(
    (insight) => insight.category === "savings" || insight.category === "cashflow",
  );
  const history = getCompleteMonths(getMonthlyHistory(profile));
  const latest = history[history.length - 1];
  const checking = profile.accounts.find((account) => account.type === "checking");

  const [modal, setModal] = useState<{ goalId: string; mode: "contribute" | "target" } | null>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [addGoalOpen, setAddGoalOpen] = useState(false);

  const activeGoal = useMemo(
    () => profile.goals.find((goal) => goal.id === modal?.goalId),
    [modal?.goalId, profile.goals],
  );
  const monthlyToTarget = emergencyGoal ? Math.ceil(Math.max(0, emergencyGoal.target - emergencyGoal.saved) / 12) : 0;
  const savingsRate = metrics.savingsRate;

  const openContribute = (goalId: string) => {
    setModal({ goalId, mode: "contribute" });
    setAmount("");
    setError(null);
  };

  const openTarget = (goalId: string) => {
    setModal({ goalId, mode: "target" });
    setAmount(String(profile.goals.find((goal) => goal.id === goalId)?.target ?? ""));
    setError(null);
  };

  const close = () => {
    setModal(null);
    setAmount("");
    setError(null);
  };

  const submit = () => {
    if (!modal) return;
    const value = Number(amount.replace(/[^0-9.]/g, ""));
    const result =
      modal.mode === "contribute" ? contribute(modal.goalId, value) : setGoalTarget(modal.goalId, value);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setToast(result.message);
    close();
    window.setTimeout(() => setToast(null), 4000);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {toast ? (
        <div className="flex items-center justify-between rounded-md border border-mint/20 bg-mint/[0.07] px-4 py-3 text-[12px] text-mint">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> {toast}
          </span>
          <button type="button" onClick={() => setToast(null)} className="text-[10px] text-mint/60 hover:text-mint">
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="relative overflow-hidden p-4 sm:p-5 xl:col-span-7">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-mint/10 text-mint">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="label">Emergency fund</p>
                  <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-white">
                    {metrics.emergencyMonths.toFixed(1)} months of essentials covered
                  </h2>
                </div>
              </div>
              <Badge tone={metrics.emergencyMonths >= 3 ? "mint" : "amber"}>
                {metrics.emergencyMonths >= 3 ? "On target" : "Below target"}
              </Badge>
            </div>

            <div className="mt-5">
              <div className="flex items-end justify-between">
                <p className="num font-display text-[34px] font-semibold leading-none tracking-tight text-white">
                  {formatCurrency(emergencyGoal?.saved ?? metrics.emergencySavings)}
                </p>
                <p className="text-[11px] text-white/40">
                  of {formatCurrency(emergencyGoal?.target ?? recommendedTarget)} goal
                </p>
              </div>
              <Progress value={emergencyProgress} tone="mint" size="lg" className="mt-3" label="Emergency fund progress" />
              <div className="mt-2 flex items-center justify-between text-[10.5px] text-white/35">
                <span>{Math.round(emergencyProgress)}% funded</span>
                <span>{formatCurrency(Math.max(0, (emergencyGoal?.target ?? recommendedTarget) - (emergencyGoal?.saved ?? metrics.emergencySavings)))} remaining</span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="rounded-xl border border-white/[0.06] bg-black/15 p-3">
                <p className="label">Essential expenses</p>
                <p className="num mt-1 text-[13px] font-semibold text-white">{formatCurrency(essential.total)}</p>
                <p className="mt-0.5 text-[9px] text-white/25">per month</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/15 p-3">
                <p className="label">3-month target</p>
                <p className="num mt-1 text-[13px] font-semibold text-white">{formatCurrency(recommendedTarget)}</p>
                <p className="mt-0.5 text-[9px] text-white/25">3 × essentials</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/15 p-3">
                <p className="label">Gap to target</p>
                <p className="num mt-1 text-[13px] font-semibold text-amber">{formatCurrency(gapToRecommended)}</p>
                <p className="mt-0.5 text-[9px] text-white/25">at 3 months</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/15 p-3">
                <p className="label">To close in 12 mo</p>
                <p className="num mt-1 text-[13px] font-semibold text-white">{formatCurrency(monthlyToTarget)}</p>
                <p className="mt-0.5 text-[9px] text-white/25">per month</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => emergencyGoal && openContribute(emergencyGoal.id)}>
                <Plus className="h-3.5 w-3.5" /> Add to emergency fund
              </Button>
              <Button size="sm" variant="secondary" onClick={() => emergencyGoal && openTarget(emergencyGoal.id)}>
                <Target className="h-3.5 w-3.5" /> Edit target
              </Button>
            </div>

            <p className="mt-4 text-[11px] leading-relaxed text-white/35">
              Based on essential expenses of {formatCurrency(essential.total)} a month — housing, utilities, groceries,
              transport, healthcare, insurance and required payments. A three-month target is{" "}
              {formatCurrency(recommendedTarget)}.
            </p>
          </div>
        </Card>

        <div className="space-y-4 xl:col-span-5">
          <Card className="p-5">
            <CardHeader
              title="Where your savings sit"
              description="Keep emergency money liquid and insured."
              action={<TextLink href="/accounts">Manage</TextLink>}
            />
            <div className="mt-3 divide-y divide-white/[0.05]">
              {savingsAccounts.map((account) => (
                <div key={account.id} className="flex items-center gap-3 py-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] text-[9.5px] font-semibold"
                    style={{ backgroundColor: `${account.accent}16`, color: account.accent }}
                  >
                    {account.logo}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-white/85">{account.name}</p>
                    <p className="text-[10px] text-white/30">
                      {account.institution} · {formatPercent(account.apr ?? 0, 2)} APY
                    </p>
                  </div>
                  <p className="num text-[12px] font-semibold text-white">{formatCurrency(account.balance)}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-white/[0.06] pt-3">
              <span className="text-[10.5px] text-white/40">Total savings</span>
              <span className="num text-[13px] font-semibold text-white">{formatCurrency(metrics.totalSavings)}</span>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-300">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[12.5px] font-medium text-white/85">Savings rate</p>
                <p className="text-[10px] text-white/35">Last three complete months</p>
              </div>
            </div>
            <p className="num mt-3 font-display text-[26px] font-semibold tracking-tight text-white">
              {formatPercent(savingsRate, 1)}
            </p>
            <Progress value={Math.min(100, savingsRate * 100)} tone="brand" size="md" className="mt-2" />
            <p className="mt-2 text-[10.5px] text-white/35">
              {formatCurrency(metrics.disposableIncome)} surplus a month. A 20% savings rate is a widely used target for sustainable progress.
            </p>
            {latest ? (
              <p className="mt-2 text-[10px] text-white/25">
                Latest complete month: {formatCurrency(latest.netCashFlow)} net cash flow.
              </p>
            ) : null}
          </Card>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="label">Your goals</p>
            <h2 className="mt-1 font-display text-[17px] font-semibold tracking-tight text-white">
              What you are saving for
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" variant="secondary" onClick={() => setAddGoalOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> New goal
            </Button>
            <Link href="/advisor" className="text-[10.5px] text-violet-300 hover:text-violet-200">
              Ask for a plan
            </Link>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {profile.goals.map((goal) => {
            const progress = Math.min(100, (goal.saved / Math.max(1, goal.target)) * 100);
            const remaining = Math.max(0, goal.target - goal.saved);
            const months = monthsUntil(goal.targetDate);
            return (
              <Card key={goal.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.06]"
                    style={{ backgroundColor: `${goal.color}14`, color: goal.color }}
                  >
                    <GoalIcon icon={goal.icon} className="h-4.5 w-4.5" />
                  </div>
                  <Badge tone={goal.priority === "high" ? "amber" : "neutral"}>
                    {goal.priority === "high" ? "Priority" : goal.priority === "medium" ? "Targeted" : "Optional"}
                  </Badge>
                </div>
                <h3 className="mt-3 font-display text-[15px] font-semibold tracking-tight text-white">{goal.name}</h3>
                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/40">{goal.description}</p>
                <div className="mt-4 flex items-end justify-between">
                  <p className="num font-display text-[22px] font-semibold tracking-tight text-white">
                    {formatCurrency(goal.saved)}
                  </p>
                  <p className="text-[10px] text-white/35">of {formatCurrency(goal.target)}</p>
                </div>
                <Progress value={progress} tone="brand" size="md" className="mt-2.5" />
                <div className="mt-2 flex items-center justify-between text-[10px] text-white/30">
                  <span>{Math.round(progress)}% funded</span>
                  <span>{formatCurrency(remaining)} to go</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/[0.05] pt-3">
                  <div className="flex items-center gap-1 text-[9.5px] text-white/30">
                    <CalendarDays className="h-3 w-3" />
                    {goal.targetDate ? formatDate(goal.targetDate) : "No deadline"}
                    {months ? ` · ${formatCurrency(Math.ceil(remaining / months))}/mo` : ""}
                  </div>
                  <button
                    type="button"
                    onClick={() => openContribute(goal.id)}
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-violet-300 hover:text-violet-200"
                  >
                    Add money <Plus className="h-3 w-3" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => openTarget(goal.id)}
                  className="mt-2 self-start text-[9.5px] text-white/25 transition hover:text-white/60"
                >
                  Edit target
                </button>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="relative overflow-hidden p-4 sm:p-5 xl:col-span-7">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.07] text-violet-300">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="label">How to split your surplus</p>
              <h2 className="mt-1 font-display text-[16px] font-semibold tracking-tight text-white">
                {surplusPlan.headline}
              </h2>
            </div>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-white/50">{surplusPlan.reasoning}</p>

          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            <div className="rounded-xl border border-mint/15 bg-mint/[0.05] p-3.5">
              <div className="flex items-center justify-between">
                <p className="label text-mint/70">Emergency savings</p>
                <ShieldCheck className="h-3.5 w-3.5 text-mint" />
              </div>
              <p className="num mt-2 font-display text-xl font-semibold text-white">
                {formatCurrency(surplusPlan.savingsAmount)}
              </p>
              <p className="mt-0.5 text-[10px] text-white/35">{Math.round(surplusPlan.savingsShare * 100)}% of deployable surplus</p>
            </div>
            <div className="rounded-xl border border-violet-400/15 bg-violet-500/[0.055] p-3.5">
              <div className="flex items-center justify-between">
                <p className="label text-violet-300/70">Extra to {surplusPlan.highestApr?.name ?? "debt"}</p>
                <TrendingUp className="h-3.5 w-3.5 text-violet-300" />
              </div>
              <p className="num mt-2 font-display text-xl font-semibold text-white">
                {formatCurrency(surplusPlan.debtAmount)}
              </p>
              <p className="mt-0.5 text-[10px] text-white/35">
                {surplusPlan.highestApr ? `${formatPercent(surplusPlan.highestApr.apr, 2)} APR` : "After the cushion"}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] text-white/30">
              Deployable surplus: {formatCurrency(surplusPlan.deployable)} of {formatCurrency(surplusPlan.surplus)} total
            </span>
            <Link href="/debt" className="inline-flex items-center gap-1 text-[10.5px] font-medium text-violet-300 hover:text-violet-200">
              Compare payoff impact <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </Card>

        <div className="xl:col-span-5">
          <GamificationPanel />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {profile.preferences.aiAnalysis
          ? savingsInsights.slice(0, 2).map((insight) => <InsightCard key={insight.id} insight={insight} />)
          : null}
      </div>

      <Card className="p-5">
        <p className="label">Essential expenses used for the target</p>
        <div className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
          {essential.breakdown.map((item) => (
            <div key={item.label} className="flex items-center justify-between border-b border-white/[0.04] py-1.5 text-[11px]">
              <span className="text-white/40">{item.label}</span>
              <span className="num text-white/75">{formatCurrency(item.amount)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between py-1.5 text-[11px] font-medium">
            <span className="text-white/60">Monthly essentials</span>
            <span className="num text-white">{formatCurrency(essential.total)}</span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone="neutral">
            Principle · {getPrinciple("savings_emergency_target")?.title}
          </Badge>
          <span className="text-[10px] text-white/25">
            Discretionary categories such as dining and travel are deliberately excluded.
          </span>
        </div>
      </Card>

      <div className="flex items-start gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 text-[10.5px] leading-relaxed text-white/35">
        <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/25" />
        Savings goals are tracked against simulated balances. Moving money here changes the balances in this prototype only. Emergency funds should stay in an insured, accessible account — not an investment you might need to sell at a loss.
      </div>

      <InfoNote icon={<Sparkles className="h-4 w-4" />}>
        Educational guidance only. These targets are based on your connected data and do not account for tax, investment risk or life changes. Talk to a qualified adviser before making large financial decisions.
      </InfoNote>

      <AddGoalDialog
        open={addGoalOpen}
        onClose={() => setAddGoalOpen(false)}
        onAdded={setToast}
      />

      <Modal
        open={Boolean(modal)}
        onClose={close}
        title={modal?.mode === "target" ? "Edit savings target" : `Add to ${activeGoal?.name ?? "goal"}`}
        description={
          modal?.mode === "target"
            ? "Set the amount you are working toward. Progress and projections update immediately."
            : `Money moves from checking${checking ? ` (${formatCurrency(checking.balance)} available)` : ""} into this goal.`
        }
        footer={
          <>
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button onClick={submit}>{modal?.mode === "target" ? "Save target" : "Move money"}</Button>
          </>
        }
      >
        {modal?.mode === "contribute" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {[50, 100, 250, 500].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(String(preset))}
                  className={cn(
                    "rounded-xl border py-2 text-[12px] transition",
                    amount === String(preset)
                      ? "border-violet-400/40 bg-violet-500/10 text-white"
                      : "border-white/[0.08] text-white/50 hover:border-white/20",
                  )}
                >
                  ${preset}
                </button>
              ))}
            </div>
            <div>
              <label className="field-label" htmlFor="contribution">Amount</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-white/35">$</span>
                <input
                  id="contribution"
                  className="field pl-7"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  autoFocus
                />
              </div>
            </div>
            {activeGoal ? (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white/40">Progress after transfer</span>
                  <span className="text-white/70">
                    {formatCurrency(activeGoal.saved)} → {formatCurrency(activeGoal.saved + (Number(amount) || 0))}
                  </span>
                </div>
                <Progress
                  value={Math.min(100, ((activeGoal.saved + (Number(amount) || 0)) / Math.max(1, activeGoal.target)) * 100)}
                  tone="mint"
                  size="sm"
                  className="mt-2"
                />
              </div>
            ) : null}
          </div>
        ) : (
          <div>
            <label className="field-label" htmlFor="targetAmount">Target amount</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-white/35">$</span>
              <input
                id="targetAmount"
                className="field pl-7"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                autoFocus
              />
            </div>
            {activeGoal?.id === "goal_emergency" ? (
              <p className="mt-2 text-[10.5px] text-white/35">
                Our calculated three-month target from your essentials is {formatCurrency(recommendedTarget)}.
              </p>
            ) : null}
          </div>
        )}
        {error ? <p className="mt-3 text-[11px] text-coral">{error}</p> : null}
      </Modal>
    </div>
  );
}
