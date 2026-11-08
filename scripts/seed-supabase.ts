/**
 * Seed a Supabase project with PoyoVault's sample customer.
 *
 * Usage:
 *   1. Run supabase/schema.sql in the Supabase SQL editor.
 *   2. Create (or sign up) a user, e.g. maya.chen@example.com.
 *   3. Copy .env.example to .env.local and fill in the three variables.
 *   4. npm run seed -- maya.chen@example.com
 *
 * This script uses the service-role key. It must only run locally and the key
 * must never be exposed to the browser or committed to git.
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { buildDemoProfile } from "../lib/data/sample";
import { OFFERS } from "../lib/data/fixtures";
import type { ConnectedAccount, SavingsGoal } from "../lib/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them to .env.local.",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const requestedEmail = process.argv[2];

async function findUser() {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const users = data.users ?? [];
    const match = requestedEmail
      ? users.find((user) => user.email?.toLowerCase() === requestedEmail.toLowerCase())
      : users[0];
    if (match) return match;
    if (users.length < 100) break;
  }
  return null;
}

function isoDate(value: string) {
  return new Date(value).toISOString();
}

async function main() {
  const user = await findUser();
  if (!user) {
    console.error(
      requestedEmail
        ? `No Supabase auth user found for ${requestedEmail}. Sign up first, then rerun.`
        : "No Supabase auth user found. Create an account in the app first.",
    );
    process.exit(1);
  }

  const profile = buildDemoProfile();
  const now = new Date().toISOString();

  console.log(`Seeding ${profile.transactions.length} transactions for ${user.email} (${user.id})…`);

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name: profile.customer.name,
    email: user.email,
    plan: profile.customer.plan,
    updated_at: now,
  });
  if (profileError) throw profileError;

  // Idempotent: clear this customer's existing financial data first.
  const deletions = await Promise.all([
    supabase.from("chat_messages").delete().eq("user_id", user.id),
    supabase.from("transactions").delete().eq("user_id", user.id),
    supabase.from("goals").delete().eq("user_id", user.id),
    supabase.from("accounts").delete().eq("user_id", user.id),
  ]);
  for (const result of deletions) if (result.error) throw result.error;

  const accountIdMap = new Map<string, string>();
  const accountRows = profile.accounts.map((account) => {
    const id = randomUUID();
    accountIdMap.set(account.id, id);
    return {
      id,
      user_id: user.id,
      institution: account.institution,
      name: account.name,
      type: account.type,
      mask: account.mask,
      balance: account.balance,
      accent: account.accent,
      logo: account.logo,
      credit_limit: account.creditLimit ?? null,
      apr: account.apr ?? null,
      minimum_payment: account.minimumPayment ?? null,
      due_day: account.dueDay ?? null,
      original_balance: account.originalBalance ?? null,
      term_months: account.termMonths ?? null,
      remaining_months: account.remainingMonths ?? null,
      loan_kind: account.loanKind ?? null,
      last_synced_at: now,
    };
  });

  const { error: accountError } = await supabase.from("accounts").insert(accountRows);
  if (accountError) throw accountError;

  const transactionRows = profile.transactions.map((tx) => ({
    id: randomUUID(),
    user_id: user.id,
    account_id: accountIdMap.get(tx.accountId) ?? null,
    merchant: tx.merchant,
    category: tx.category,
    amount: tx.amount,
    type: tx.type,
    occurred_at: isoDate(tx.date),
    recurring: Boolean(tx.recurring),
    is_subscription: Boolean(tx.subscription),
  }));

  for (let index = 0; index < transactionRows.length; index += 400) {
    const chunk = transactionRows.slice(index, index + 400);
    const { error } = await supabase.from("transactions").insert(chunk);
    if (error) throw error;
  }

  const goalRows = profile.goals.map((goal: SavingsGoal) => ({
    id: randomUUID(),
    user_id: user.id,
    name: goal.name,
    description: goal.description,
    target: goal.target,
    saved: goal.saved,
    target_date: goal.targetDate ?? null,
    account_id: goal.accountId ? accountIdMap.get(goal.accountId) ?? null : null,
    priority: goal.priority,
    color: goal.color,
    icon: goal.icon,
    updated_at: now,
  }));
  const { error: goalError } = await supabase.from("goals").insert(goalRows);
  if (goalError) throw goalError;

  const { error: prefError } = await supabase.from("user_preferences").upsert(
    {
      user_id: user.id,
      personalized_offers: profile.preferences.personalizedOffers,
      ai_analysis: profile.preferences.aiAnalysis,
      product_analytics: profile.preferences.productAnalytics,
      third_party_sharing: profile.preferences.thirdPartySharing,
      weekly_digest: profile.preferences.weeklyDigest,
      bill_reminders: profile.preferences.billReminders,
      goal_milestones: profile.preferences.goalMilestones,
      enrolled_challenges: profile.preferences.enrolledChallenges,
      cancelled_subscriptions: profile.preferences.cancelledSubscriptions,
      dining_budget: profile.preferences.diningBudget,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );
  if (prefError) throw prefError;

  const { error: offerError } = await supabase.from("partner_offers").upsert(
    OFFERS.map((offer) => ({
      id: offer.id,
      partner: offer.partner,
      tagline: offer.tagline,
      description: offer.description,
      discount: offer.discount,
      category: offer.category,
      expires_at: offer.expiresAt,
      eligibility: offer.eligibility,
      sponsored: offer.sponsored,
      accent: offer.accent,
      savings_model: offer.savingsModel ?? null,
      savings_value: offer.savingsValue ?? null,
    })),
  );
  if (offerError) throw offerError;

  const accounts = profile.accounts as ConnectedAccount[];
  console.log(`Done. Seeded ${accounts.length} accounts, ${transactionRows.length} transactions, ${goalRows.length} goals and ${OFFERS.length} offers.`);
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
