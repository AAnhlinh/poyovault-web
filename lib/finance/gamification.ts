import type { FinancialProfile } from "../types";
import {
  getCurrentMonth,
  getDashboardMetrics,
  getEmergencyTarget,
  getMonthlyHistory,
  getCompleteMonths,
} from "./aggregate";
import { clamp, formatCurrency, formatPercent, monthKey } from "./format";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: "piggy" | "shield" | "trending" | "credit" | "sparkles" | "target" | "trophy" | "calendar";
  points: number;
  progress: number;
  unlocked: boolean;
  progressLabel: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  reward: number;
  progress: number;
  target: string;
  enrolled: boolean;
  complete: boolean;
  statusLabel: string;
  tone: "mint" | "brand" | "violet" | "amber";
}

export interface GamificationState {
  achievements: Achievement[];
  challenges: Challenge[];
  points: number;
  level: string;
  nextLevel?: { name: string; points: number };
  unlockedCount: number;
  totalCount: number;
  completedChallenges: number;
  monthlyMomentum: number;
}

const LEVELS = [
  { name: "Bronze", codename: "Scout", min: 0 },
  { name: "Silver", codename: "Navigator", min: 150 },
  { name: "Gold", codename: "Commander", min: 300 },
  { name: "Platinum", codename: "Architect", min: 500 },
];

export function getAchievements(profile: FinancialProfile): Achievement[] {
  const metrics = getDashboardMetrics(profile);
  const target = getEmergencyTarget(profile);
  const bestGoalProgress = Math.max(
    0,
    ...profile.goals.map((goal) => (goal.target > 0 ? goal.saved / goal.target : 0)),
  );
  const emergencyProgress = target > 0 ? metrics.emergencySavings / target : 0;
  const cancelled = profile.preferences.cancelledSubscriptions.length;

  const achievements: Achievement[] = [
    {
      id: "first_500",
      title: "First $500 saved",
      description: "Build a $500 savings base before anything else.",
      icon: "piggy",
      points: 50,
      progress: clamp((metrics.totalSavings / 500) * 100),
      unlocked: metrics.totalSavings >= 500,
      progressLabel: `${formatCurrency(Math.min(metrics.totalSavings, 500))} of $500`,
    },
    {
      id: "emergency_25",
      title: "A quarter of the way",
      description: "Reach 25% of your three-month emergency target.",
      icon: "shield",
      points: 80,
      progress: clamp((emergencyProgress / 0.25) * 100),
      unlocked: emergencyProgress >= 0.25,
      progressLabel: `${formatPercent(emergencyProgress, 0)} of target`,
    },
    {
      id: "positive_cashflow",
      title: "Positive cash flow",
      description: "End the month with more coming in than going out.",
      icon: "trending",
      points: 60,
      progress: clamp((metrics.savingsRate / 0.1) * 100),
      unlocked: metrics.disposableIncome > 0,
      progressLabel: `${formatPercent(metrics.savingsRate, 0)} savings rate`,
    },
    {
      id: "utilization_control",
      title: "Keep card use under 30%",
      description: "Keep credit card utilization at or below 30%.",
      icon: "credit",
      points: 70,
      progress: clamp(((0.5 - metrics.utilization) / 0.2) * 100),
      unlocked: metrics.utilization <= 0.3,
      progressLabel: `${formatPercent(metrics.utilization, 0)} utilization`,
    },
    {
      id: "savings_rate",
      title: "20% savings rate",
      description: "Keep at least 20% of take-home income unspent.",
      icon: "target",
      points: 90,
      progress: clamp((metrics.savingsRate / 0.2) * 100),
      unlocked: metrics.savingsRate >= 0.2,
      progressLabel: `${formatPercent(metrics.savingsRate, 0)} of income`,
    },
    {
      id: "emergency_3mo",
      title: "Three-month cushion",
      description: "Fully fund three months of essential expenses.",
      icon: "shield",
      points: 100,
      progress: clamp((metrics.emergencyMonths / 3) * 100),
      unlocked: metrics.emergencyMonths >= 3,
      progressLabel: `${metrics.emergencyMonths.toFixed(1)} of 3 months`,
    },
    {
      id: "subscription_audit",
      title: "Cancel one subscription",
      description: "Cancel at least one subscription you no longer use.",
      icon: "sparkles",
      points: 45,
      progress: cancelled > 0 ? 100 : 0,
      unlocked: cancelled > 0,
      progressLabel: cancelled > 0 ? `${cancelled} cancelled` : "Not started",
    },
    {
      id: "goal_momentum",
      title: "Halfway to a goal",
      description: "Reach 50% of any savings goal.",
      icon: "trophy",
      points: 40,
      progress: clamp((bestGoalProgress / 0.5) * 100),
      unlocked: bestGoalProgress >= 0.5,
      progressLabel: `${formatPercent(bestGoalProgress, 0)} of best goal`,
    },
  ];

  return achievements;
}

export function getChallenges(profile: FinancialProfile): Challenge[] {
  const current = getCurrentMonth(profile);
  const target = getEmergencyTarget(profile);
  const emergencyGoal = profile.goals.find((goal) => goal.id === "goal_emergency");
  const emergencyProgress = target > 0 ? (emergencyGoal?.saved ?? 0) / target : 0;
  const diningSpend = current?.byCategory.dining ?? 0;
  const diningBudget = profile.preferences.diningBudget;
  const diningRatio = diningBudget > 0 ? diningSpend / diningBudget : 0;
  const cancelled = profile.preferences.cancelledSubscriptions.length;
  const today = new Date(profile.asOf);
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysElapsed = today.getDate();
  const pace = diningSpend / Math.max(1, daysElapsed) / (diningBudget / daysInMonth);
  const enrolled = (id: string) => profile.preferences.enrolledChallenges.includes(id);

  return [
    {
      id: "challenge_dining",
      title: `Keep dining under ${formatCurrency(diningBudget)}`,
      description:
        "Stay inside a self-selected restaurant and takeout budget for the calendar month.",
      reward: 100,
      progress: clamp(diningRatio * 100),
      target: `${formatCurrency(diningSpend)} spent of ${formatCurrency(diningBudget)}`,
      enrolled: enrolled("challenge_dining"),
      complete: false,
      statusLabel:
        diningSpend > diningBudget
          ? "Over budget"
          : pace > 1.15
            ? "Slightly ahead of pace"
            : "On pace",
      tone: "amber",
    },
    {
      id: "challenge_subscriptions",
      title: "Cancel one unused subscription",
      description:
        "Review recurring charges and cancel anything you have not used in the last 30 days.",
      reward: 60,
      progress: cancelled > 0 ? 100 : 0,
      target: cancelled > 0 ? "Completed this month" : "0 of 1 cancelled",
      enrolled: enrolled("challenge_subscriptions"),
      complete: cancelled > 0,
      statusLabel: cancelled > 0 ? "Complete" : "Not started",
      tone: "violet",
    },
    {
      id: "challenge_emergency",
      title: "Reach 60% of your cushion",
      description:
        "A shorter milestone on the way to a full three-month emergency fund.",
      reward: 150,
      progress: clamp((emergencyProgress / 0.6) * 100),
      target: `${formatPercent(emergencyProgress, 0)} of target · 60% goal`,
      enrolled: enrolled("challenge_emergency"),
      complete: emergencyProgress >= 0.6,
      statusLabel: emergencyProgress >= 0.6 ? "Complete" : "In progress",
      tone: "brand",
    },
  ];
}

export function getGamification(profile: FinancialProfile): GamificationState {
  const achievements = getAchievements(profile);
  const challenges = getChallenges(profile);
  const achievementPoints = achievements
    .filter((achievement) => achievement.unlocked)
    .reduce((sum, achievement) => sum + achievement.points, 0);
  const challengePoints = challenges
    .filter((challenge) => challenge.complete && challenge.enrolled)
    .reduce((sum, challenge) => sum + challenge.reward, 0);
  const points = achievementPoints + challengePoints;
  const level = [...LEVELS].reverse().find((entry) => points >= entry.min) ?? LEVELS[0];
  const nextLevel = LEVELS.find((entry) => entry.min > points);
  const history = getCompleteMonths(getMonthlyHistory(profile));
  const positiveMonths = history.filter((month) => month.netCashFlow > 0).length;
  const monthlyMomentum = Math.round(
    (positiveMonths / Math.max(1, history.length)) * 100 + points / 20,
  );

  return {
    achievements,
    challenges,
    points,
    level: level.name,
    nextLevel: nextLevel ? { name: nextLevel.name, points: nextLevel.min } : undefined,
    unlockedCount: achievements.filter((achievement) => achievement.unlocked).length,
    totalCount: achievements.length,
    completedChallenges: challenges.filter((challenge) => challenge.complete).length,
    monthlyMomentum,
  };
}

export interface RankStep {
  name: string;
  codename: string;
  min: number;
  state: "done" | "current" | "locked";
}

export interface MissionControlState extends GamificationState {
  rankIndex: number;
  codename: string;
  ranks: RankStep[];
  levelProgress: number;
  pointsToNext: number;
  xp: { fromAchievements: number; fromChallenges: number; possible: number };
  streakMonths: number;
  monthsTracked: number;
  positiveMonths: number;
  objectives: Achievement[];
  briefing: string;
}

export function getMissionControl(profile: FinancialProfile): MissionControlState {
  const base = getGamification(profile);
  const fromAchievements = base.achievements
    .filter((achievement) => achievement.unlocked)
    .reduce((sum, achievement) => sum + achievement.points, 0);
  const fromChallenges = base.challenges
    .filter((challenge) => challenge.complete && challenge.enrolled)
    .reduce((sum, challenge) => sum + challenge.reward, 0);
  const possible =
    base.achievements.reduce((sum, achievement) => sum + achievement.points, 0) +
    base.challenges.reduce((sum, challenge) => sum + challenge.reward, 0);

  const rankIndex = Math.max(
    0,
    LEVELS.findIndex((entry) => entry.name === base.level),
  );
  const current = LEVELS[rankIndex] ?? LEVELS[0];
  const next = LEVELS[rankIndex + 1];
  const span = next ? next.min - current.min : 1;
  const levelProgress = next
    ? clamp(((base.points - current.min) / Math.max(1, span)) * 100)
    : 100;

  const history = getCompleteMonths(getMonthlyHistory(profile));
  let streakMonths = 0;
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (history[index].netCashFlow > 0) streakMonths += 1;
    else break;
  }

  const objectives = base.achievements
    .filter((achievement) => !achievement.unlocked)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 3);
  const lead = objectives[0];
  const briefing = lead
    ? lead.progress > 0
      ? `Closest win: ${lead.title.toLowerCase()} (${lead.progressLabel.toLowerCase()}). Worth ${lead.points} XP.`
      : `Next win: ${lead.title.toLowerCase()}. Worth ${lead.points} XP.`
    : `Every milestone is unlocked. You've had ${streakMonths} month${streakMonths === 1 ? "" : "s"} in a row where income beat spending.`;

  return {
    ...base,
    rankIndex,
    codename: current.codename,
    ranks: LEVELS.map((entry, index) => ({
      name: entry.name,
      codename: entry.codename,
      min: entry.min,
      state: index < rankIndex ? "done" : index === rankIndex ? "current" : "locked",
    })),
    levelProgress,
    pointsToNext: next ? next.min - base.points : 0,
    xp: { fromAchievements, fromChallenges, possible },
    streakMonths,
    monthsTracked: history.length,
    positiveMonths: history.filter((month) => month.netCashFlow > 0).length,
    objectives,
    briefing,
  };
}

export function getMonthProgress(profile: FinancialProfile) {
  const now = new Date(profile.asOf);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return {
    monthKey: monthKey(now),
    daysElapsed: now.getDate(),
    daysInMonth,
    percent: Math.round((now.getDate() / daysInMonth) * 100),
  };
}
