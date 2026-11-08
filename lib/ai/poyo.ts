import type { FinancialProfile } from "../types";
import { buildPoyoPlan } from "../finance/priorities";
import { getDashboardMetrics } from "../finance/aggregate";
import { computeHealthScore } from "../finance/score";
import { formatCurrency } from "../finance/format";

export interface PoyoAnswer {
  content: string;
  suggestions: string[];
}

/**
 * Short, conversational answers for the Poyo popover.
 * The full advisor keeps the long-form detail; this stays to two or three
 * sentences so it fits beside the recommendation that prompted it.
 */
export function answerPoyo(question: string, profile: FinancialProfile): PoyoAnswer {
  const q = question.toLowerCase();
  const plan = buildPoyoPlan(profile);
  const metrics = getDashboardMetrics(profile);
  const debtMove = plan.moves.find((move) => move.id === "debt-first");
  const emergencyMove = plan.moves.find((move) => move.id === "emergency-second");
  const spendingMove = plan.moves.find(
    (move) => move.id === "dining" || move.id === "subscriptions",
  );

  if (/(why|first|before|debt|card|loan|interest|pay off|payoff|order)/.test(q) && debtMove) {
    return {
      content: `${debtMove.title}. ${debtMove.detail}${
        plan.holdOff ? ` ${plan.holdOff.title}.` : ""
      }`,
      suggestions: [
        "What should I hold off on?",
        "How much interest am I paying?",
        "Where am I overspending?",
      ],
    };
  }

  if (/(hold off|wait|invest|priorit|instead)/.test(q) && plan.holdOff) {
    return {
      content: `${plan.holdOff.title}. ${plan.holdOff.detail}`,
      suggestions: [
        "Why does the card come first?",
        "How much emergency savings do I need?",
        "Can I afford a $400 purchase?",
      ],
    };
  }

  if (/(emergency|cushion|rainy|savings)/.test(q) && emergencyMove) {
    return {
      content: `${emergencyMove.title}. ${emergencyMove.detail}`,
      suggestions: [
        "Why does this come before investing?",
        "How fast can I get there?",
        "What should I hold off on?",
      ],
    };
  }

  if (/(spend|spending|takeout|restaurant|subscription|budget|cut)/.test(q) && spendingMove) {
    return {
      content: `${spendingMove.title}. ${spendingMove.detail}`,
      suggestions: [
        "Which subscriptions should I cancel?",
        "How does my spending compare to income?",
        "Why does the card come first?",
      ],
    };
  }

  if (/\b(score|health|doing|okay|ok)\b/.test(q)) {
    const score = computeHealthScore(profile);
    return {
      content: `You're at ${score.score}/100, which is ${score.band.toLowerCase()}. ${
        score.watchouts[0]?.summary ?? ""
      } The quickest lift: ${score.watchouts[0]?.detail ?? "pay down the highest-rate card."}`,
      suggestions: [
        "What would raise my score fastest?",
        "Why does the card come first?",
        "How much emergency savings do I need?",
      ],
    };
  }

  if (/(afford|buy|purchase)/.test(q)) {
    const free = Math.max(0, metrics.checkingBalance - 500);
    return {
      content: `Checking has ${formatCurrency(metrics.checkingBalance)} and your bills are already covered in the plan. I'd keep a $500 buffer, which leaves about ${formatCurrency(
        free,
      )} genuinely free — anything bigger should wait or come out of savings on purpose.`,
      suggestions: [
        "What should I do with my money this month?",
        "Where am I overspending?",
        "How much emergency savings do I need?",
      ],
    };
  }

  const first = plan.moves[0];
  const second = plan.moves[1];
  return {
    content: `${
      first ? `${first.title}. ${first.detail}` : "Everything looks steady right now."
    }${second ? ` After that: ${second.title.toLowerCase()}.` : ""}`,
    suggestions: [
      "What should I hold off on?",
      "Where am I overspending?",
      "How is my financial health?",
    ],
  };
}
