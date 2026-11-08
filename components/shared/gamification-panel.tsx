"use client";

import Link from "next/link";
import { Check, ChevronRight, Flame, Lock, Star } from "lucide-react";
import { useFinance } from "@/components/providers/finance-provider";
import { getMissionControl } from "@/lib/finance/gamification";
import { achievementIcon } from "@/components/shared/achievement-icon";
import { Poyo } from "@/components/shared/poyo";
import { cn } from "@/lib/utils";
import { Badge, Progress } from "@/components/ui/primitives";

export function GamificationPanel({ compact = false }: { compact?: boolean }) {
  const { profile, toggleChallenge } = useFinance();
  const state = getMissionControl(profile);
  const achievements = compact ? state.achievements.slice(0, 4) : state.achievements;
  const challenges = compact ? state.challenges.slice(0, 2) : state.challenges;
  const nextRank = state.ranks[state.rankIndex + 1];

  return (
    <div className="surface hud-corners relative overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-violet-500/10 blur-2xl" />

      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-violet-300/20 bg-violet-500/10">
            <Poyo size={26} variant="mark" />
            <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-mint ring-2 ring-ink-950" />
          </div>
          <div>
            <h2 className="font-display text-[15px] font-semibold tracking-tight text-white">
              Mission control
            </h2>
            <p className="text-[10.5px] text-white/35">
              {state.unlockedCount} of {state.totalCount} milestones · Lv {state.rankIndex + 1}{" "}
              {state.codename}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="num font-display text-xl font-semibold text-amber">{state.points}</p>
          <p className="text-[9.5px] uppercase tracking-[0.14em] text-white/30">XP</p>
        </div>
      </div>

      {!compact ? (
        <p className="relative mt-3.5 rounded-xl border border-violet-400/10 bg-violet-500/[0.06] px-3 py-2.5 text-[10.5px] leading-relaxed text-white/55">
          <span className="font-semibold text-violet-200">Poyo:</span> {state.briefing}
        </p>
      ) : null}

      <div className="relative mt-4 rounded-2xl border border-white/[0.06] bg-black/20 p-3.5">
        <div className="flex items-center justify-between text-[10.5px] text-white/40">
          <span className="font-semibold uppercase tracking-[0.14em]">Rank progress</span>
          <span className="num">
            {nextRank ? `${state.pointsToNext} XP to ${nextRank.name}` : "Highest rank"}
          </span>
        </div>
        <div className="xp-shimmer mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-400 via-violet-300 to-brand-400"
            style={{ width: `${Math.max(4, state.levelProgress)}%` }}
          />
        </div>
      </div>

      <div
        className={cn(
          "relative mt-4 grid gap-2",
          compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4",
        )}
      >
        {achievements.map((achievement) => {
          const Icon = achievementIcon(achievement.icon);
          return (
            <div
              key={achievement.id}
              title={`${achievement.description} (${achievement.progressLabel})`}
              className={cn(
                "rounded-xl border p-3 transition",
                achievement.unlocked
                  ? "border-mint/20 bg-mint/[0.05]"
                  : "border-white/[0.05] bg-white/[0.02] opacity-75",
              )}
            >
              <div className="flex items-center justify-between">
                <Icon
                  className={cn(
                    "h-4 w-4",
                    achievement.unlocked ? "text-mint" : "text-white/25",
                  )}
                  strokeWidth={1.8}
                />
                {achievement.unlocked ? (
                  <Check className="h-3 w-3 text-mint" />
                ) : (
                  <Lock className="h-3 w-3 text-white/20" />
                )}
              </div>
              <p className="mt-2 line-clamp-2 text-[10.5px] font-medium leading-snug text-white/70">
                {achievement.title}
              </p>
              <Progress
                value={achievement.unlocked ? 100 : achievement.progress}
                tone={achievement.unlocked ? "mint" : "violet"}
                size="sm"
                className="mt-2"
              />
            </div>
          );
        })}
      </div>

      {!compact ? (
        <div className="relative mt-3 grid gap-2 sm:grid-cols-2">
          {state.achievements.slice(4).map((achievement) => {
            const Icon = achievementIcon(achievement.icon) ?? Star;
            return (
              <div
                key={achievement.id}
                className="flex items-center gap-2.5 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5"
              >
                <Icon
                  className={achievement.unlocked ? "h-4 w-4 text-mint" : "h-4 w-4 text-white/25"}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium text-white/65">
                    {achievement.title}
                  </p>
                  <Progress
                    value={achievement.unlocked ? 100 : achievement.progress}
                    size="sm"
                    tone={achievement.unlocked ? "mint" : "violet"}
                    className="mt-1.5"
                  />
                </div>
                {achievement.unlocked ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-mint" />
                ) : (
                  <span className="shrink-0 text-[10px] text-white/25">
                    {Math.round(achievement.progress)}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="relative mt-5">
        <div className="mb-2.5 flex items-center justify-between">
          <p className="label">Active missions</p>
          <span className="flex items-center gap-1 text-[10px] text-white/30">
            <Flame className="h-3 w-3 text-amber/70" />
            {state.completedChallenges} complete
          </span>
        </div>
        <div className="space-y-2">
          {challenges.map((challenge) => (
            <div
              key={challenge.id}
              className={cn(
                "rounded-xl border p-3",
                challenge.complete
                  ? "border-mint/20 bg-mint/[0.04]"
                  : "border-white/[0.06] bg-white/[0.025]",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11.5px] font-medium leading-snug text-white/85">
                    {challenge.title}
                  </p>
                  <p className="mt-0.5 text-[10px] text-white/35">{challenge.target}</p>
                </div>
                <Badge tone={challenge.complete ? "mint" : "neutral"} className="shrink-0">
                  {challenge.complete ? "Complete" : `+${challenge.reward} XP`}
                </Badge>
              </div>
              <Progress
                value={challenge.progress}
                tone={challenge.complete ? "mint" : challenge.tone}
                size="sm"
                className="mt-2"
              />
              <div className="mt-2.5 flex items-center justify-between">
                <span className="text-[10px] text-white/35">{challenge.statusLabel}</span>
                <button
                  type="button"
                  onClick={() => toggleChallenge(challenge.id)}
                  className="text-[10px] font-medium text-violet-300 transition hover:text-violet-200"
                >
                  {challenge.enrolled ? "Leave" : "Join"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Link
        href="/progress"
        className="relative mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-violet-400/15 bg-violet-500/[0.05] py-2 text-[11px] font-medium text-violet-200 transition hover:border-violet-300/30 hover:bg-violet-500/[0.1]"
      >
        Open mission control <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
