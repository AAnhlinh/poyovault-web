"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ArrowUp, MessageSquare, X } from "lucide-react";
import { useFinance } from "@/components/providers/finance-provider";
import { answerPoyo } from "@/lib/ai/poyo";
import { buildPoyoGreeting, buildPoyoPlan } from "@/lib/finance/priorities";
import { Poyo } from "@/components/shared/poyo";
import { cn } from "@/lib/utils";

export const POYO_ASK_EVENT = "finsight:poyo-ask";

export function askPoyo(question: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(POYO_ASK_EVENT, { detail: { question } }));
}

export function PoyoAskButton({
  question,
  children = "Ask Poyo",
  className,
}: {
  question: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => askPoyo(question)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-violet-400/25 bg-violet-500/[0.08] px-2.5 py-1 text-[10px] font-medium text-violet-200 transition hover:border-violet-300/40 hover:bg-violet-500/[0.14] hover:text-white",
        className,
      )}
    >
      <Poyo size={16} variant="mark" animated={false} glow={false} />
      {children}
    </button>
  );
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
}

const QUICK_ASKS = [
  "Why does this come first?",
  "What should I hold off on?",
  "Where am I overspending?",
];

function messageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `poyo_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function ChatText({ content }: { content: string }) {
  return (
    <div className="space-y-1.5">
      {content
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .map((line, index) => (
          <p
            key={`${index}-${line.slice(0, 12)}`}
            className={cn("whitespace-pre-wrap", line.trimStart().startsWith("•") && "pl-1.5")}
          >
            {line}
          </p>
        ))}
    </div>
  );
}

export function PoyoChat() {
  const { profile } = useFinance();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);
  const plan = useMemo(() => buildPoyoPlan(profile), [profile]);
  const aiEnabled = profile.preferences.aiAnalysis;
  const latestAssistant = messages.reduce(
    (latest, message, index) => (message.role === "assistant" ? index : latest),
    -1,
  );

  const send = (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || thinking || !aiEnabled) return;
    setMessages((previous) => [
      ...previous,
      { id: messageId(), role: "user", content: trimmed },
    ]);
    setDraft("");
    setThinking(true);
    timeoutRef.current = window.setTimeout(() => {
      const answer = answerPoyo(trimmed, profile);
      setMessages((previous) => [
        ...previous,
        {
          id: messageId(),
          role: "assistant",
          content: answer.content,
          suggestions: answer.suggestions.slice(0, 3),
        },
      ]);
      setThinking(false);
    }, 550);
  };

  // First open seeds a short, personal read of the plan.
  function toggleOpen() {
    setOpen((value) => {
      const next = !value;
      if (next) {
        setTeaser(false);
        setMessages((previous) =>
          previous.length > 0
            ? previous
            : [
                {
                  id: "poyo-greeting",
                  role: "assistant",
                  content: buildPoyoGreeting(profile),
                  suggestions: QUICK_ASKS,
                },
              ],
        );
      }
      return next;
    });
  }

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ question?: string }>).detail;
      setOpen(true);
      setTeaser(false);
      setMessages((previous) => {
        const seeded =
          previous.length > 0
            ? previous
            : [
                {
                  id: "poyo-greeting",
                  role: "assistant" as const,
                  content: buildPoyoGreeting(profile),
                },
              ];
        return seeded;
      });
      if (detail?.question) {
        window.setTimeout(() => send(detail.question!), 60);
      }
    };
    window.addEventListener(POYO_ASK_EVENT, handler);
    return () => window.removeEventListener(POYO_ASK_EVENT, handler);
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, thinking, open]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem("finsight.poyo.teaser") === "seen") return;
    const timer = window.setTimeout(() => setTeaser(true), 2400);
    return () => window.clearTimeout(timer);
  }, []);


  function dismissTeaser() {
    setTeaser(false);
    try {
      window.sessionStorage.setItem("finsight.poyo.teaser", "seen");
    } catch {
      // Storage can be unavailable; the teaser simply reappears next visit.
    }
  }

  const topMove = plan.moves[0];

  return (
    <div className="fixed bottom-20 right-4 z-[60] flex w-[min(380px,calc(100vw-2rem))] flex-col items-end gap-2 lg:bottom-6 lg:right-6">
      {teaser && !open ? (
        <div className="absolute bottom-full right-0 z-10 mb-2 w-[min(300px,calc(100vw-2rem))] rounded-2xl border border-violet-400/20 bg-ink-900/95 p-3 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl">
          <div className="flex items-start gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-violet-300/20 bg-violet-500/10">
              <Poyo size={20} variant="mark" animated={false} glow={false} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[8.5px] font-semibold uppercase tracking-[0.18em] text-violet-200/60">
                Poyo noticed
              </p>
              <p className="mt-1 text-[11.5px] leading-snug text-white/70">
                {topMove ? topMove.title : "Want a second pair of eyes on your accounts?"}
              </p>
            </div>
            <button
              type="button"
              onClick={dismissTeaser}
              aria-label="Dismiss Poyo message"
              className="rounded-md p-1 text-white/30 transition hover:text-white/70"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={toggleOpen}
              className="flex-1 rounded-lg border border-violet-400/25 bg-violet-500/[0.1] py-1.5 text-[10px] font-medium text-violet-200 transition hover:bg-violet-500/[0.16]"
            >
              Show me why
            </button>
            <button
              type="button"
              onClick={dismissTeaser}
              className="rounded-lg px-3 py-1.5 text-[10px] text-white/35 transition hover:text-white/70"
            >
              Later
            </button>
          </div>
        </div>
      ) : null}

      {open ? (
        <section
          role="dialog"
          aria-label="Chat with Poyo"
          className="flex max-h-[min(600px,calc(100dvh-12rem))] w-full flex-col overflow-hidden rounded-lg border border-violet-400/20 bg-ink-950/95 shadow-[0_30px_90px_-24px_rgba(0,0,0,0.95)] backdrop-blur-2xl lg:max-h-[min(600px,calc(100dvh-8rem))]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-violet-300/20 bg-violet-500/10">
                <Poyo size={26} variant="mark" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-ink-950 bg-mint" />
              </div>
              <div>
                <p className="font-display text-[13px] font-semibold text-white">Poyo</p>
                <p className="text-[9.5px] text-white/35">Answers from your accounts</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="rounded border border-violet-400/20 bg-violet-500/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-violet-200/70">
                Simulated
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close Poyo chat"
                className="rounded-lg p-1.5 text-white/35 transition hover:bg-white/[0.06] hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div
            ref={scrollRef}
            aria-live="polite"
            className="min-h-[180px] flex-1 space-y-3 overflow-y-auto px-3.5 py-3.5"
          >
            {messages.map((message, index) => {
              const isUser = message.role === "user";
              return (
                <div key={message.id} className={cn("flex gap-2", isUser && "justify-end")}>
                  {!isUser ? (
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-violet-300/15 bg-violet-500/10">
                      <Poyo size={16} variant="mark" animated={false} glow={false} />
                    </div>
                  ) : null}
                  <div className={cn("min-w-0 max-w-[86%]", isUser && "flex flex-col items-end")}>
                    <div
                      className={cn(
                        "rounded-xl px-3 py-2 text-[11.5px] leading-relaxed",
                        isUser
                          ? "rounded-br-sm bg-gradient-to-br from-violet-500 to-brand-500 text-white"
                          : "rounded-bl-sm border border-white/[0.07] bg-white/[0.035] text-white/65",
                      )}
                    >
                      <ChatText content={message.content} />
                    </div>
                    {!isUser && index === latestAssistant && message.suggestions?.length ? (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {message.suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            disabled={thinking || !aiEnabled}
                            onClick={() => send(suggestion)}
                            className="rounded-full border border-white/[0.09] bg-white/[0.025] px-2 py-1 text-[9.5px] text-white/45 transition hover:border-violet-400/30 hover:text-white disabled:opacity-40"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {thinking ? (
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md border border-violet-300/15 bg-violet-500/10">
                  <Poyo size={16} variant="mark" animated={false} glow={false} />
                </div>
                <div className="flex items-center gap-1 rounded-xl border border-white/[0.07] bg-white/[0.035] px-3 py-2.5">
                  {[0, 1, 2].map((dot) => (
                    <span
                      key={dot}
                      className="h-1 w-1 animate-pulse-soft rounded-full bg-violet-300"
                      style={{ animationDelay: `${dot * 160}ms` }}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {!aiEnabled ? (
            <div className="border-t border-white/[0.07] px-3.5 py-3 text-[10.5px] leading-relaxed text-white/45">
              I'm paused because AI analysis is off.{" "}
              <Link href="/settings" className="text-violet-300 hover:text-violet-200">
                Turn it on in settings
              </Link>{" "}
              and I'll pick this back up.
            </div>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                send(draft);
              }}
              className="border-t border-white/[0.07] p-2.5"
            >
              <div className="flex items-end gap-1.5 rounded-xl border border-white/[0.09] bg-black/25 p-1.5 transition focus-within:border-violet-400/35">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Ask Poyo about your money…"
                  aria-label="Ask Poyo a question"
                  className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-[12px] text-white placeholder:text-white/25 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || thinking}
                  aria-label="Send message"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-brand-500 text-white transition hover:brightness-110 disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-1.5 flex items-center justify-between px-1">
                <p className="text-[8.5px] text-white/20">Prototype guidance, not financial advice.</p>
                <Link href="/advisor" className="text-[8.5px] text-violet-300/70 hover:text-violet-200">
                  Full advisor
                </Link>
              </div>
            </form>
          )}
        </section>
      ) : null}

      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        aria-label={open ? "Close Poyo chat" : "Chat with Poyo"}
        className="group flex items-center gap-3 rounded-full border border-violet-400/25 bg-ink-900/95 py-2 pl-2 pr-4 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.9)] transition hover:border-violet-300/45"
      >
        <span className="relative flex h-11 w-11 items-center justify-center rounded-full border border-violet-300/25 bg-violet-500/10">
          <Poyo size={34} variant="mark" animated={!open} glow={false} />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-mint ring-2 ring-ink-900" />
        </span>
        <span className="text-left">
          <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-white">
            Ask Poyo
            {open ? <X className="h-3.5 w-3.5 text-white/40" /> : <MessageSquare className="h-3.5 w-3.5 text-violet-300/70" />}
          </span>
          <span className="block text-[10px] text-white/35">Your money copilot</span>
        </span>
      </button>
    </div>
  );
}
