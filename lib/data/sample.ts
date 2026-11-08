import type { FinancialProfile, Transaction } from "../types";
import {
  ACCOUNTS,
  CUSTOMER,
  GOALS,
  MERCHANTS,
  OFFERS,
  PAYROLL,
  PREFERENCES,
} from "./fixtures";

/** Stable string hash so the sample data never changes between reloads. */
function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function between(seed: string, min: number, max: number) {
  return min + hash(seed) * (max - min);
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function isoDate(year: number, monthIndex: number, day: number) {
  return new Date(year, monthIndex, day, 12, 0, 0, 0).toISOString();
}

export function buildDemoProfile(now = new Date()): FinancialProfile {
  const transactions: Transaction[] = [];
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const monthsInWindow = 7;

  for (let offset = monthsInWindow - 1; offset >= 0; offset -= 1) {
    const monthDate = new Date(currentYear, currentMonth - offset, 1);
    const year = monthDate.getFullYear();
    const monthIndex = monthDate.getMonth();
    const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
    const isCurrentMonth = offset === 0;
    const daysAllowed = isCurrentMonth ? now.getDate() : 28;
    const growthIndex = monthsInWindow - 1 - offset;

    // Income: twice-monthly direct deposit from the primary employer.
    for (const day of PAYROLL.days) {
      if (day > daysAllowed) continue;
      transactions.push({
        id: `tx_${key}_payroll_${day}`,
        accountId: PAYROLL.accountId,
        merchant: PAYROLL.merchant,
        category: "income",
        amount: PAYROLL.amount,
        date: isoDate(year, monthIndex, day),
        type: "income",
        recurring: true,
      });
    }

    for (const spec of MERCHANTS) {
      const isTripMonth = (year * 12 + monthIndex) % 3 === 1;
      if (spec.everyNMonths) {
        if (spec.everyNMonths === 3) {
          if (!isTripMonth) continue;
        } else if ((year * 12 + monthIndex + spec.amount[0]) % spec.everyNMonths !== 0) {
          continue;
        }
      }

      let count: number;
      if (spec.perMonth[0] === spec.perMonth[1]) {
        count = spec.perMonth[0];
      } else {
        count =
          spec.perMonth[0] +
          Math.floor(hash(`${spec.merchant}|${key}|count`) * (spec.perMonth[1] - spec.perMonth[0] + 1));
      }
      if (spec.everyNMonths) count = 1;
      if (count === 0) continue;

      const fixedDay = spec.day;
      for (let i = 0; i < count; i += 1) {
        const day = fixedDay
          ? fixedDay
          : Math.max(
              1,
              Math.min(
                daysAllowed,
                Math.floor(between(`${spec.merchant}|${key}|${i}|day`, 2, daysAllowed + 1)),
              ),
            );
        if (day > daysAllowed) continue;

        const base = between(`${spec.merchant}|${key}|${i}|amount`, spec.amount[0], spec.amount[1]);
        const trendMultiplier = 1 + (spec.trend ?? 0) * growthIndex;
        const amount = Math.round(base * trendMultiplier * 100) / 100;

        transactions.push({
          id: `tx_${key}_${slug(spec.merchant)}_${i}`,
          accountId: spec.accountId,
          merchant: spec.merchant,
          category: spec.category,
          amount,
          date: isoDate(year, monthIndex, day),
          type: "expense",
          recurring: Boolean(fixedDay),
          subscription: spec.subscription,
        });
      }
    }
  }

  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    customer: CUSTOMER,
    accounts: ACCOUNTS.map((account) => ({
      ...account,
      lastSyncedAt: new Date(now.getTime() - 4 * 60 * 1000).toISOString(),
    })),
    transactions,
    goals: GOALS.map((goal) => ({ ...goal })),
    preferences: {
      ...PREFERENCES,
      enrolledChallenges: [...PREFERENCES.enrolledChallenges],
      cancelledSubscriptions: [...PREFERENCES.cancelledSubscriptions],
    },
    offers: OFFERS.map((offer) => ({ ...offer })),
    asOf: now.toISOString(),
  };
}
