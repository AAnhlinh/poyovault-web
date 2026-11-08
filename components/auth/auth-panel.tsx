"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  Compass,
  Eye,
  EyeOff,
  Lightbulb,
  LockKeyhole,
  Mail,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Badge, Button, InfoNote } from "@/components/ui/primitives";
import { Poyo } from "@/components/shared/poyo";
import { cn } from "@/lib/utils";

function Logo() {
  return (
    <Link href="/" className="inline-flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.07]">
        <span className="font-display text-lg font-bold text-white">F</span>
      </div>
      <div>
        <p className="font-display text-[17px] font-bold leading-none tracking-tight text-white">PoyoVault</p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/35">Financial clarity</p>
      </div>
    </Link>
  );
}

function ProductPreview() {
  return (
    <div className="relative mt-10 max-w-md">
      <div className="surface relative overflow-hidden p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="label">Financial health</p>
            <p className="mt-2 font-display text-4xl font-bold tracking-tight text-white">
              74<span className="text-base font-medium text-white/30">/100</span>
            </p>
          </div>
          <Badge tone="blue" dot>Good</Badge>
        </div>
        <div className="mt-4 space-y-2.5">
          {[
            { label: "Monthly cash flow", value: 82, tone: "bg-mint" },
            { label: "Emergency cushion", value: 51, tone: "bg-amber" },
            { label: "Card utilization", value: 72, tone: "bg-brand-400" },
          ].map((row) => (
            <div key={row.label}>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-white/45">{row.label}</span>
                <span className="text-white/60">{row.value}/100</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                <div className={cn("h-full rounded-full", row.tone)} style={{ width: `${row.value}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/[0.07] bg-black/20 p-3">
          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-300" />
          <p className="text-[10.5px] leading-relaxed text-white/50">
            Restaurants are up $46 this month. Trimming $40 would free $480 a year — while your card still costs 24.5%
            APR.
          </p>
        </div>
      </div>
    </div>
  );
}

export function AuthPanel({
  configured,
  next,
  initialError,
}: {
  configured: boolean;
  next: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    initialError === "auth" ? "That sign-in link is invalid or has expired. Try again." : null,
  );
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase is not configured for this deployment. Use the demo workspace instead.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.push(next);
        router.refresh();
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          router.push(next);
          router.refresh();
        } else {
          setMessage("Check your inbox to confirm your email, then sign in. Your data will be waiting.");
        }
      }
    } catch (caught) {
      const messageText = caught instanceof Error ? caught.message : "Something went wrong. Try again.";
      setError(messageText);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="relative mx-auto grid min-h-screen w-full max-w-[1280px] items-center gap-12 px-5 py-10 lg:grid-cols-2 lg:px-10">
        <div className="hidden lg:block">
          <Logo />
          <div className="mt-10">
            <div className="mb-6 flex items-center gap-3">
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-300/20 bg-violet-500/[0.08]">
                <Poyo size={44} variant="mark" />
                <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-mint ring-2 ring-ink-950" />
              </div>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-violet-200/60">
                  Poyo · companion online
                </p>
                <p className="mt-1 text-[11px] text-white/40">
                  Your guide through every number.
                </p>
              </div>
            </div>
            <Badge tone="violet" dot>Your bank, finally on your side</Badge>
            <h1 className="mt-5 max-w-lg font-display text-[42px] font-bold leading-[1.08] tracking-tight text-white">
              Your money,
              <br />
              <span className="text-gradient">finally making sense.</span>
            </h1>
            <p className="mt-5 max-w-md text-[13.5px] leading-relaxed text-white/45">
              PoyoVault brings every account into one picture, explains your financial health and turns the numbers
              into a plan you can actually follow.
            </p>
            <div className="mt-7 space-y-3">
              {[
                { icon: Wallet, text: "Every account, every institution, one balance sheet" },
                { icon: TrendingUp, text: "A score that shows exactly what helps and hurts it" },
                { icon: Compass, text: "Advice grounded in your transactions, not generic tips" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.05] text-violet-300">
                    <item.icon className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-[12px] text-white/50">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
          <ProductPreview />
          <p className="mt-8 flex items-center gap-2 text-[10px] text-white/25">
            <ShieldCheck className="h-3.5 w-3.5 text-mint/60" />
            Read-only connections · row-level data isolation · no bank credentials stored
          </p>
        </div>

        <div className="mx-auto w-full max-w-[430px]">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo />
          </div>
          <div className="surface border-white/[0.09] bg-ink-850/70 p-6 sm:p-7">
            {configured ? (
              <>
                <div className="flex items-center gap-1 rounded-xl border border-white/[0.07] bg-black/20 p-1">
                  {(["signin", "signup"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setMode(option);
                        setError(null);
                        setMessage(null);
                      }}
                      className={cn(
                        "flex-1 rounded-lg py-2 text-[12px] font-medium transition",
                        mode === option ? "bg-white/[0.09] text-white shadow-sm" : "text-white/40 hover:text-white/75",
                      )}
                    >
                      {option === "signin" ? "Sign in" : "Create account"}
                    </button>
                  ))}
                </div>

                <h2 className="mt-5 font-display text-xl font-semibold tracking-tight text-white">
                  {mode === "signin" ? "Welcome back" : "Start your financial picture"}
                </h2>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/40">
                  {mode === "signin"
                    ? "Sign in to see your accounts, score and personalised plan."
                    : "Your account will be empty until you connect or seed accounts."}
                </p>

                <form onSubmit={submit} className="mt-5 space-y-3.5">
                  {mode === "signup" ? (
                    <div>
                      <label htmlFor="fullName" className="field-label">Full name</label>
                      <input
                        id="fullName"
                        className="field"
                        autoComplete="name"
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        placeholder="Maya Chen"
                        required
                      />
                    </div>
                  ) : null}
                  <div>
                    <label htmlFor="email" className="field-label">Email</label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/25" />
                      <input
                        id="email"
                        type="email"
                        className="field pl-9"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="password" className="field-label">Password</label>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/25" />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        className="field pl-9 pr-9"
                        autoComplete={mode === "signin" ? "current-password" : "new-password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 transition hover:text-white/60"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {error ? (
                    <p className="rounded-lg border border-coral/20 bg-coral/[0.06] px-3 py-2 text-[10.5px] leading-relaxed text-coral">
                      {error}
                    </p>
                  ) : null}
                  {message ? (
                    <p className="rounded-lg border border-mint/20 bg-mint/[0.06] px-3 py-2 text-[10.5px] leading-relaxed text-mint">
                      {message}
                    </p>
                  ) : null}

                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
                    {!loading ? <ArrowRight className="h-4 w-4" /> : null}
                  </Button>
                </form>

                <p className="mt-4 text-center text-[9.5px] leading-relaxed text-white/25">
                  Protected by Supabase Auth. PoyoVault never sees or stores your bank credentials. By continuing you
                  acknowledge this is a prototype using simulated account data.
                </p>
              </>
            ) : (
              <>
                <Badge tone="amber" dot>Demo mode active</Badge>
                <h2 className="mt-4 font-display text-xl font-semibold tracking-tight text-white">
                  Explore PoyoVault without an account
                </h2>
                <p className="mt-2 text-[12px] leading-relaxed text-white/45">
                  Supabase credentials are not configured for this deployment, so the full product is running on a
                  curated sample customer. Every dashboard, calculation and recommendation is live — changes are stored
                  in this browser.
                </p>

                <Link
                  href="/"
                  className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-[13px] font-medium text-white shadow-sm transition hover:bg-violet-500"
                >
                  Explore the demo workspace <ArrowRight className="h-4 w-4" />
                </Link>

                <div className="mt-5 space-y-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                  <p className="flex items-center gap-2 text-[11.5px] font-medium text-white/75">
                    <Check className="h-3.5 w-3.5 text-mint" /> Connect your own Supabase project
                  </p>
                  <ol className="list-decimal space-y-1.5 pl-4 text-[10.5px] leading-relaxed text-white/40">
                    <li>
                      Run <code className="rounded bg-black/30 px-1 text-white/60">supabase/schema.sql</code> in the SQL editor.
                    </li>
                    <li>
                      Add <code className="rounded bg-black/30 px-1 text-white/60">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                      <code className="rounded bg-black/30 px-1 text-white/60">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
                      <code className="rounded bg-black/30 px-1 text-white/60">.env.local</code>.
                    </li>
                    <li>Restart the app, sign up, then optionally run the seed script.</li>
                  </ol>
                </div>

                <InfoNote className="mt-4">
                  Sign-in and persistence switch on automatically when those variables exist. No code changes are
                  needed, and no real bank integrations are used.
                </InfoNote>
              </>
            )}
          </div>
          <p className="mt-5 text-center text-[9.5px] text-white/20">
            PoyoVault is an educational prototype, not a bank or a licensed adviser.
          </p>
        </div>
      </div>
    </div>
  );
}
