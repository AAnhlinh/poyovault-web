"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  FileWarning,
  Gift,
  HelpCircle,
  KeyRound,
  Landmark,
  ListChecks,
  Loader2,
  LockKeyhole,
  MessageSquareWarning,
  PhoneCall,
  PhoneOff,
  RotateCcw,
  ScanSearch,
  SearchX,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wallet,
  XCircle,
} from "lucide-react";
import { useFinance } from "@/components/providers/finance-provider";
import {
  analyzeCallTranscript,
  type FinancialCheck,
  type FinancialCheckStatus,
  type ScamAnalysis,
  type ScamFinding,
  type ScamRiskLevel,
  type ScamSeverity,
} from "@/lib/ai/scam";
import { SCAM_EXAMPLES } from "@/lib/data/scam-examples";
import { formatCurrency, formatDate } from "@/lib/finance/format";
import { Badge, Button, Card, CardHeader, InfoNote, Progress } from "@/components/ui/primitives";
import { CallLogPanel } from "@/components/scam/call-log-panel";
import { cn } from "@/lib/utils";

const RISK_META: Record<
  ScamRiskLevel,
  {
    label: string;
    tone: "mint" | "amber" | "coral";
    progress: "mint" | "amber" | "coral";
    icon: LucideIcon;
    panel: string;
  }
> = {
  low: {
    label: "Low risk",
    tone: "mint",
    progress: "mint",
    icon: ShieldCheck,
    panel: "border-mint/20 bg-mint/[0.055]",
  },
  medium: {
    label: "Medium risk",
    tone: "amber",
    progress: "amber",
    icon: AlertTriangle,
    panel: "border-amber/25 bg-amber/[0.07]",
  },
  high: {
    label: "High risk",
    tone: "coral",
    progress: "coral",
    icon: ShieldAlert,
    panel: "border-coral/25 bg-coral/[0.09]",
  },
};

const SEVERITY_META: Record<
  ScamSeverity,
  { label: string; tone: "neutral" | "amber" | "coral" }
> = {
  low: { label: "Low signal", tone: "neutral" },
  medium: { label: "Medium", tone: "amber" },
  high: { label: "High", tone: "coral" },
};

const CATEGORY_META: Record<
  ScamFinding["category"],
  { label: string; icon: LucideIcon; tile: string }
> = {
  urgency: { label: "Urgency", icon: Clock, tile: "bg-amber/10 text-amber" },
  sensitive: { label: "Credential request", icon: KeyRound, tile: "bg-coral/10 text-coral" },
  payment: { label: "Payment instruction", icon: Send, tile: "bg-coral/10 text-coral" },
  impersonation: { label: "Identity claim", icon: Landmark, tile: "bg-violet-500/12 text-violet-300" },
  pressure: { label: "Pressure tactic", icon: MessageSquareWarning, tile: "bg-amber/10 text-amber" },
  isolation: { label: "Isolation tactic", icon: PhoneOff, tile: "bg-coral/10 text-coral" },
  contradiction: { label: "Records mismatch", icon: FileWarning, tile: "bg-brand-500/10 text-brand-300" },
};

const CHECK_META: Record<
  FinancialCheckStatus,
  { label: string; tone: "mint" | "amber" | "coral" | "neutral"; icon: LucideIcon }
> = {
  matched: { label: "Found in history", tone: "mint", icon: CheckCircle2 },
  "not-found": { label: "Not found", tone: "amber", icon: SearchX },
  inconsistent: { label: "Doesn't match", tone: "coral", icon: XCircle },
  unverifiable: { label: "Can't verify", tone: "neutral", icon: HelpCircle },
};

const EXAMPLE_ICONS: Record<string, LucideIcon> = {
  bank_fraud: Landmark,
  government_threat: ShieldAlert,
  tech_support: MessageSquareWarning,
  legitimate_bank: ShieldCheck,
};

const REVIEW_ITEMS = [
  {
    icon: Clock,
    title: "Urgency and pressure",
    description: "Countdowns, final notices and demands to act right now.",
  },
  {
    icon: KeyRound,
    title: "Sensitive requests",
    description: "Codes, passwords, PINs, card numbers and remote access.",
  },
  {
    icon: Send,
    title: "Payment instructions",
    description: "Gift cards, wires, crypto, payment apps or a so-called safe account.",
  },
  {
    icon: Landmark,
    title: "Institutional claims",
    description: "Bank, government and tech-support impersonation language.",
  },
  {
    icon: MessageSquareWarning,
    title: "Threats and isolation",
    description: "Arrest threats, secrecy and instructions to stay on the line.",
  },
  {
    icon: FileWarning,
    title: "Record mismatches",
    description: "Transaction and balance claims compared with your connected history.",
  },
];

function ReportStat({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon;
  value: string | number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2">
      <Icon className="h-3.5 w-3.5 text-white/40" />
      <span className="num text-[13px] font-semibold text-white/90">{value}</span>
      <span className="text-[9.5px] text-white/35">{label}</span>
    </div>
  );
}

function FindingItem({ finding }: { finding: ScamFinding }) {
  const meta = CATEGORY_META[finding.category];
  const Icon = meta.icon;
  const severity = SEVERITY_META[finding.severity];

  return (
    <article className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl", meta.tile)}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[12.5px] font-medium text-white/90">{finding.label}</p>
            <p className="mt-0.5 text-[9px] uppercase tracking-[0.12em] text-white/28">{meta.label}</p>
          </div>
        </div>
        <Badge tone={severity.tone}>{severity.label}</Badge>
      </div>

      <div className="mt-3 space-y-2">
        {finding.quotes.map((quote, index) => (
          <blockquote
            key={`${finding.id}_${index}`}
            className="border-l-2 border-violet-400/35 pl-3 text-[11.5px] italic leading-relaxed text-white/55"
          >
            “{quote}”
          </blockquote>
        ))}
      </div>
      <p className="mt-2.5 text-[10.5px] leading-relaxed text-white/38">{finding.explanation}</p>
    </article>
  );
}

function CheckItem({ check }: { check: FinancialCheck }) {
  const meta = CHECK_META[check.status];
  const Icon = meta.icon;
  const title =
    check.kind === "transaction"
      ? "Transaction claim"
      : check.kind === "balance"
        ? "Balance claim"
        : "Account reference";

  return (
    <article className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg",
              check.status === "matched"
                ? "bg-mint/10 text-mint"
                : check.status === "inconsistent"
                  ? "bg-coral/10 text-coral"
                  : check.status === "not-found"
                    ? "bg-amber/10 text-amber"
                    : "bg-white/[0.06] text-white/45",
            )}
          >
            <FileText className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-[11.5px] font-medium text-white/80">{title}</p>
            <p className="num mt-0.5 text-[12px] font-semibold text-white/90">
              {formatCurrency(check.amount, { cents: true })}
            </p>
          </div>
        </div>
        <Badge tone={meta.tone} dot>
          {meta.label}
        </Badge>
      </div>

      <p className="mt-2.5 text-[10px] italic leading-relaxed text-white/32">“{check.claim}”</p>
      <p className="mt-2 text-[10.5px] leading-relaxed text-white/45">{check.detail}</p>

      {check.evidence?.length ? (
        <div className="mt-2.5 space-y-1.5">
          {check.evidence.map((item) => (
            <div
              key={`${item.merchant}_${item.date}_${item.amount}`}
              className="rounded-xl border border-mint/12 bg-mint/[0.035] px-3 py-2"
            >
              <div className="flex items-center justify-between gap-3 text-[10.5px]">
                <span className="truncate font-medium text-white/70">{item.merchant}</span>
                <span className="num shrink-0 text-mint">
                  {formatCurrency(item.amount, { cents: true })}
                </span>
              </div>
              <p className="mt-0.5 truncate text-[9px] text-white/30">
                {formatDate(item.date)} · {item.account} · {item.category}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function ScamProtectionView() {
  const { profile } = useFinance();
  const [transcript, setTranscript] = useState("");
  const [analysis, setAnalysis] = useState<ScamAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedExample, setSelectedExample] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const wordCount = useMemo(
    () => (transcript.trim() ? transcript.trim().split(/\s+/).length : 0),
    [transcript],
  );
  const checkingTotal = profile.accounts
    .filter((account) => account.type === "checking")
    .reduce((sum, account) => sum + account.balance, 0);
  const cardTotal = profile.accounts
    .filter((account) => account.type === "credit_card")
    .reduce((sum, account) => sum + account.balance, 0);
  const recentTransactions = useMemo(
    () =>
      [...profile.transactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3),
    [profile.transactions],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!analysis) return;
    const frame = window.requestAnimationFrame(() => {
      reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [analysis]);

  function runAnalysis(text = transcript) {
    const clean = text.trim();
    if (clean.length < 30) {
      setError("Paste at least a few sentences so PoyoVault has enough context to analyze.");
      setAnalysis(null);
      return;
    }
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setError(null);
    setAnalysis(null);
    setAnalyzing(true);
    timerRef.current = window.setTimeout(() => {
      setAnalysis(analyzeCallTranscript(clean, profile));
      setAnalyzing(false);
      timerRef.current = null;
    }, 850);
  }

  function loadExample(example: (typeof SCAM_EXAMPLES)[number]) {
    setTranscript(example.transcript);
    setSelectedExample(example.id);
    setError(null);
    runAnalysis(example.transcript);
  }

  function clear() {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    setTranscript("");
    setSelectedExample(null);
    setAnalysis(null);
    setAnalyzing(false);
    setError(null);
  }

  const risk = analysis ? RISK_META[analysis.risk] : null;
  const RiskIcon = risk?.icon;

  return (
    <div className="space-y-4 sm:space-y-5">
      <Card className="relative overflow-hidden p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/30 to-brand-500/20 text-violet-200 ring-1 ring-white/10">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="violet" dot>
                Simulated AI
              </Badge>
              <Badge tone="neutral">Local analysis</Badge>
            </div>
            <h2 className="mt-3 font-display text-[22px] font-semibold tracking-tight text-white sm:text-[26px]">
              Check a call before you act.
            </h2>
            <p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-white/45 sm:text-[13px]">
              Paste what the caller said, or open a logged call. PoyoVault looks for pressure tactics, credential
              requests and payment instructions, then compares amounts and account references with your connected
              sample history.
            </p>
          </div>
          <div className="hidden shrink-0 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[9.5px] text-white/35 lg:flex">
            <LockKeyhole className="h-3 w-3 text-mint/70" />
            No audio access
          </div>
        </div>
      </Card>

      <CallLogPanel />

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-8">
          <Card className="p-5 sm:p-6">
            <CardHeader
              title="Paste the call transcript"
              description="Include what both sides said if you can. The caller's exact wording is what matters."
              action={
                <Badge
                  tone={analyzing ? "violet" : transcript.trim() ? "mint" : "neutral"}
                  dot
                >
                  {analyzing ? "Analyzing" : transcript.trim() ? "Ready" : "Awaiting transcript"}
                </Badge>
              }
            />

            <div className="mt-4">
              <label htmlFor="scam-transcript" className="field-label">
                What was said on the call
              </label>
              <textarea
                id="scam-transcript"
                value={transcript}
                onChange={(event) => {
                  setTranscript(event.target.value);
                  setSelectedExample(null);
                  if (analysis) setAnalysis(null);
                  if (error) setError(null);
                }}
                maxLength={8000}
                rows={9}
                disabled={analyzing}
                placeholder={`Caller: This is the fraud department. We detected a suspicious $2,000 transaction...\nCustomer: I didn't make that purchase.\nCaller: We need to act immediately. Read me the code...`}
                aria-describedby="scam-privacy scam-error"
                className="mt-2 min-h-[210px] w-full resize-y rounded-2xl border border-white/[0.09] bg-black/25 px-4 py-3.5 text-[12.5px] leading-relaxed text-white/70 transition placeholder:text-white/18 focus:border-violet-400/35 focus:outline-none disabled:opacity-60"
              />
              <div className="mt-1.5 flex items-center justify-between gap-3 text-[9.5px] text-white/25">
                <span>
                  {wordCount} words · {transcript.length.toLocaleString()}/8,000 characters
                </span>
                <button
                  type="button"
                  onClick={clear}
                  disabled={!transcript && !analysis && !analyzing}
                  className="inline-flex items-center gap-1 transition hover:text-white/60 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <RotateCcw className="h-3 w-3" /> Clear
                </button>
              </div>
            </div>

            {error ? (
              <p id="scam-error" className="mt-2 text-[10.5px] text-coral">
                {error}
              </p>
            ) : null}

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p id="scam-privacy" className="flex items-start gap-2 text-[9.5px] leading-relaxed text-white/28">
                <LockKeyhole className="mt-0.5 h-3 w-3 shrink-0 text-mint/60" />
                Analyzed locally in this browser. The transcript is not saved, uploaded or sent to a model.
              </p>
              <Button
                type="button"
                size="lg"
                onClick={() => runAnalysis()}
                disabled={analyzing}
                className="w-full shrink-0 sm:w-auto"
              >
                {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
                {analyzing ? "Analyzing call…" : "Analyze Call"}
              </Button>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <CardHeader
              title="Try a realistic example"
              description="Load a fictional call to see how the analysis changes. You can edit the transcript afterward."
              action={<Badge tone="neutral">{SCAM_EXAMPLES.length} examples</Badge>}
            />
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {SCAM_EXAMPLES.map((example) => {
                const Icon = EXAMPLE_ICONS[example.id] ?? PhoneCall;
                const selected = selectedExample === example.id;
                return (
                  <button
                    key={example.id}
                    type="button"
                    onClick={() => loadExample(example)}
                    disabled={analyzing}
                    className={cn(
                      "group flex items-start gap-3 rounded-2xl border p-3.5 text-left transition disabled:opacity-50",
                      selected
                        ? "border-violet-400/35 bg-violet-500/[0.09]"
                        : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                        selected ? "bg-violet-500/15 text-violet-200" : "bg-white/[0.05] text-white/45",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] font-medium text-white/85">{example.title}</p>
                        <ArrowRight
                          className={cn(
                            "h-3 w-3 shrink-0 transition",
                            selected ? "text-violet-300" : "text-white/20 group-hover:text-white/50",
                          )}
                        />
                      </div>
                      <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-white/35">
                        {example.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-[9.5px] text-white/25">
              Fictional scenarios only. No real people, phone numbers or institutions are contacted.
            </p>
          </Card>
        </div>

        <div className="space-y-4 xl:col-span-4">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <CardHeader
                title="Your financial context"
                description="The comparison uses the simulated accounts already loaded in PoyoVault."
              />
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-300">
                <Wallet className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5">
                <p className="label">Transactions</p>
                <p className="num mt-1 text-[15px] font-semibold text-white">{profile.transactions.length}</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5">
                <p className="label">Accounts</p>
                <p className="num mt-1 text-[15px] font-semibold text-white">{profile.accounts.length}</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5">
                <p className="label">Checking</p>
                <p className="num mt-1 text-[15px] font-semibold text-white">
                  {formatCurrency(checkingTotal, { compact: true })}
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5">
                <p className="label">Card debt</p>
                <p className="num mt-1 text-[15px] font-semibold text-white">
                  {formatCurrency(cardTotal, { compact: true })}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between">
                <p className="label">Recent activity</p>
                <Link href="/spending" className="text-[9.5px] text-violet-300 hover:text-violet-200">
                  View all
                </Link>
              </div>
              <div className="mt-2 space-y-1.5">
                {recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-2.5 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[10.5px] text-white/65">{transaction.merchant}</p>
                      <p className="text-[9px] text-white/25">{formatDate(transaction.date, "short")}</p>
                    </div>
                    <span className="num shrink-0 text-[10.5px] text-white/55">
                      {formatCurrency(transaction.amount, { cents: true })}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-3 text-[9px] leading-relaxed text-white/25">
              Claims are checked against the last 120 days. A missing transaction is not treated as proof of fraud.
            </p>
          </Card>

          <Card className="p-5">
            <CardHeader
              title="What the analysis checks"
              description="Language and record consistency, not the caller's real identity."
            />
            <div className="mt-4 space-y-3">
              {REVIEW_ITEMS.map((item) => (
                <div key={item.title} className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-white/40">
                    <item.icon className="h-3 w-3" />
                  </div>
                  <div>
                    <p className="text-[10.5px] font-medium text-white/70">{item.title}</p>
                    <p className="mt-0.5 text-[9.5px] leading-relaxed text-white/32">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <InfoNote icon={<ShieldAlert className="h-4 w-4" />}>
            A low score is not a guarantee of legitimacy. Caller ID can be spoofed, and a calm script can still be a
            scam. Verify through a number or app you open yourself.
          </InfoNote>
        </div>
      </div>

      {analyzing ? (
        <Card className="p-5 sm:p-6" aria-live="polite">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/12 text-violet-300">
              <ScanSearch className="h-4.5 w-4.5 animate-pulse-soft" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-white/85">Reading the transcript…</p>
              <p className="mt-0.5 text-[10.5px] text-white/35">
                Checking language patterns and comparing amounts with {profile.transactions.length} sample
                transactions.
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-2 w-3/4 animate-pulse-soft rounded-full bg-white/[0.06]" />
            <div className="h-2 w-1/2 animate-pulse-soft rounded-full bg-white/[0.05]" />
            <div className="h-2 w-2/3 animate-pulse-soft rounded-full bg-white/[0.04]" />
          </div>
        </Card>
      ) : null}

      {analysis && risk && RiskIcon ? (
        <div ref={reportRef} className="scroll-mt-24 space-y-4" aria-live="polite">
          <Card className={cn("relative overflow-hidden p-5 sm:p-6", risk.panel)}>
            <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/[0.03] blur-2xl" />
            <div className="relative">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={risk.tone} dot>
                    {risk.label}
                  </Badge>
                  <Badge tone="neutral">Simulated AI report</Badge>
                </div>
                <span className="text-[9.5px] text-white/25">Analyzed in this browser · not a guarantee</span>
              </div>

              <div className="mt-4 grid gap-5 lg:grid-cols-[1.35fr_0.65fr] lg:items-center">
                <div>
                  <h2 className="font-display text-[24px] font-semibold tracking-tight text-white sm:text-[28px]">
                    {analysis.headline}
                  </h2>
                  <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-white/55">{analysis.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <ReportStat
                      icon={AlertTriangle}
                      value={analysis.findings.length}
                      label="signals"
                    />
                    <ReportStat
                      icon={ShieldAlert}
                      value={analysis.stats.critical}
                      label="high priority"
                    />
                    <ReportStat
                      icon={FileText}
                      value={analysis.stats.claims}
                      label="claims checked"
                    />
                    <ReportStat icon={Clock} value={analysis.stats.words} label="words" />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="label">Risk score</p>
                      <p className="num mt-1 font-display text-[32px] font-semibold leading-none tracking-tight text-white">
                        {analysis.score}
                        <span className="ml-1 text-[13px] font-medium text-white/30">/100</span>
                      </p>
                    </div>
                    <RiskIcon className={cn("h-7 w-7", risk.tone === "coral" ? "text-coral/70" : risk.tone === "amber" ? "text-amber/70" : "text-mint/70")} />
                  </div>
                  <Progress
                    value={analysis.score}
                    tone={risk.progress}
                    className="mt-3"
                    label="Scam risk score"
                  />
                  <p className="mt-2 text-[9px] leading-relaxed text-white/28">
                    Based on call language and consistency with your sample records.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 xl:grid-cols-12">
            <Card className="p-5 sm:p-6 xl:col-span-7">
              <CardHeader
                title="Suspicious statements"
                description="Specific language PoyoVault flagged in the transcript, with the reasoning behind each signal."
                action={
                  <Badge tone={analysis.findings.length ? "amber" : "mint"}>
                    {analysis.findings.length} found
                  </Badge>
                }
              />

              {analysis.findings.length ? (
                <div className="mt-4 space-y-3">
                  {analysis.findings.map((finding) => (
                    <FindingItem key={finding.id} finding={finding} />
                  ))}
                </div>
              ) : (
                <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-white/10 px-5 py-8 text-center">
                  <ShieldCheck className="h-7 w-7 text-mint/70" />
                  <p className="mt-2 text-[12px] font-medium text-white/75">No suspicious statements detected</p>
                  <p className="mt-1 max-w-sm text-[10.5px] leading-relaxed text-white/35">
                    PoyoVault did not find the common pressure, credential or payment patterns it looks for. This is
                    not proof that the caller is legitimate.
                  </p>
                </div>
              )}
            </Card>

            <div className="space-y-4 xl:col-span-5">
              <Card className="p-5 sm:p-6">
                <CardHeader
                  title="Financial cross-check"
                  description="What the caller claimed, compared with the sample accounts and last 120 days of transactions."
                />

                {analysis.financialChecks.length ? (
                  <div className="mt-4 space-y-2.5">
                    {analysis.financialChecks.map((check) => (
                      <CheckItem key={check.id} check={check} />
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center">
                    <HelpCircle className="mx-auto h-5 w-5 text-white/30" />
                    <p className="mt-2 text-[11px] font-medium text-white/60">No specific dollar claim to verify</p>
                    <p className="mt-1 text-[9.5px] leading-relaxed text-white/30">
                      The transcript did not contain a transaction or balance amount that could be compared with your
                      records.
                    </p>
                  </div>
                )}
              </Card>

              <Card className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <CardHeader
                    title="Recommended next steps"
                    description="Practical actions, in priority order."
                  />
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-500/12 text-violet-300">
                    <ListChecks className="h-4 w-4" />
                  </div>
                </div>
                <ol className="mt-4 space-y-3">
                  {analysis.nextSteps.map((step, index) => (
                    <li key={step} className="flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/12 text-[9px] font-semibold text-violet-300">
                        {index + 1}
                      </span>
                      <p className="text-[10.5px] leading-relaxed text-white/50">{step}</p>
                    </li>
                  ))}
                </ol>
                {analysis.risk === "high" ? (
                  <div className="mt-4 rounded-xl border border-coral/20 bg-coral/[0.06] px-3 py-2.5 text-[10px] leading-relaxed text-coral/80">
                    If you are on the call now, hang up. You do not need to be polite, explain yourself or call the
                    number back.
                  </div>
                ) : null}
              </Card>

              <Card className="p-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-mint" />
                  <p className="text-[12px] font-medium text-white/80">Signals that checked out</p>
                </div>
                {analysis.safeSignals.length ? (
                  <ul className="mt-3 space-y-2">
                    {analysis.safeSignals.map((signal) => (
                      <li key={signal} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-mint/70" />
                        <p className="text-[10px] leading-relaxed text-white/38">{signal}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-[10px] leading-relaxed text-white/35">
                    No reassuring signals were found. That does not prove the caller is fraudulent, but there is
                    nothing in this transcript that makes the call safer.
                  </p>
                )}
                <p className="mt-3 text-[9px] leading-relaxed text-white/22">
                  These are context, not clearance. A scammer can mention a real amount or account number to sound
                  convincing.
                </p>
              </Card>
            </div>
          </div>

          <InfoNote icon={<ShieldAlert className="h-4 w-4" />}>
            PoyoVault cannot verify who called, listen to audio or access real phone records. The test dialer can
            transcribe microphone audio in the browser, but this analysis page only reads pasted text. Location
            checks compare the area code with the simulated or GeoIP network origin and can be wrong when numbers are
            ported. This is an educational prototype using fictional banking data. It may miss a scam or flag a
            legitimate call; a missing transaction is not proof of fraud. If you are in immediate danger, contact
            local emergency services.
          </InfoNote>
        </div>
      ) : null}

      {!analysis && !analyzing ? (
        <InfoNote icon={<ShieldAlert className="h-4 w-4" />}>
          Never share a verification code, password or PIN with someone who calls you — even if caller ID shows your
          bank. Hang up and use the number on your card, your bank's app or the agency's official website.
        </InfoNote>
      ) : null}
    </div>
  );
}
