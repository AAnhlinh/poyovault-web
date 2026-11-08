"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  Building2,
  Check,
  Database,
  Download,
  ExternalLink,
  LogOut,
  RotateCcw,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import { useFinance } from "@/components/providers/finance-provider";
import { accountTypeLabel } from "@/lib/finance/aggregate";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatCurrency, formatDate } from "@/lib/finance/format";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  InfoNote,
  Toggle,
} from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";

export function SettingsView() {
  const { profile, mode, updatePreferences, resetDemo, syncError } = useFinance();
  const [resetOpen, setResetOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [diningBudget, setDiningBudget] = useState(String(profile.preferences.diningBudget));
  const preferences = profile.preferences;

  useEffect(() => {
    setDiningBudget(String(preferences.diningBudget));
  }, [preferences.diningBudget]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3500);
  }

  function exportData() {
    const payload = {
      exportedAt: new Date().toISOString(),
      source: mode === "demo" ? "PoyoVault demo workspace" : "PoyoVault (Supabase)",
      customer: profile.customer,
      preferences: profile.preferences,
      accounts: profile.accounts,
      transactions: profile.transactions,
      goals: profile.goals,
      partnerOffers: profile.offers,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "poyovault-data-export.json";
    anchor.click();
    URL.revokeObjectURL(url);
    notify("Your data export has been downloaded.");
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {toast ? (
        <div className="flex items-center justify-between rounded-2xl border border-mint/20 bg-mint/[0.06] px-4 py-3 text-[11.5px] text-mint">
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4" /> {toast}
          </span>
          <button type="button" onClick={() => setToast(null)} className="text-[10px] text-mint/60 hover:text-mint">
            Dismiss
          </button>
        </div>
      ) : null}
      {syncError ? (
        <InfoNote className="border-coral/20 bg-coral/[0.05] text-coral/80">{syncError}</InfoNote>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="relative overflow-hidden p-5 sm:p-6 xl:col-span-5">
          <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="relative flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/35 to-brand-500/25 font-display text-lg font-semibold text-white ring-1 ring-white/10">
              {profile.customer.avatarInitials}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-[18px] font-semibold tracking-tight text-white">
                {profile.customer.name}
              </h2>
              <p className="mt-0.5 truncate text-[11.5px] text-white/40">{profile.customer.email}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge tone="violet">{profile.customer.plan}</Badge>
                <Badge tone={mode === "demo" ? "amber" : "mint"} dot>
                  {mode === "demo" ? "Demo workspace" : "Supabase connected"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="relative mt-5 grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
              <p className="label">Member since</p>
              <p className="mt-1 text-[12px] font-medium text-white/80">{formatDate(profile.customer.since)}</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
              <p className="label">Connected accounts</p>
              <p className="mt-1 text-[12px] font-medium text-white/80">{profile.accounts.length}</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
              <p className="label">Data location</p>
              <p className="mt-1 text-[12px] font-medium text-white/80">
                {mode === "demo" ? "This browser" : "Your Supabase project"}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
              <p className="label">AI analysis</p>
              <p className="mt-1 text-[12px] font-medium text-white/80">
                {preferences.aiAnalysis ? "Enabled" : "Paused"}
              </p>
            </div>
          </div>

          <div className="relative mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={exportData}>
              <Download className="h-3.5 w-3.5" /> Export my data
            </Button>
            {mode === "cloud" ? (
              <form action="/auth/signout" method="post">
                <Button size="sm" variant="ghost" type="submit">
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </Button>
              </form>
            ) : (
              <Link
                href="/login"
                className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-white/[0.08] px-3 text-[11px] text-white/55 transition hover:border-white/20 hover:text-white"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Supabase sign-in
              </Link>
            )}
          </div>
        </Card>

        <Card className="p-5 sm:p-6 xl:col-span-7">
          <CardHeader
            title="Connected accounts & permissions"
            description="Every connection is read-only and can be revoked at any time."
            action={<Badge tone="mint" dot>{profile.accounts.length} active</Badge>}
          />
          <div className="mt-3 divide-y divide-white/[0.05]">
            {profile.accounts.slice(0, 5).map((account) => (
              <div key={account.id} className="flex items-center gap-3 py-2.5">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] text-[9px] font-semibold"
                  style={{ backgroundColor: `${account.accent}16`, color: account.accent }}
                >
                  {account.logo}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11.5px] font-medium text-white/80">{account.name}</p>
                  <p className="text-[9.5px] text-white/30">
                    {account.institution} · {accountTypeLabel(account)} · •••• {account.mask}
                  </p>
                </div>
                <div className="text-right">
                  <p className="num text-[11.5px] text-white/70">{formatCurrency(account.balance)}</p>
                  <p className="text-[9px] text-mint/70">Read only</p>
                </div>
              </div>
            ))}
          </div>
          <Link href="/accounts" className="mt-3 inline-flex items-center gap-1 text-[10.5px] text-violet-300 hover:text-violet-200">
            Manage connections <ArrowUpRight className="h-3 w-3" />
          </Link>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="p-5 sm:p-6 xl:col-span-7">
          <div className="flex items-start gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-mint/10 text-mint">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-[16px] font-semibold tracking-tight text-white">
                Privacy & data use
              </h2>
              <p className="mt-1 text-[11.5px] leading-relaxed text-white/40">
                These switches take effect immediately. Turning off AI analysis stops recommendations being generated
                from your transactions; your calculations remain available.
              </p>
            </div>
          </div>
          <div className="mt-3 divide-y divide-white/[0.05]">
            <Toggle
              checked={preferences.aiAnalysis}
              onChange={(checked) => {
                updatePreferences({ aiAnalysis: checked });
                notify(checked ? "AI analysis enabled." : "AI analysis paused.");
              }}
              label="AI financial analysis"
              description="Read connected balances and categorised transactions to calculate your score and recommendations."
            />
            <Toggle
              checked={preferences.personalizedOffers}
              onChange={(checked) => {
                updatePreferences({ personalizedOffers: checked });
                notify(checked ? "Offer personalization enabled." : "Offer personalization disabled.");
              }}
              label="Personalized rewards matching"
              description="Use your spending categories to rank partner offers. Never used for AI advice or debt recommendations."
            />
            <Toggle
              checked={preferences.productAnalytics}
              onChange={(checked) => updatePreferences({ productAnalytics: checked })}
              label="Product analytics"
              description="Share anonymised feature usage to help improve PoyoVault. No transaction details or balances are included."
            />
            <Toggle
              checked={preferences.thirdPartySharing}
              onChange={(checked) => {
                updatePreferences({ thirdPartySharing: checked });
                notify(checked ? "Third-party sharing enabled." : "Third-party sharing disabled.");
              }}
              label="Third-party data sharing"
              description="Allow sharing with partner companies for offers. Off by default. PoyoVault does not sell financial data."
            />
          </div>
          {preferences.thirdPartySharing ? (
            <InfoNote className="mt-3 border-amber/20 bg-amber/[0.05] text-amber/70">
              Third-party sharing is on. In a production product this requires explicit, separate consent for each
              partner and must never include account numbers or credentials.
            </InfoNote>
          ) : null}
        </Card>

        <div className="space-y-4 xl:col-span-5">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-violet-300" />
              <h2 className="font-display text-[15px] font-semibold tracking-tight text-white">Notifications</h2>
            </div>
            <div className="mt-2 divide-y divide-white/[0.05]">
              <Toggle
                checked={preferences.weeklyDigest}
                onChange={(checked) => updatePreferences({ weeklyDigest: checked })}
                label="Weekly financial digest"
                description="A short summary of spending, score changes and progress."
              />
              <Toggle
                checked={preferences.billReminders}
                onChange={(checked) => updatePreferences({ billReminders: checked })}
                label="Payment reminders"
                description="Remind me three days before a required payment is due."
              />
              <Toggle
                checked={preferences.goalMilestones}
                onChange={(checked) => updatePreferences({ goalMilestones: checked })}
                label="Goal milestones"
                description="Celebrate progress at 25%, 50%, 75% and 100% of a goal."
              />
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber" />
              <h2 className="font-display text-[15px] font-semibold tracking-tight text-white">
                Spending preferences
              </h2>
            </div>
            <label htmlFor="diningBudget" className="field-label mt-3">
              Monthly dining budget
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-white/30">$</span>
                <input
                  id="diningBudget"
                  className="field pl-6"
                  inputMode="decimal"
                  value={diningBudget}
                  onChange={(event) => setDiningBudget(event.target.value)}
                  onBlur={() => {
                    const value = Number(diningBudget);
                    if (Number.isFinite(value) && value >= 0) {
                      updatePreferences({ diningBudget: value });
                      notify("Dining budget updated.");
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                  }}
                />
              </div>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-white/30">
              Used by the dining challenge. Change it any time; progress recalculates from this month's transactions.
            </p>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="p-5 sm:p-6 xl:col-span-7">
          <div className="flex items-start gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/10 text-brand-300">
              <Database className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-[16px] font-semibold tracking-tight text-white">
                How your data is stored
              </h2>
              <p className="mt-1 text-[11.5px] leading-relaxed text-white/40">
                {mode === "demo"
                  ? "You are in the demo workspace. Changes live in this browser's local storage and never leave the device."
                  : "Your data lives in your own Supabase project, protected by Row Level Security. Every table is scoped to your user id."}
              </p>
            </div>
            <Badge tone={mode === "demo" ? "amber" : "mint"}>{mode === "demo" ? "Local" : "Supabase"}</Badge>
          </div>

          {mode === "demo" ? (
            <div className="mt-4 space-y-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-[11.5px] font-medium text-white/70">Connect your own Supabase project</p>
              <ol className="list-decimal space-y-1.5 pl-4 text-[10.5px] leading-relaxed text-white/40">
                <li>Run <code className="rounded bg-black/30 px-1 py-0.5 text-white/60">supabase/schema.sql</code> in the Supabase SQL editor.</li>
                <li>
                  Copy the project URL and anon key into{" "}
                  <code className="rounded bg-black/30 px-1 py-0.5 text-white/60">.env.local</code> as{" "}
                  <code className="rounded bg-black/30 px-1 py-0.5 text-white/60">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                  <code className="rounded bg-black/30 px-1 py-0.5 text-white/60">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
                </li>
                <li>Restart the app, then sign up. Optionally seed realistic data with <code className="rounded bg-black/30 px-1 py-0.5 text-white/60">npm run seed</code>.</li>
              </ol>
              <p className="text-[10px] leading-relaxed text-white/25">
                The service-role key is only used by the local seed script. It is never shipped to the browser and must
                never be committed.
              </p>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge tone="mint">Row Level Security enabled</Badge>
              <Badge tone="neutral">Auth via Supabase</Badge>
              <Badge tone="neutral">Read-only bank permissions</Badge>
            </div>
          )}

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {[
              { icon: ShieldCheck, label: "Encrypted in transit" },
              { icon: UserRound, label: "Scoped to your account" },
              { icon: Building2, label: "Bank credentials never stored" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <item.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint" />
                <p className="text-[10px] leading-relaxed text-white/40">{item.label}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 sm:p-6 xl:col-span-5">
          <CardHeader
            title="Data controls"
            description="Take your data with you, or start fresh."
          />
          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={exportData}
              className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 text-left transition hover:border-white/15"
            >
              <Download className="h-4 w-4 text-brand-300" />
              <div className="flex-1">
                <p className="text-[11.5px] font-medium text-white/75">Export all of my data</p>
                <p className="text-[9.5px] text-white/30">JSON download of accounts, transactions, goals and preferences</p>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-white/25" />
            </button>

            {mode === "demo" ? (
              <button
                type="button"
                onClick={() => setResetOpen(true)}
                className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 text-left transition hover:border-coral/25"
              >
                <RotateCcw className="h-4 w-4 text-coral" />
                <div className="flex-1">
                  <p className="text-[11.5px] font-medium text-white/75">Reset the demo workspace</p>
                  <p className="text-[9.5px] text-white/30">Restore the original sample customer and clear local changes</p>
                </div>
                <Trash2 className="h-3.5 w-3.5 text-white/25" />
              </button>
            ) : (
              <div className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-mint" />
                <p className="text-[10.5px] leading-relaxed text-white/40">
                  To delete your account and data, use Supabase Auth → Users in your project. Cascading deletes remove
                  the associated rows. PoyoVault has no server copy.
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-white/[0.05] pt-3 text-[9.5px] leading-relaxed text-white/25">
            PoyoVault is a prototype. It is not a bank, does not hold funds and does not connect to real institutions.
            Financial recommendations are educational and do not guarantee outcomes.
          </div>
        </Card>
      </div>

      <InfoNote icon={<Shield className="h-4 w-4" />}>
        Supabase status: {isSupabaseConfigured ? "configured for this deployment" : "not configured — demo mode"}. Authentication
        is only enabled when the project environment includes the public Supabase URL and anon key. No service-role
        secrets are used by the application at runtime.
      </InfoNote>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset demo workspace?"
        description="This restores the original sample customer and removes every change saved in this browser."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setResetOpen(false)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                resetDemo();
                setResetOpen(false);
                notify("Demo workspace reset.");
              }}
            >
              Reset workspace
            </Button>
          </>
        }
      >
        <InfoNote className="border-coral/15 bg-coral/[0.04] text-coral/70">
          Contributions, connected accounts, cancelled subscriptions and chat history from this session will be lost.
          Exported files are unaffected.
        </InfoNote>
      </Modal>
    </div>
  );
}
