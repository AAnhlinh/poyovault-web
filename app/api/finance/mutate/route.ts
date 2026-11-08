import { NextResponse } from "next/server";
import type { Preferences } from "@/lib/types";
import type { FinanceMutation } from "@/lib/finance/mutations";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function preferenceColumns(patch: Partial<Preferences>) {
  const columns: Record<string, unknown> = {};
  if (typeof patch.personalizedOffers === "boolean") columns.personalized_offers = patch.personalizedOffers;
  if (typeof patch.aiAnalysis === "boolean") columns.ai_analysis = patch.aiAnalysis;
  if (typeof patch.productAnalytics === "boolean") columns.product_analytics = patch.productAnalytics;
  if (typeof patch.thirdPartySharing === "boolean") columns.third_party_sharing = patch.thirdPartySharing;
  if (typeof patch.weeklyDigest === "boolean") columns.weekly_digest = patch.weeklyDigest;
  if (typeof patch.billReminders === "boolean") columns.bill_reminders = patch.billReminders;
  if (typeof patch.goalMilestones === "boolean") columns.goal_milestones = patch.goalMilestones;
  if (Array.isArray(patch.enrolledChallenges)) {
    columns.enrolled_challenges = patch.enrolledChallenges.filter(
      (id): id is string => typeof id === "string",
    );
  }
  if (Array.isArray(patch.cancelledSubscriptions)) {
    columns.cancelled_subscriptions = patch.cancelledSubscriptions.filter(
      (id): id is string => typeof id === "string",
    );
  }
  if (typeof patch.diningBudget === "number") {
    columns.dining_budget = Math.min(10_000, Math.max(0, patch.diningBudget));
  }
  return columns;
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  // Basic CSRF guard: mutations must originate from this origin.
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin) {
    try {
      if (new URL(origin).host !== host) {
        return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
    }
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let mutation: FinanceMutation;
  try {
    mutation = (await request.json()) as FinanceMutation;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    switch (mutation.type) {
      case "goal.contribute": {
        const amount = Math.round(number(mutation.amount) * 100) / 100;
        if (!UUID.test(mutation.goalId) || amount <= 0 || amount > 100_000) {
          return NextResponse.json({ error: "Invalid contribution." }, { status: 400 });
        }
        const { data: goal, error } = await supabase
          .from("goals")
          .select("id, saved, account_id")
          .eq("id", mutation.goalId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) throw error;
        if (!goal) return NextResponse.json({ error: "Goal not found." }, { status: 404 });

        const { error: goalError } = await supabase
          .from("goals")
          .update({ saved: number(goal.saved) + amount })
          .eq("id", goal.id)
          .eq("user_id", user.id);
        if (goalError) throw goalError;

        const { data: checking } = await supabase
          .from("accounts")
          .select("id, balance")
          .eq("user_id", user.id)
          .eq("type", "checking")
          .limit(1)
          .maybeSingle();
        if (checking) {
          await supabase
            .from("accounts")
            .update({ balance: Math.max(0, number(checking.balance) - amount) })
            .eq("id", checking.id)
            .eq("user_id", user.id);
        }
        if (goal.account_id) {
          const { data: savings } = await supabase
            .from("accounts")
            .select("id, balance")
            .eq("id", goal.account_id)
            .eq("user_id", user.id)
            .maybeSingle();
          if (savings) {
            await supabase
              .from("accounts")
              .update({ balance: number(savings.balance) + amount })
              .eq("id", savings.id)
              .eq("user_id", user.id);
          }
        }
        break;
      }

      case "goal.target": {
        const target = Math.round(number(mutation.target) * 100) / 100;
        if (!UUID.test(mutation.goalId) || target <= 0 || target > 10_000_000) {
          return NextResponse.json({ error: "Invalid target." }, { status: 400 });
        }
        const { error } = await supabase
          .from("goals")
          .update({ target })
          .eq("id", mutation.goalId)
          .eq("user_id", user.id);
        if (error) throw error;
        break;
      }

      case "goal.create": {
        const goal = mutation.goal;
        if (!UUID.test(goal.id)) {
          return NextResponse.json({ error: "Invalid goal id." }, { status: 400 });
        }
        const name = String(goal.name ?? "").trim().slice(0, 120);
        const target = Math.round(number(goal.target) * 100) / 100;
        const saved = Math.max(0, Math.round(number(goal.saved ?? 0) * 100) / 100);
        if (!name || target <= 0 || target > 10_000_000) {
          return NextResponse.json({ error: "Invalid goal." }, { status: 400 });
        }
        const { error } = await supabase.from("goals").insert({
          id: goal.id,
          user_id: user.id,
          name,
          description: "",
          target,
          saved,
          target_date: goal.targetDate || null,
          priority: goal.priority ?? "medium",
          color: goal.color ?? "#5EEAD4",
          icon: goal.icon ?? "shield",
        });
        if (error) throw error;
        break;
      }

      case "transaction.create": {
        const transaction = mutation.transaction;
        if (!UUID.test(transaction.id) || !UUID.test(transaction.accountId)) {
          return NextResponse.json({ error: "Invalid transaction id." }, { status: 400 });
        }
        const merchant = String(transaction.merchant ?? "").trim().slice(0, 120);
        const amount = Math.round(number(transaction.amount) * 100) / 100;
        const occurredAt = new Date(transaction.date);
        if (
          !merchant ||
          amount <= 0 ||
          amount > 1_000_000 ||
          Number.isNaN(occurredAt.getTime())
        ) {
          return NextResponse.json({ error: "Invalid transaction." }, { status: 400 });
        }
        const { data: account, error: accountError } = await supabase
          .from("accounts")
          .select("id, type, balance")
          .eq("id", transaction.accountId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (accountError) throw accountError;
        if (!account) {
          return NextResponse.json({ error: "Account not found." }, { status: 404 });
        }
        const type = transaction.type === "income" ? "income" : "expense";
        const { error } = await supabase.from("transactions").insert({
          id: transaction.id,
          user_id: user.id,
          account_id: transaction.accountId,
          merchant,
          category: type === "income" ? "income" : transaction.category,
          amount,
          type,
          occurred_at: occurredAt.toISOString(),
          recurring: false,
          is_subscription: false,
        });
        if (error) throw error;
        const isDebt = account.type === "credit_card" || account.type === "loan";
        const delta = type === "expense" ? (isDebt ? amount : -amount) : isDebt ? -amount : amount;
        await supabase
          .from("accounts")
          .update({ balance: Math.max(0, number(account.balance) + delta) })
          .eq("id", account.id)
          .eq("user_id", user.id);
        break;
      }

      case "account.connect": {
        const account = mutation.account;
        if (!UUID.test(account.id)) {
          return NextResponse.json({ error: "Invalid account id." }, { status: 400 });
        }
        if (!["checking", "savings", "credit_card", "loan"].includes(account.type)) {
          return NextResponse.json({ error: "Invalid account type." }, { status: 400 });
        }
        const { error } = await supabase.from("accounts").insert({
          id: account.id,
          user_id: user.id,
          institution: account.institution.slice(0, 80),
          name: account.name.slice(0, 120),
          type: account.type,
          mask: (account.mask ?? "0000").slice(0, 4),
          balance: Math.max(0, number(account.balance)),
          credit_limit: account.creditLimit ?? null,
          apr: account.apr ?? null,
          minimum_payment: account.minimumPayment ?? null,
          due_day: account.dueDay ?? null,
          loan_kind: account.loanKind ?? null,
          last_synced_at: new Date().toISOString(),
        });
        if (error) throw error;
        break;
      }

      case "account.disconnect": {
        if (!UUID.test(mutation.id)) {
          return NextResponse.json({ error: "Invalid account id." }, { status: 400 });
        }
        const { error } = await supabase
          .from("accounts")
          .delete()
          .eq("id", mutation.id)
          .eq("user_id", user.id);
        if (error) throw error;
        break;
      }

      case "preferences.update": {
        const columns = preferenceColumns(mutation.patch ?? {});
        if (Object.keys(columns).length === 0) {
          return NextResponse.json({ error: "No valid preference fields." }, { status: 400 });
        }
        const { error } = await supabase
          .from("user_preferences")
          .upsert({ user_id: user.id, ...columns }, { onConflict: "user_id" });
        if (error) throw error;
        break;
      }

      case "subscription.cancel":
      case "subscription.reactivate": {
        const merchant = String(mutation.merchant ?? "").slice(0, 120);
        if (!merchant) {
          return NextResponse.json({ error: "Merchant is required." }, { status: 400 });
        }
        const { data: prefs, error } = await supabase
          .from("user_preferences")
          .select("cancelled_subscriptions")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) throw error;
        const current: string[] = prefs?.cancelled_subscriptions ?? [];
        const next =
          mutation.type === "subscription.cancel"
            ? Array.from(new Set([...current, merchant]))
            : current.filter((entry) => entry !== merchant);
        const { error: updateError } = await supabase
          .from("user_preferences")
          .upsert({ user_id: user.id, cancelled_subscriptions: next }, { onConflict: "user_id" });
        if (updateError) throw updateError;
        break;
      }

      case "chat.append": {
        const message = mutation.message;
        if (!message || (message.role !== "user" && message.role !== "assistant")) {
          return NextResponse.json({ error: "Invalid message." }, { status: 400 });
        }
        const content = String(message.content ?? "").slice(0, 8000);
        if (!content) {
          return NextResponse.json({ error: "Message is empty." }, { status: 400 });
        }
        const { error } = await supabase.from("chat_messages").insert({
          id: UUID.test(message.id) ? message.id : crypto.randomUUID(),
          user_id: user.id,
          role: message.role,
          content,
          suggestions: message.suggestions ?? [],
        });
        if (error) throw error;
        break;
      }

      default:
        return NextResponse.json({ error: "Unknown mutation." }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PoyoVault mutation failed", error);
    return NextResponse.json({ error: "Could not save the change." }, { status: 500 });
  }
}
