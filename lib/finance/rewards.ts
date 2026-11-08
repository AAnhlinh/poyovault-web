import type { FinancialProfile, PartnerOffer } from "../types";
import { CATEGORY_META, getCompleteMonths, getMonthlyHistory } from "./aggregate";
import { formatCurrency } from "./format";

export interface MatchedOffer extends PartnerOffer {
  /** Normalised monthly value. One-time and yearly benefits are divided by 12. */
  estimatedMonthlySavings: number;
  /** Face value over the benefit's own cadence (month, year, or once). */
  grossSavings: number;
  savingsCadence: "monthly" | "one-time" | "yearly";
  rationale: string;
  categorySpend: number;
  relevance: number;
  matchLabel: string;
}

export interface RewardsSummary {
  offers: MatchedOffer[];
  potentialMonthly: number;
  potentialAnnual: number;
  personalized: boolean;
  matchedCount: number;
  categorySpend: { category: string; label: string; amount: number }[];
}

const PERCENT_OFFER_CAP = 40;

export function getCategoryMonthlySpend(profile: FinancialProfile) {
  const complete = getCompleteMonths(getMonthlyHistory(profile)).slice(-3);
  const totals = new Map<string, number>();
  for (const month of complete) {
    for (const [category, amount] of Object.entries(month.byCategory)) {
      totals.set(category, (totals.get(category) ?? 0) + amount);
    }
  }
  return Array.from(totals.entries())
    .map(([category, amount]) => ({
      category,
      label: CATEGORY_META[category]?.label ?? category,
      amount: complete.length > 0 ? amount / complete.length : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function getMatchedOffers(profile: FinancialProfile): MatchedOffer[] {
  const personalized = profile.preferences.personalizedOffers;
  const categorySpend = getCategoryMonthlySpend(profile);
  const spendMap = new Map(categorySpend.map((entry) => [entry.category, entry.amount]));
  const peloton = profile.transactions.find(
    (tx) => tx.merchant === "Peloton App" && tx.subscription,
  );

  return profile.offers
    .map((offer) => {
      const rawSpend =
        offer.category === "wellness"
          ? peloton?.amount ?? 0
          : spendMap.get(offer.category) ?? 0;
      const categorySpendValue = Math.max(0, rawSpend);

      const cadence = offer.savingsCadence ?? "one-time";
      let gross = 0;
      if (offer.savingsModel === "percent" && offer.savingsValue) {
        // A yearly percentage benefit applies to a year of category spend, not
        // one month of it. Both model types are capped so no offer can claim
        // savings beyond its stated limit.
        const base = cadence === "yearly" ? categorySpendValue * 12 : categorySpendValue;
        gross = Math.min(offer.maxSavings ?? PERCENT_OFFER_CAP, base * offer.savingsValue);
      } else if (offer.savingsModel === "flat" && offer.savingsValue) {
        // A flat benefit only represents a saving when the customer already pays
        // for something in that category.
        gross = categorySpendValue > 0 ? offer.savingsValue : 0;
      }
      gross = Math.round(gross * 100) / 100;
      const estimated = cadence === "monthly" ? gross : gross / 12;

      const relevance =
        categorySpendValue > 0
          ? Math.min(100, 35 + categorySpendValue / 10 + (offer.sponsored ? 0 : 5))
          : 20;

      const cadenceNote =
        cadence === "one-time"
          ? " Counted once in the first-year total — not as a recurring monthly saving."
          : cadence === "yearly"
            ? " Counted once per year, not every month."
            : "";
      const rationale = !personalized
        ? `A member benefit available to all PoyoVault customers, regardless of spending history.`
        : categorySpendValue > 0
          ? offer.category === "wellness"
            ? `You pay ${formatCurrency(
                categorySpendValue,
              )} a month for a fitness subscription this can replace or offset.${cadenceNote}`
            : `Your recent ${(
                CATEGORY_META[offer.category]?.label ?? offer.category
              ).toLowerCase()} spending averages ${formatCurrency(
                categorySpendValue,
              )} a month, so this discount applies to spending you already have.${cadenceNote}`
          : `You do not have meaningful ${offer.category} spending, so this is only worth using if it replaces a cost you already have.`;

      return {
        ...offer,
        estimatedMonthlySavings: personalized ? Math.round(estimated * 100) / 100 : 0,
        grossSavings: personalized ? gross : 0,
        savingsCadence: cadence,
        rationale,
        categorySpend: categorySpendValue,
        relevance,
        matchLabel:
          !personalized
            ? "Member benefit"
            : categorySpendValue > 0
              ? "Matches your spending"
              : "Low relevance",
      };
    })
    .sort((a, b) => {
      if (personalized) {
        if (b.estimatedMonthlySavings !== a.estimatedMonthlySavings) {
          return b.estimatedMonthlySavings - a.estimatedMonthlySavings;
        }
        return b.relevance - a.relevance;
      }
      return Number(a.sponsored) - Number(b.sponsored) || a.partner.localeCompare(b.partner);
    });
}

export function getRewardsSummary(profile: FinancialProfile): RewardsSummary {
  const offers = getMatchedOffers(profile);
  const personalized = profile.preferences.personalizedOffers;
  const matched = offers.filter((offer) => offer.estimatedMonthlySavings > 0);
  const potentialMonthly = matched.reduce(
    (sum, offer) => sum + offer.estimatedMonthlySavings,
    0,
  );

  return {
    offers,
    potentialMonthly: Math.round(potentialMonthly * 100) / 100,
    potentialAnnual: Math.round(potentialMonthly * 12 * 100) / 100,
    personalized,
    matchedCount: matched.length,
    categorySpend: getCategoryMonthlySpend(profile),
  };
}
