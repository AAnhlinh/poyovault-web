"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUp,
  Lock,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  Zap,
} from "lucide-react";
import { useFinance } from "@/components/providers/finance-provider";
import type { AdvisorMessage } from "@/lib/types";
import { answerQuestion, ADVISOR_STARTERS } from "@/lib/ai/advisor";
import { getDashboardMetrics, getCompleteMonths, getMonthlyHistory } from "@/lib/finance/aggregate";
import { computeHealthScore } from "@/lib/finance/score";
import { formatCurrency, formatPercent } from "@/lib/finance/format";
import { Badge, Button, Card, CardHeader, InfoNote } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

function createMessageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function MessageBubble({
  message,
  onSuggestion,
  suggestionsDisabled,
  isLatest,
}: {
  message: AdvisorMessage;
  onSuggestion: (suggestion: string) => void;
  suggestionsDisabled: boolean;
  isLatest: boolean;
}) {
  const isUser = message.role === "user";
  const time = new Date(message.createdAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className={cn("flex gap-2.5", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-white/[0.07] text-white/55"
            : "bg-gradient-to-br from-violet-500/30 to-brand-500/20 text-violet-200 ring-1 ring-white/10",
        )}
      >
        {isUser ? <UserRound className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
      </div>
      <div className={cn("min-w-0 max-w-[88%]", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[12px] leading-relaxed",
            isUser
              ? "rounded-br-md bg-gradient-to-br from-violet-500/85 to-brand-500/70 text-white"
              : "rounded-bl-md border border-white/[0.07] bg-white/[0.035] text-white/65",
          )}
        >
          {message.content}
        </div>
        <div className={cn("mt-1 flex items-center gap-2 text-[9px]", isUser ? "justify-end" : "")}>
          <span className="text-white/20">{isUser ? "You" : "PoyoVault"} · {time}</span>
          {!isUser ? <span className="rounded bg-white/[0.04] px-1 py-0.5 text-[8px] text-white/25">Grounded in your data</span> : null}
        </div>
        {!isUser && isLatest && message.suggestions?.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={suggestionsDisabled}
                onClick={() => onSuggestion(suggestion)}
                className="rounded-full border border-white/[0.09] bg-white/[0.025] px-2.5 py-1 text-[10px] text-white/50 transition hover:border-violet-400/30 hover:text-white disabled:opacity-40"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AdvisorView() {
  const { profile, chat, appendMessage, updatePreferences } = useFinance();
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);
  const metrics = getDashboardMetrics(profile);
  const score = computeHealthScore(profile);
  const history = getCompleteMonths(getMonthlyHistory(profile));
  const aiEnabled = profile.preferences.aiAnalysis;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat.length, thinking]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  function send(question: string) {
    const trimmed = question.trim();
    if (!trimmed || thinking || !aiEnabled) return;
    const userMessage: AdvisorMessage = {
      id: createMessageId(),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    appendMessage(userMessage);
    setDraft("");
    setThinking(true);

    timeoutRef.current = window.setTimeout(() => {
      const answer = answerQuestion(trimmed, profile);
      appendMessage({
        id: createMessageId(),
        role: "assistant",
        content: answer.content,
        createdAt: new Date().toISOString(),
        suggestions: answer.suggestions,
      });
      setThinking(false);
    }, 750);
  }

  const latestAssistantIndex = chat.reduce(
    (latest, message, index) => (message.role === "assistant" ? index : latest),
    -1,
  );

  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <div className="space-y-4 xl:col-span-8">
        {!aiEnabled ? (
          <Card className="flex flex-col items-center justify-center p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.05] text-white/40">
              <Lock className="h-5 w-5" />
            </div>
            <h2 className="mt-4 font-display text-lg font-semibold text-white">The advisor is paused</h2>
            <p className="mt-2 max-w-md text-[12.5px] leading-relaxed text-white/45">
              AI analysis is switched off in your privacy settings, so PoyoVault is not reading your transactions to
              generate answers. Turn it back on to continue the conversation.
            </p>
            <Button className="mt-5" onClick={() => updatePreferences({ aiAnalysis: true })}>
              Enable AI analysis
            </Button>
            <Link href="/settings" className="mt-3 text-[10.5px] text-violet-300 hover:text-violet-200">
              Review privacy settings
            </Link>
          </Card>
        ) : (
          <Card className="flex h-[calc(100vh-210px)] min-h-[560px] flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/35 to-brand-500/20 ring-1 ring-white/10">
                  <Sparkles className="h-4 w-4 text-violet-200" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-ink-900 bg-mint" />
                </div>
                <div>
                  <h2 className="font-display text-[15px] font-semibold tracking-tight text-white">
                    PoyoVault Advisor
                  </h2>
                  <p className="text-[10px] text-white/35">
                    {profile.accounts.length} accounts · {profile.transactions.length} transactions · 6 months
                  </p>
                </div>
              </div>
              <Badge tone="violet">Simulated AI</Badge>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-5">
              {chat.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isLatest={index === latestAssistantIndex}
                  suggestionsDisabled={thinking}
                  onSuggestion={send}
                />
              ))}

              {thinking ? (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/30 to-brand-500/20 text-violet-200 ring-1 ring-white/10">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-white/[0.07] bg-white/[0.035] px-4 py-3">
                    {[0, 1, 2].map((dot) => (
                      <span
                        key={dot}
                        className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-violet-300"
                        style={{ animationDelay: `${dot * 180}ms` }}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="border-t border-white/[0.06] p-3 sm:p-4">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  send(draft);
                }}
                className="flex items-end gap-2 rounded-2xl border border-white/[0.09] bg-black/20 p-2 transition focus-within:border-violet-400/35"
              >
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      send(draft);
                    }
                  }}
                  rows={1}
                  placeholder="Ask about your score, debt, spending, savings…"
                  className="max-h-28 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-2 text-[12.5px] text-white placeholder:text-white/25 focus:outline-none"
                  aria-label="Ask the financial advisor"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || thinking}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-brand-500 text-white transition hover:brightness-110 disabled:opacity-35"
                  aria-label="Send message"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </form>
              <p className="mt-2 text-center text-[9.5px] text-white/25">
                Answers are generated from your simulated accounts. Educational guidance — not regulated financial advice.
              </p>
            </div>
          </Card>
        )}
      </div>

      <div className="space-y-4 xl:col-span-4">
        <Card className="p-5">
          <CardHeader title="Your snapshot" description="The numbers every answer is built from." />
          <div className="mt-3 divide-y divide-white/[0.05]">
            <div className="flex items-center justify-between py-2.5">
              <span className="text-[11px] text-white/45">Health score</span>
              <span className="flex items-center gap-2">
                <span className="num text-[12px] font-semibold text-white">{score.score}/100</span>
                <Badge tone={score.tone === "mint" ? "mint" : score.tone === "blue" ? "blue" : score.tone === "amber" ? "amber" : "coral"}>
                  {score.band}
                </Badge>
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-[11px] text-white/45">Monthly surplus</span>
              <span className="num text-[12px] font-semibold text-mint">{formatCurrency(metrics.disposableIncome)}</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-[11px] text-white/45">Total debt</span>
              <span className="num text-[12px] font-semibold text-white">{formatCurrency(metrics.totalDebt)}</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-[11px] text-white/45">Emergency cover</span>
              <span className="num text-[12px] font-semibold text-white">{metrics.emergencyMonths.toFixed(1)} months</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-[11px] text-white/45">Credit utilization</span>
              <span className="num text-[12px] font-semibold text-white">{formatPercent(metrics.utilization, 1)}</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-[11px] text-white/45">Savings rate</span>
              <span className="num text-[12px] font-semibold text-white">{formatPercent(metrics.savingsRate, 1)}</span>
            </div>
          </div>
          <div className="mt-3 text-[10px] text-white/25">
            {history.length} complete months of transactions analysed.
          </div>
        </Card>

        <Card className="p-5">
          <CardHeader title="Try asking" description="Each prompt returns specific numbers, not generic tips." />
          <div className="mt-3 flex flex-col gap-1.5">
            {ADVISOR_STARTERS.map((starter) => (
              <button
                key={starter}
                type="button"
                disabled={!aiEnabled || thinking}
                onClick={() => send(starter)}
                className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-left text-[11px] text-white/55 transition hover:border-violet-400/25 hover:text-white disabled:opacity-40"
              >
                {starter}
                <Zap className="h-3 w-3 shrink-0 text-violet-300/60" />
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-mint" />
            <p className="text-[12px] font-medium text-white/80">What the advisor can see</p>
          </div>
          <ul className="mt-3 space-y-2 text-[10.5px] leading-relaxed text-white/40">
            <li>• Account names, balances, rates and due dates</li>
            <li>• Six months of categorised transactions</li>
            <li>• Your goals, preferences and privacy choices</li>
            <li>• Nothing outside the accounts you connected</li>
          </ul>
          <div className="mt-3 border-t border-white/[0.05] pt-3 text-[10px] leading-relaxed text-white/25">
            This prototype uses a deterministic analysis engine, not an external language model. Answers are generated
            locally from your data, and every recommendation cites the numbers behind it.
          </div>
          <Link href="/settings" className="mt-3 inline-flex items-center gap-1 text-[10.5px] text-violet-300 hover:text-violet-200">
            <Settings className="h-3 w-3" /> Manage privacy controls
          </Link>
        </Card>

        <InfoNote icon={<Sparkles className="h-4 w-4" />}>
          PoyoVault does not sell your financial data. Personalized offer matching can be turned off independently of
          AI analysis.
        </InfoNote>
      </div>
    </div>
  );
}
