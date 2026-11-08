import type { FinancialProfile } from "../types";
import {
  CATEGORY_META,
  getActiveSubscriptions,
  getCheckingBalance,
  getCompleteMonths,
  getDashboardMetrics,
  getEmergencyTarget,
  getEssentialExpenses,
  getMonthlyHistory,
  getSubscriptionMonthlyTotal,
  getUpcomingPayments,
} from "../finance/aggregate";
import { comparePayoffStrategies, getDebtSummary } from "../finance/debt";
import { buildForecast, describeConfidence } from "../finance/forecast";
import { formatCurrency, formatPercent, monthLabel } from "../finance/format";
import { generateInsights, getSurplusPlan } from "../finance/insights";
import { getRewardsSummary } from "../finance/rewards";
import { computeHealthScore } from "../finance/score";

export interface AdvisorAnswer {
  content: string;
  suggestions: string[];
}

export const ADVISOR_STARTERS = [
  "How is my financial health?",
  "Should I save or pay off debt?",
  "Can I afford a $400 purchase?",
  "What does my next 6 months look like?",
];

function firstName(profile: FinancialProfile) {
  return profile.customer.name.split(" ")[0] ?? "there";
}

export function buildWelcomeMessage(profile: FinancialProfile): AdvisorAnswer {
  const score = computeHealthScore(profile);
  const metrics = getDashboardMetrics(profile);
  const insights = generateInsights(profile);
  const top = insights[0];
  const name = firstName(profile);

  return {
    content: `Hi ${name}. Here's where you stand: ${profile.accounts.length} accounts, six months of transactions, and your current debt and savings. Health score: ${score.score}/100 (${score.band.toLowerCase()}).

The first thing I'd fix: ${top.title.toLowerCase()}. ${top.body}

Ask me about anything — debt, spending, your emergency fund, upcoming bills or the next year. I'll show the numbers behind every answer.`,
    suggestions: ADVISOR_STARTERS,
  };
}

function snapshot(profile: FinancialProfile): AdvisorAnswer {
  const metrics = getDashboardMetrics(profile);
  const score = computeHealthScore(profile);
  const plan = getSurplusPlan(profile);
  const insights = generateInsights(profile);
  const top = insights[0];

  return {
    content: `${firstName(profile)}, here's the quick version.

• Health score: ${score.score}/100 (${score.band}). ${score.strengths[0]?.label ?? "Income consistency"} is your strongest area; ${score.watchouts[0]?.label ?? "discretionary spending"} is the weakest.
• Cash flow: ${formatCurrency(metrics.monthlyIncome)} in, ${formatCurrency(
      metrics.monthlyExpenses,
    )} out including required debt payments. That leaves ${formatCurrency(metrics.disposableIncome)}.
• Debt: ${formatCurrency(metrics.totalDebt)} outstanding, with ${formatCurrency(
      metrics.monthlyDebtPayments,
    )} required each month (${formatPercent(metrics.debtToIncome, 0)} of income).
• Emergency fund: ${formatCurrency(metrics.emergencySavings)} , or ${metrics.emergencyMonths.toFixed(
      1,
    )} months of essentials. Three months is ${formatCurrency(metrics.emergencyTarget)}.

What I'd do first: ${plan.headline.toLowerCase()}. ${plan.reasoning}

${top ? `Also worth knowing: ${top.title.toLowerCase()}. ${top.body}` : ""}`,
    suggestions: ADVISOR_STARTERS,
  };
}

function scoreAnswer(profile: FinancialProfile): AdvisorAnswer {
  const score = computeHealthScore(profile);
  const factorLines = score.factors
    .map(
      (factor) =>
        `• ${factor.label}: ${factor.score}/100 (weight ${factor.weight}%). ${factor.summary}`,
    )
    .join("\n");

  return {
    content: `Your score is ${score.score}/100, which sits in the ${score.band.toLowerCase()} range.

${factorLines}

Why that adds up to ${score.score}: ${score.summary}

The two changes with the largest effect would be:
• ${score.watchouts[0]?.detail ?? "Reduce the highest-rate card balance."}
• ${score.watchouts[1]?.detail ?? "Increase automatic transfers to emergency savings."}

A score is a summary, not a verdict. It does not account for upcoming changes such as a raise, a move, or a planned large purchase, so tell me if any of those are on the horizon.`,
    suggestions: [
      "What would raise my score fastest?",
      "Explain my debt-to-income ratio",
      "How much emergency savings do I need?",
      "Review my spending",
    ],
  };
}

function emergencyAnswer(profile: FinancialProfile): AdvisorAnswer {
  const metrics = getDashboardMetrics(profile);
  const essential = getEssentialExpenses(profile);
  const target = getEmergencyTarget(profile);
  const gap = Math.max(0, target - metrics.emergencySavings);
  const monthsAt200 = Math.ceil(gap / 200);
  const monthsAt400 = Math.ceil(gap / 400);
  const breakdown = essential.breakdown
    .map((item) => `${item.label} ${formatCurrency(item.amount)}`)
    .join(" · ");

  return {
    content: `Your emergency savings are ${formatCurrency(
      metrics.emergencySavings,
    )}, covering ${metrics.emergencyMonths.toFixed(1)} months of essential costs.

The target is based on essential expenses, not income: ${formatCurrency(
      essential.total,
    )} a month. That covers ${breakdown}. Three months of that is ${formatCurrency(
      target,
    )}, so you are ${formatCurrency(gap)} away.

At ${formatCurrency(200)} a month the gap closes in about ${monthsAt200} months; at ${formatCurrency(
      400,
    )} a month, about ${monthsAt400} months. Keep the fund in an accessible, insured account — this money is insurance, not an investment.

Once you reach three months, the case for sending extra money to your highest-rate debt gets stronger, because the cushion is doing its job.`,
    suggestions: [
      "Should I pause debt payoff to build savings?",
      "What counts as an essential expense?",
      "How should I split my monthly surplus?",
      "What is my debt-to-income ratio?",
    ],
  };
}

function debtAnswer(profile: FinancialProfile): AdvisorAnswer {
  const metrics = getDashboardMetrics(profile);
  const summary = getDebtSummary(profile);
  const comparison = comparePayoffStrategies(profile, 150, "consumer");
  const highest = summary.highestRate;
  const debtLines = summary.portfolio
    .slice(0, 5)
    .map(
      (debt) =>
        `• ${debt.name} (${debt.institution}): ${formatCurrency(debt.balance)} at ${formatPercent(
          debt.apr,
          2,
        )}, ${formatCurrency(debt.minimumPayment)} a month.`,
    )
    .join("\n");

  return {
    content: `You owe ${formatCurrency(metrics.totalDebt)} in total. ${formatCurrency(
      metrics.creditCardBalance,
    )} is revolving credit card debt and ${formatCurrency(
      metrics.loanBalance,
    )} is secured or instalment debt.

${debtLines}

Required payments total ${formatCurrency(metrics.monthlyDebtPayments)} a month — ${formatPercent(
      metrics.debtToIncome,
      0,
    )} of take-home income. Interest alone currently costs about ${formatCurrency(
      summary.monthlyInterest,
    )} a month, and ${formatCurrency(summary.consumerInterest)} of that is on consumer debt.

${highest ? `${highest.name} is the most expensive balance at ${formatPercent(highest.apr, 2)}. ` : ""}Adding ${formatCurrency(
      150,
    )} a month to the highest-rate debt first would clear your consumer balances ${comparison.monthsSaved} months sooner and save roughly ${formatCurrency(
      comparison.interestSaved,
    )} in interest. The snowball route finishes close behind, so pick the one you will actually stick to.

Before adding extra to debt, make sure every minimum is on autopay and your emergency cushion is at least one month of essentials.`,
    suggestions: [
      "Compare avalanche and snowball",
      "Which debt should I pay first?",
      "Should I save or pay off debt?",
      "How much interest am I paying?",
    ],
  };
}

function spendingAnswer(profile: FinancialProfile): AdvisorAnswer {
  const history = getMonthlyHistory(profile);
  const complete = getCompleteMonths(history);
  const latest = complete[complete.length - 1];
  const previous = complete[complete.length - 2];
  const subscriptions = getActiveSubscriptions(profile);
  const subscriptionTotal = getSubscriptionMonthlyTotal(profile);
  const categories = Object.entries(latest?.byCategory ?? {})
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
  const topThree = categories
    .slice(0, 3)
    .map(
      ({ category, amount }) =>
        `• ${CATEGORY_META[category]?.label ?? category}: ${formatCurrency(amount)}`,
    )
    .join("\n");
  const diningLatest = latest?.byCategory.dining ?? 0;
  const diningPrevious = previous?.byCategory.dining ?? 0;
  const diningDelta = diningLatest - diningPrevious;
  const flexibleTotal = categories
    .filter(({ category }) =>
      ["dining", "shopping", "entertainment", "travel", "other"].includes(category),
    )
    .reduce((sum, entry) => sum + entry.amount, 0);

  return {
    content: `Last month you spent ${formatCurrency(latest?.expenses ?? 0)} from your connected accounts${
      latest ? ` (${monthLabel(latest.key, "long")})` : ""
    }. Your largest categories were:

${topThree}

Restaurants and takeout came to ${formatCurrency(diningLatest)}, ${
      diningDelta >= 0 ? "up" : "down"
    } ${formatCurrency(Math.abs(diningDelta))} from the previous month. Flexible spending across dining, shopping, entertainment, travel and other reached ${formatCurrency(
      flexibleTotal,
    )} — that is ${formatPercent(
      flexibleTotal / Math.max(1, latest?.income ?? 1),
      0,
    )} of that month's income.

You have ${subscriptions.length} active subscriptions costing ${formatCurrency(
      subscriptionTotal,
    )} a month, or ${formatCurrency(
      subscriptionTotal * 12,
    )} a year: ${subscriptions.map((sub) => sub.merchant).join(", ")}.

Two concrete cuts to consider: trim restaurants by ${formatCurrency(
      Math.max(30, Math.round(diningDelta / 10) * 10),
    )} a month, and review the subscriptions you used least. Together those could free roughly ${formatCurrency(
      Math.max(30, Math.round(diningDelta / 10) * 10) * 12 + Math.round(subscriptionTotal * 0.2) * 12,
    )} a year without changing your fixed bills.`,
    suggestions: [
      "Which subscriptions should I cancel?",
      "How does my spending compare to income?",
      "Set a realistic dining budget",
      "What did I spend on groceries?",
    ],
  };
}

function forecastAnswer(profile: FinancialProfile): AdvisorAnswer {
  const forecast = buildForecast(profile, 6);
  const warningLines = forecast.warnings
    .slice(0, 3)
    .map((warning) => `• ${warning.title}: ${warning.detail}`)
    .join("\n");

  return {
    content: `${forecast.summary}

Projected over the next six months: ${formatCurrency(forecast.totalIncome)} of income, ${formatCurrency(
      forecast.totalExpenses,
    )} of expenses and ${formatCurrency(forecast.totalDebtPayments)} of required debt payments. Your savings would move from ${formatCurrency(
      getDashboardMetrics(profile).totalSavings,
    )} to about ${formatCurrency(
      Math.max(0, forecast.endingSavings),
    )}, with debt at ${formatCurrency(forecast.endingDebt)}.

What I would watch:
${warningLines || "• No major warning flags at your current trajectory."}

${describeConfidence(forecast.confidence)} This is a forecast of current habits, not a guarantee — a single large purchase or income change can move it materially.`,
    suggestions: [
      "How can I avoid these risks?",
      "What if I pay $200 extra to debt?",
      "Show my projected savings",
      "Compare 3 and 12 month outlooks",
    ],
  };
}

function affordabilityAnswer(profile: FinancialProfile): AdvisorAnswer {
  const metrics = getDashboardMetrics(profile);
  const plan = getSurplusPlan(profile);
  const upcoming = getUpcomingPayments(profile).filter((payment) => payment.daysAway <= 14);
  const dueTotal = upcoming.reduce((sum, payment) => sum + payment.amount, 0);
  const checking = getCheckingBalance(profile);
  const safeToSpend = Math.max(0, checking - dueTotal - 500);

  return {
    content: `After tax and required payments you have ${formatCurrency(
      metrics.disposableIncome,
    )} of monthly breathing room, though I would not treat all of it as spendable.

Right now checking holds ${formatCurrency(checking)}. ${formatCurrency(
      dueTotal,
    )} of required payments are due in the next 14 days. Keeping a ${formatCurrency(
      500,
    )} buffer on top leaves roughly ${formatCurrency(
      safeToSpend,
    )} that is genuinely free.

If the purchase is a one-off, take it from that free amount and keep the rest of the plan intact. If it would come out of emergency savings or a credit card you are trying to pay down, it is worth waiting a month and revisiting. Tell me the amount and what it is for and I can be more specific.`,
    suggestions: [
      "Can I afford a $400 purchase?",
      "What payments are due soon?",
      "How much of my surplus is safe to spend?",
      "What should I do with my surplus?",
    ],
  };
}

function priorityAnswer(profile: FinancialProfile): AdvisorAnswer {
  const metrics = getDashboardMetrics(profile);
  const plan = getSurplusPlan(profile);
  const comparison = comparePayoffStrategies(profile, plan.debtAmount, "consumer");
  const highest = comparison.highestRateDebt;

  return {
    content: `${plan.headline}.

${plan.reasoning}

With ${formatCurrency(plan.deployable)} a month, that means:
• ${formatCurrency(plan.savingsAmount)} to emergency savings (you're at ${metrics.emergencyMonths.toFixed(
      1,
    )} months).
• ${formatCurrency(plan.debtAmount)} extra to ${highest?.name ?? "your highest-rate debt"} at ${formatPercent(
      highest?.apr ?? 0,
      2,
    )}.

That extra payment saves about ${formatCurrency(
      comparison.interestSaved,
    )} in interest and clear the consumer balances ${comparison.monthsSaved} months sooner than minimums alone.

Why not put everything on the card? Your cushion is under three months, and one surprise bill would probably go straight back onto the same card. Why not keep everything in savings? At ${formatPercent(
      highest?.apr ?? 0,
      2,
    )}, the card costs far more than a savings account pays, so once the cushion is funded the balance wins.

Revisit the split after a raise, bonus or change in fixed costs. This is educational guidance, not a guarantee.`,
    suggestions: [
      "How fast can I reach a 3-month cushion?",
      "Show me the debt payoff comparison",
      "What if I get a $2,000 bonus?",
      "How is my financial health?",
    ],
  };
}

function windfallAnswer(profile: FinancialProfile, amount: number): AdvisorAnswer {
  const metrics = getDashboardMetrics(profile);
  const emergencyGap = Math.max(0, metrics.emergencyTarget - metrics.emergencySavings);
  const cards = profile.accounts
    .filter((a) => a.type === "credit_card")
    .sort((a, b) => (b.apr ?? 0) - (a.apr ?? 0));
  const highest = cards[0];
  const savingsShare = metrics.emergencyMonths < 3 ? 0.6 : 0.25;
  const toSavings = Math.round(amount * savingsShare);
  const toDebt = amount - toSavings;
  const projectedEmergency = metrics.emergencySavings + toSavings;
  const projectedCard = Math.max(0, (highest?.balance ?? 0) - toDebt);
  const newMonths = projectedEmergency / Math.max(1, metrics.essentialExpenses);

  return {
    content: `With ${formatCurrency(amount)} available, I would protect near-term obligations first: ${formatCurrency(
      getUpcomingPayments(profile)
        .filter((p) => p.daysAway <= 14)
        .reduce((sum, p) => sum + p.amount, 0),
    )} of required payments are due within 14 days.

After that, a split that fits your current position:
• ${formatCurrency(toSavings)} to emergency savings. That takes the cushion to ${formatCurrency(
      projectedEmergency,
    )}, about ${newMonths.toFixed(1)} months of essentials (target: ${formatCurrency(
      emergencyGap,
    )} to reach three months).
• ${formatCurrency(toDebt)} to ${highest?.name ?? "your highest-rate card"}${
      highest ? ` at ${formatPercent(highest.apr ?? 0, 2)}` : ""
    }, reducing that balance to ${formatCurrency(projectedCard)}.

${
  metrics.emergencyMonths < 3
    ? `Because your cushion is below three months, the savings share is higher than usual. Once it reaches target, the same ${formatCurrency(
        toSavings,
      )} a month should go to the card instead.`
    : "Your cushion is already at target, so most of a windfall can go directly to the most expensive balance."
} Avoid putting the whole amount into a long-term investment before the cushion and required payments are covered — liquidity matters more than a small return at this stage.`,
    suggestions: [
      "What should I do with my monthly surplus?",
      "Show my emergency fund progress",
      "Which card should I pay first?",
      "How is my financial health?",
    ],
  };
}

function investAnswer(profile: FinancialProfile): AdvisorAnswer {
  const metrics = getDashboardMetrics(profile);
  return {
    content: `I can explain investing principles, but I will not tell you which specific investment to buy or how to allocate your portfolio. That decision depends on your time horizon, risk tolerance, tax situation and obligations, and it should involve a fiduciary adviser for anything material.

The general sequence that financial-education guidance supports:
• Cover required payments and avoid new high-interest debt.
• Build an emergency fund in cash or an insured deposit account.
• Capture any employer retirement match, which is effectively free compensation.
• Only then consider additional investing, in diversified, low-cost options appropriate to your horizon.

Your monthly surplus is currently ${formatCurrency(
      metrics.disposableIncome,
    )}, but it is already doing useful work: funding the emergency gap and paying down high-rate debt.

Investing money you may need within a few years, or investing while carrying a 24% credit card balance, is usually the wrong trade. If you tell me your time horizon, I can explain the trade-offs in general terms.`,
    suggestions: [
      "Should I save or pay off debt?",
      "How much emergency savings do I need?",
      "What does my forecast look like?",
      "How is my financial health?",
    ],
  };
}

function incomeAnswer(profile: FinancialProfile): AdvisorAnswer {
  const income = profile.transactions.filter((tx) => tx.type === "income");
  const metrics = getDashboardMetrics(profile);
  const sources = Array.from(new Set(income.map((tx) => tx.merchant)));
  const complete = getCompleteMonths(getMonthlyHistory(profile));
  const values = complete.map((month) => month.income);
  const lowest = Math.min(...values);
  const highest = Math.max(...values);

  return {
    content: `Your connected accounts show ${formatCurrency(metrics.monthlyIncome)} a month in take-home income from ${sources.join(
      ", ",
    )}.

Across the last six complete months, monthly deposits ranged from ${formatCurrency(
      lowest,
    )} to ${formatCurrency(highest)}. ${sources.length === 1 ? "That is a single income source, so the emergency fund matters more: if it pauses, every payment depends on savings." : "With more than one source, income is more resilient, but check that each is separately accounted for in the budget."}

Required debt payments take ${formatPercent(
      metrics.debtToIncome,
      0,
    )} of that income. Fixed costs plus essentials leave ${formatCurrency(
      metrics.disposableIncome,
    )}. Automating a transfer the day after each deposit is the single most reliable way to make sure the surplus is not quietly spent.`,
    suggestions: [
      "How much should I save automatically?",
      "How does my income compare to expenses?",
      "Am I prepared for a job loss?",
      "Review my debt payments",
    ],
  };
}

function rewardsAnswer(profile: FinancialProfile): AdvisorAnswer {
  const rewards = getRewardsSummary(profile);
  const top = rewards.offers.filter((offer) => offer.estimatedMonthlySavings > 0).slice(0, 3);
  const lines = top
    .map(
      (offer) =>
        `• ${offer.partner} — ${offer.discount}. ${offer.rationale} Estimated value: ${formatCurrency(
          offer.estimatedMonthlySavings,
        )} a month.`,
    )
    .join("\n");

  return {
    content: !rewards.personalized
      ? `Personalized offer matching is currently off, so I will not use your spending history for rewards. You can enable it in Settings → Privacy.

The rewards marketplace still lists member benefits available to all customers. I would only use an offer if it reduces a cost you already have.`
      : `${lines || "No offers currently match your spending closely."}

Only the first kind of saving is real: a discount on money you were already going to spend. Sponsored offers are labelled and never change my recommendations, which are based on your accounts, not on partner revenue. ${
          rewards.matchedCount
        } offers match your current spending patterns, with a theoretical maximum value of ${formatCurrency(
          rewards.potentialMonthly,
        )} a month if every one applied to existing spend.`,
    suggestions: [
      "Which rewards actually save me money?",
      "How is my spending trending?",
      "Show my subscriptions",
      "Turn off personalized offers",
    ],
  };
}

function accountsAnswer(profile: FinancialProfile): AdvisorAnswer {
  const metrics = getDashboardMetrics(profile);
  const lines = profile.accounts
    .map(
      (account) =>
        `• ${account.institution} ${account.name} (••••${account.mask}) — ${formatCurrency(
          account.balance,
        )}`,
    )
    .join("\n");

  return {
    content: `You have ${profile.accounts.length} connected accounts:

${lines}

Deposit balances total ${formatCurrency(
      metrics.totalSavings + metrics.checkingBalance,
    )}; outstanding debt totals ${formatCurrency(metrics.totalDebt)}. Net position across everything connected is ${formatCurrency(
      metrics.netWorth,
    )}, excluding the value of the home itself.

These are simulated accounts in the prototype — real institution connections would use permissioned aggregation, and you would be able to revoke access at any time.`,
    suggestions: [
      "What is my total debt?",
      "How much is in savings?",
      "Explain my net worth",
      "Review my upcoming payments",
    ],
  };
}

export function answerQuestion(question: string, profile: FinancialProfile): AdvisorAnswer {
  const q = question.toLowerCase().trim();
  const amountMatch = q.match(/\$?\s*([\d,]{3,})/);
  const parsedAmount = amountMatch ? Number(amountMatch[1].replace(/,/g, "")) : 0;

  if (!q) return snapshot(profile);
  if (/(invest|stock|portfolio|401k|index fund|crypto)/.test(q)) return investAnswer(profile);
  if (/(windfall|bonus|extra|have \$|received|inherit|what should i do with)/.test(q) && parsedAmount > 0) {
    return windfallAnswer(profile, parsedAmount);
  }
  if (/(save or pay|pay off debt or|priorit|prioritize|split|surplus|where should.*money|what should i do with my money)/.test(q)) {
    return priorityAnswer(profile);
  }
  if (/(emergency|rainy day|cushion|how much should i save)/.test(q)) return emergencyAnswer(profile);
  if (/(debt|credit card|loan|interest|avalanche|snowball|owe)/.test(q)) return debtAnswer(profile);
  if (/(spend|spending|subscription|dining|restaurant|budget|grocer|shopping|transaction)/.test(q)) {
    return spendingAnswer(profile);
  }
  if (/(forecast|future|next (\d+ )?month|projection|project)/.test(q)) return forecastAnswer(profile);
  if (/(afford|purchase|buy|spend \$)/.test(q)) return affordabilityAnswer(profile);
  if (/(score|health|rating|how am i doing|why)/.test(q)) return scoreAnswer(profile);
  if (/(income|salary|paycheck|pay|deposit|job loss)/.test(q)) return incomeAnswer(profile);
  if (/(reward|offer|discount|benefit|cashback|coupon)/.test(q)) return rewardsAnswer(profile);
  if (/(account|bank|connect|balance)/.test(q)) return accountsAnswer(profile);
  if (/(hi|hello|hey|help|start|what can you)/.test(q)) return buildWelcomeMessage(profile);

  return snapshot(profile);
}
