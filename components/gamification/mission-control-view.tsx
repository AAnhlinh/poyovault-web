"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  Flame,
  Lock,
  Radar,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { useFinance } from "@/components/providers/finance-provider";
import {
  getMissionControl,
  type Achievement,
  type Challenge,
  type RankStep,
} from "@/lib/finance/gamification";
import { achievementIcon } from "@/components/shared/achievement-icon";
import { Poyo } from "@/components/shared/poyo";
import { Badge, Button, Progress } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const OBJECTIVE_HREF: Record<string, string> = {
  first_500: "/savings",
  emergency_25: "/savings",
  positive_cashflow: "/spending",
  utilization_control: "/debt",
  savings_rate: "/spending",
  emergency_3mo: "/savings",
  subscription_audit: "/spending",
  goal_momentum: "/savings",
};

function Stat({
  label,
  value,
  hint,
  tone = "violet",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "violet" | "mint" | "brand";
}) {
  const tones = {
    violet: "text-violet-200",
    mint: "text-mint",
    brand: "text-brand-300",
  } as const;

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-black/20 px-3.5 py-3">
      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/35">
        {label}
      </p>
      <p className={cn("num mt-1.5 font-display text-[20px] font-semibold leading-none", tones[tone])}>
        {value}
      </p>
      <p className="mt-1.5 text-[9.5px] leading-snug text-white/30">{hint}</p>
    </div>
  );
}

function MilestoneCard({ achievement }: { achievement: Achievement }) {
  const Icon = achievementIcon(achievement.icon);

  return (
    <div
      className={cn(
        "hud-bracket relative overflow-hidden rounded-2xl border p-3.5 transition duration-300",
        achievement.unlocked
          ? "border-mint/20 bg-gradient-to-br from-mint/[0.08] via-white/[0.02] to-transparent"
          : "border-white/[0.07] bg-white/[0.025] hover:border-violet-300/20",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl border",
            achievement.unlocked
              ? "border-mint/25 bg-mint/10 text-mint"
              : "border-white/[0.08] bg-white/[0.04] text-white/30",
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={1.8} />
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold",
            achievement.unlocked
              ? "border-mint/25 bg-mint/10 text-mint"
              : "border-white/10 bg-white/[0.04] text-white/35",
          )}
        >
          {achievement.unlocked ? (
            <>
              <Check className="h-2.5 w-2.5" /> +{achievement.points}
            </>
          ) : (
            <>+{achievement.points} XP</>
          )}
        </span>
      </div>
      <p className="mt-2.5 text-[12px] font-semibold leading-snug text-white/85">
        {achievement.title}
      </p>
      <p className="mt-1 line-clamp-2 text-[10.5px] leading-relaxed text-white/40">
        {achievement.description}
      </p>
      <Progress
        value={achievement.unlocked ? 100 : achievement.progress}
        tone={achievement.unlocked ? "mint" : "violet"}
        size="sm"
        className="mt-3"
        label={`${achievement.title} progress`}
      />
      <div className="mt-1.5 flex items-center justify-between gap-2 text-[9.5px] text-white/30">
        <span className="truncate">{achievement.progressLabel}</span>
        <span className={achievement.unlocked ? "text-mint" : undefined}>
          {achievement.unlocked ? "Unlocked" : `${Math.round(achievement.progress)}%`}
        </span>
      </div>
    </div>
  );
}

function RankRow({ rank, last }: { rank: RankStep; last: boolean }) {
  return (
    <div className="relative flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "mt-1 flex h-3 w-3 shrink-0 items-center justify-center rounded-full border",
            rank.state === "current" &&
              "border-violet-300 bg-violet-400 shadow-[0_0_0_4px_rgba(139,92,246,0.15)]",
            rank.state === "done" && "border-mint/60 bg-mint/70",
            rank.state === "locked" && "border-white/20 bg-ink-900",
          )}
        />
        {!last ? <span className="mt-1.5 w-px flex-1 bg-white/[0.08]" /> : null}
      </div>
      <div className={cn("flex-1", last ? "pb-0" : "pb-4")}>
        <div className="flex items-baseline justify-between gap-2">
          <p
            className={cn(
              "text-[11.5px] font-semibold",
              rank.state === "current" ? "text-white" : "text-white/60",
            )}
          >
            {rank.name}
            <span className="ml-1.5 font-normal text-white/30">{rank.codename}</span>
          </p>
          <span className="num shrink-0 text-[10px] text-white/30">{rank.min} XP</span>
        </div>
        <p className="mt-0.5 text-[9.5px] text-white/30">
          {rank.state === "current"
            ? "You are here"
            : rank.state === "done"
              ? "Rank cleared"
              : `Unlocks at ${rank.min} points`}
        </p>
      </div>
    </div>
  );
}

function ChallengeCard({
  challenge,
  onToggle,
}: {
  challenge: Challenge;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        "hud-bracket relative overflow-hidden rounded-2xl border p-4",
        challenge.complete
          ? "border-mint/20 bg-mint/[0.04]"
          : "border-white/[0.07] bg-white/[0.025]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-semibold leading-snug text-white/85">{challenge.title}</p>
        <Badge tone={challenge.complete ? "mint" : challenge.enrolled ? "violet" : "neutral"} className="shrink-0">
          {challenge.enrolled ? `+${challenge.reward} XP` : "Open"}
        </Badge>
      </div>
      <p className="mt-1.5 line-clamp-2 text-[10.5px] leading-relaxed text-white/40">
        {challenge.description}
      </p>
      <Progress
        value={challenge.progress}
        tone={challenge.complete ? "mint" : challenge.tone}
        size="sm"
        className="mt-3"
        label={`${challenge.title} progress`}
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[10px] text-white/35">{challenge.target}</span>
        <span className="text-[10px] font-medium text-white/40">{challenge.statusLabel}</span>
      </div>
      <Button
        variant={challenge.enrolled ? "ghost" : "outline"}
        size="sm"
        className="mt-3 w-full"
        onClick={onToggle}
      >
        {challenge.enrolled ? "Leave mission" : challenge.complete ? "Completed — join again" : "Join mission"}
      </Button>
    </div>
  );
}

export function MissionControlView() {
  const { profile, toggleChallenge } = useFinance();
  const state = getMissionControl(profile);
  const rank = state.ranks[state.rankIndex];
  const nextRank = state.ranks[state.rankIndex + 1];
  const earned = state.xp.fromAchievements + state.xp.fromChallenges;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-[9.5px] font-semibold uppercase tracking-[0.22em] text-violet-200/70">
              <span className="terminal-dot h-1.5 w-1.5 rounded-full bg-mint" />
              Poyo online · mission control
            </div>
            <h1 className="mt-3 font-display text-[24px] font-bold leading-tight tracking-tight text-white sm:text-[28px]">
              Level {state.rankIndex + 1} · {state.codename}
            </h1>
            <p className="mt-2 max-w-lg text-[12.5px] leading-relaxed text-white/50">
              {state.briefing}
            </p>

            <div className="mt-5 rounded-2xl border border-white/[0.07] bg-black/20 p-3.5">
              <div className="flex items-center justify-between gap-3 text-[10px]">
                <span className="font-semibold uppercase tracking-[0.14em] text-white/45">
                  Rank progress
                </span>
                <span className="num text-white/45">
                  {nextRank
                    ? `${state.pointsToNext} XP to ${nextRank.name}`
                    : "Highest rank reached"}
                </span>
              </div>
              <div className="xp-shimmer mt-2.5 h-2 overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-400 via-violet-300 to-brand-400"
                  style={{ width: `${Math.max(4, state.levelProgress)}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[9.5px] text-white/30">
                <span>
                  {rank?.name} · {rank?.min} XP
                </span>
                <span className="num text-amber">{state.points} XP earned</span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <Stat
                label="Milestones"
                value={`${state.unlockedCount}/${state.totalCount}`}
                hint="Lifetime achievements"
                tone="mint"
              />
              <Stat
                label="Missions"
                value={`${state.completedChallenges}/${state.challenges.length}`}
                hint="Challenges completed"
                tone="brand"
              />
              <Stat
                label="Streak"
                value={`${state.streakMonths} mo`}
                hint="Positive cash flow"
              />
            </div>
          </div>

          <div className="relative flex flex-col items-center justify-center gap-4 py-2">
            <div className="relative flex h-[178px] w-[178px] items-center justify-center">
              <div className="rank-orbit pointer-events-none absolute inset-0 rounded-full" />
              <div className="absolute inset-[13px] rounded-full border border-violet-300/15" />
              <div className="absolute inset-[26px] rounded-full border border-dashed border-white/[0.09]" />
              <div className="absolute inset-[30px] rounded-full bg-violet-500/[0.08] blur-xl" />
              <Poyo size={112} className="relative" />
              <span className="absolute -bottom-1 rounded-full border border-violet-300/25 bg-ink-950/90 px-2.5 py-1 text-[8.5px] font-semibold uppercase tracking-[0.22em] text-violet-200/80">
                Poyo
              </span>
              <span className="absolute left-1 top-4 h-1 w-1 rounded-full bg-brand-300/70" />
              <span className="absolute bottom-6 right-0 h-1 w-1 rounded-full bg-violet-300/60" />
            </div>
            <div className="text-center">
              <p className="flex items-center justify-center gap-1.5 text-[10px] font-medium text-white/55">
                <Flame className="h-3 w-3 text-amber" />
                {state.streakMonths > 0
                  ? `${state.streakMonths} month streak · ${state.positiveMonths}/${state.monthsTracked} positive`
                  : `${state.positiveMonths}/${state.monthsTracked} positive months tracked`}
              </p>
              <p className="mt-1 text-[9.5px] text-white/25">
                Companion on every page · no cash value
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Next objectives */}
      <section>
        <div className="mb-2.5 flex flex-wrap items-end justify-between gap-2">
          <div className="flex items-center gap-2">
            <Radar className="h-4 w-4 text-violet-300" strokeWidth={1.8} />
            <h2 className="font-display text-[15px] font-semibold tracking-tight text-white">
              Next objectives
            </h2>
          </div>
          <p className="text-[10px] text-white/30">Closest milestones first</p>
        </div>
        {state.objectives.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {state.objectives.map((objective, index) => {
              const Icon = achievementIcon(objective.icon);
              const href = OBJECTIVE_HREF[objective.id] ?? "/savings";
              return (
                <Link
                  key={objective.id}
                  href={href}
                  className="hud-bracket group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 transition duration-300 hover:border-violet-300/25 hover:bg-white/[0.05]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-violet-200/50">
                      Objective {String(index + 1).padStart(2, "0")}
                    </span>
                    <Icon className="h-4 w-4 text-violet-300/80" strokeWidth={1.8} />
                  </div>
                  <p className="mt-2.5 text-[12.5px] font-semibold leading-snug text-white/90">
                    {objective.title}
                  </p>
                  <p className="mt-1 text-[10.5px] text-white/40">{objective.progressLabel}</p>
                  <Progress value={objective.progress} tone="violet" size="sm" className="mt-3" />
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="rounded-full border border-amber/20 bg-amber/[0.07] px-2 py-0.5 text-[9px] font-semibold text-amber">
                      +{objective.points} XP
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-violet-300 transition group-hover:text-violet-200">
                      Open <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-mint/20 bg-mint/[0.05] px-4 py-6 text-center">
            <Sparkles className="mx-auto h-5 w-5 text-mint" />
            <p className="mt-2 text-[12.5px] font-semibold text-white/85">
              Every milestone is unlocked
            </p>
            <p className="mt-1 text-[11px] text-white/40">
              Poyo suggests keeping the streak alive and revisiting your goals.
            </p>
          </div>
        )}
      </section>

      <div className="grid gap-4 xl:grid-cols-12">
        {/* Milestones */}
        <section className="surface p-5 sm:p-6 xl:col-span-7">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-[16px] font-semibold tracking-tight text-white">
                Milestones
              </h2>
              <p className="mt-1 text-[11.5px] text-white/40">
                {state.unlockedCount} of {state.totalCount} unlocked · earned from your real numbers
              </p>
            </div>
            <Badge tone="violet">{earned} / {state.xp.possible} XP</Badge>
          </div>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {state.achievements.map((achievement) => (
              <MilestoneCard key={achievement.id} achievement={achievement} />
            ))}
          </div>
        </section>

        <div className="space-y-4 xl:col-span-5">
          {/* Rank ladder */}
          <section className="surface p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber" strokeWidth={1.8} />
              <h2 className="font-display text-[15px] font-semibold tracking-tight text-white">
                Rank ladder
              </h2>
            </div>
            <p className="mt-1 text-[11px] text-white/35">
              Rank is cosmetic. It never changes your score or borrowing power.
            </p>
            <div className="mt-4">
              {state.ranks.map((entry, index) => (
                <RankRow
                  key={entry.name}
                  rank={entry}
                  last={index === state.ranks.length - 1}
                />
              ))}
            </div>
          </section>

          {/* XP ledger */}
          <section className="surface p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-brand-300" strokeWidth={1.8} />
              <h2 className="font-display text-[15px] font-semibold tracking-tight text-white">
                XP ledger
              </h2>
            </div>
            <div className="mt-3 space-y-1.5">
              {[
                { label: "Milestones unlocked", value: state.xp.fromAchievements, tone: "text-mint" },
                { label: "Missions completed", value: state.xp.fromChallenges, tone: "text-brand-300" },
                { label: "Still available", value: Math.max(0, state.xp.possible - earned), tone: "text-white/45" },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2"
                >
                  <span className="text-[11px] text-white/50">{row.label}</span>
                  <span className={`num text-[12px] font-semibold ${row.tone}`}>
                    {row.value} XP
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-[9.5px] leading-relaxed text-white/25">
              <Lock className="mt-0.5 h-3 w-3 shrink-0" />
              Points are motivation only. They are not currency, not a credit score and cannot be
              redeemed for cash.
            </p>
          </section>
        </div>
      </div>

      {/* Missions */}
      <section className="surface p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-[16px] font-semibold tracking-tight text-white">
              Active missions
            </h2>
            <p className="mt-1 text-[11.5px] text-white/40">
              Optional monthly challenges. Join one, or none — Poyo keeps score either way.
            </p>
          </div>
          <span className="text-[10px] text-white/30">
            {state.completedChallenges} of {state.challenges.length} complete
          </span>
        </div>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {state.challenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              onToggle={() => toggleChallenge(challenge.id)}
            />
          ))}
        </div>
      </section>

      <p className="px-1 text-[9.5px] leading-relaxed text-white/20">
        Mission control is part of the PoyoVault prototype. Progress is calculated from simulated
        account data and stored with your demo session. Nothing here affects real accounts.
      </p>
    </div>
  );
}
