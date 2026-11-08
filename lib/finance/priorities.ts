import type { FinancialProfile } from "../types";
import {
  getActiveSubscriptions,
  getCompleteMonths,
  getDashboardMetrics,
  getMonthlyHistory,
  getSubscriptionMonthlyTotal,
} from "./aggregate";
import { comparePayoffStrategies } from "./debt";
import { formatCurrency, formatPercent } from "./format";

export interface PoyoMove {
  id: string;
  step: string;
  title: string;
  detail: string;
  impact?: string;
  href: string;
  action: string;
  question: string;
  tone: "critical" | "important" | "good";
}

export interface PoyoPlan {
  moves: PoyoMove[];
  holdOff: { title: string; detail: string; question: string } | null;
  summary: string;
}

/**
 * The order of operations, written the way a person would say it.
 * Everything is derived from the same deterministic profile as the rest of
 * the app — no separate advice engine, no random ranking.
 */
export function buildPoyoPlan(profile: FinancialProfile): PoyoPlan {
  const metrics = getDashboardMetrics(profile);
  const comparison = comparePayoffStrategies(profile, 150, "consumer");
  const debts = [...comparison.debts].sort((a, b) => b.apr - a.apr);
  const highest = debts[0];
  const cheapest = debts[debts.length - 1];
  const cheaper = highest && cheapest && cheapest.id !== highest.id ? cheapest : undefined;

  const history = getCompleteMonths(getMonthlyHistory(profile));
  const latest = history[history.length - 1];
  const previous = history[history.length - 2];
  const dining = latest?.byCategory.dining ?? 0;
  const diningPrevious = previous?.byCategory.dining ?? 0;
  const diningDelta = dining - diningPrevious;

  const subscriptions = getActiveSubscriptions(profile);
  const subscriptionTotal = getSubscriptionMonthlyTotal(profile);
  const moves: PoyoMove[] = [];

  if (highest && highest.balance > 0) {
    const monthlyInterest = highest.balance * (highest.apr / 12);
    moves.push({
      id: "debt-first",
      step: "Do this first",
      title: `Pay the ${highest.name} first`,
      detail: `${formatCurrency(highest.balance)} at ${formatPercent(
        highest.apr,
        2,
      )} costs about ${formatCurrency(monthlyInterest)} in interest every month.${
        cheaper
          ? ` Keep the ${cheaper.name} on its normal payment for now — at ${formatPercent(
              cheaper.apr,
              2,
            )}, it's the cheaper debt to carry.`
          : ""
      }`,
      impact:
        comparison.interestSaved > 0
          ? `$150 extra saves about ${formatCurrency(comparison.interestSaved)} in interest`
          : undefined,
      href: "/debt",
      action: "See the payoff order",
      question: `Why should I pay the ${highest.name} before the ${
        cheaper?.name ?? "other debts"
      }?`,
      tone: "critical",
    });
  }

  const emergencyGap = Math.max(0, metrics.emergencyTarget - metrics.emergencySavings);
  if (emergencyGap > 0) {
    const monthsAt250 = Math.ceil(emergencyGap / 250);
    moves.push({
      id: "emergency-second",
      step: "Then do this",
      title: "Get three months of essentials set aside",
      detail: `You have ${formatCurrency(metrics.emergencySavings)}, about ${metrics.emergencyMonths.toFixed(
        1,
      )} months. Three months is ${formatCurrency(metrics.emergencyTarget)}, so you're ${formatCurrency(
        emergencyGap,
      )} short. At $250 a month that's about ${monthsAt250} months — and it means a surprise bill doesn't land on the card.`,
      href: "/savings",
      action: "Open savings",
      question: "How much emergency savings do I need, and where should I keep it?",
      tone: "important",
    });
  }

  if (diningDelta > 15) {
    const cut = Math.min(60, Math.max(20, Math.round(diningDelta / 10) * 10));
    moves.push({
      id: "dining",
      step: "Trim one thing",
      title: "You're spending too much on takeout",
      detail: `Restaurants came to ${formatCurrency(
        dining,
      )} last month, ${formatCurrency(diningDelta)} more than the month before. Cutting about ${formatCurrency(
        cut,
      )} a month keeps ${formatCurrency(cut * 12)} a year.`,
      impact: `${formatCurrency(cut)} a month`,
      href: "/spending",
      action: "See where it went",
      question: "Where am I spending too much, and what should I cut?",
      tone: "important",
    });
  } else if (subscriptions.length >= 3) {
    const cut = Math.max(5, Math.round((subscriptionTotal * 0.2) / 5) * 5);
    moves.push({
      id: "subscriptions",
      step: "Trim one thing",
      title: `${subscriptions.length} subscriptions are adding up`,
      detail: `${subscriptions
        .slice(0, 3)
        .map((subscription) => subscription.merchant)
        .join(", ")} and ${Math.max(
        0,
        subscriptions.length - 3,
      )} more cost ${formatCurrency(
        subscriptionTotal,
      )} a month. Cancel the ones you barely use and keep about ${formatCurrency(
        cut * 12,
      )} a year.`,
      href: "/spending",
      action: "Review subscriptions",
      question: "Which subscriptions should I cancel first?",
      tone: "important",
    });
  }

  const holdOff =
    metrics.emergencyMonths < 3
      ? {
          title: "Hold off on investing extra for now",
          detail:
            "Your cushion is below three months. Investing before it's funded means selling at the wrong time — or reaching for a card — when something breaks.",
          question: "Should I invest or build my emergency fund first?",
        }
      : cheaper && highest && cheaper.apr < highest.apr
        ? {
            title: `Don't rush to pay off the ${cheaper.name}`,
            detail: `At ${formatPercent(
              cheaper.apr,
              2,
            )} it costs less than the card. Keep its normal payment and send every extra dollar to the ${
              highest.name
            } instead.`,
            question: `Should I pay extra on the ${cheaper.name} or the ${highest.name}?`,
          }
        : {
            title: "Hold off on new monthly commitments",
            detail:
              "Your budget works because fixed costs are low. A new subscription or financed purchase is the quickest way to undo that.",
            question: "Can I afford a new monthly expense?",
          };

  const summary =
    moves.length > 0
      ? `${moves[0].title}. That's the one that matters most this month.`
      : "Nothing urgent. Keep the automatic payments and savings transfers running.";

  return { moves: moves.slice(0, 3), holdOff, summary };
}

export function buildPoyoGreeting(profile: FinancialProfile) {
  const plan = buildPoyoPlan(profile);
  const name = profile.customer.name.split(" ")[0] ?? "there";
  const first = plan.moves[0];

  if (!first) {
    return `Hi ${name}. Everything looks steady right now. Ask me about your accounts, spending or the next few months.`;
  }

  return `Hi ${name}. Here's the short version: ${first.title}. ${
    plan.holdOff ? `${plan.holdOff.title}.` : ""
  } Want me to explain?`;
}
