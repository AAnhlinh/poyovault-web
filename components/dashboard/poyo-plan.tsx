import Link from "next/link";
import { ArrowUpRight, Pause } from "lucide-react";
import type { FinancialProfile } from "@/lib/types";
import { buildPoyoPlan } from "@/lib/finance/priorities";
import { PoyoAskButton } from "@/components/shared/poyo-chat";
import { Poyo } from "@/components/shared/poyo";
import { cn } from "@/lib/utils";

const STEP_TONE: Record<string, string> = {
  critical: "border-coral/25 bg-coral/[0.07] text-coral",
  important: "border-amber/25 bg-amber/[0.07] text-amber",
  good: "border-mint/25 bg-mint/[0.07] text-mint",
};

export function PoyoPlan({ profile }: { profile: FinancialProfile }) {
  const plan = buildPoyoPlan(profile);

  return (
    <section className="surface overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-violet-300/20 bg-violet-500/10">
            <Poyo size={22} variant="mark" animated={false} />
            <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full border border-ink-900 bg-mint" />
          </div>
          <div>
            <h2 className="font-display text-[14px] font-semibold text-white">Poyo&apos;s plan</h2>
            <p className="text-[9.5px] text-white/35">What to do first, and what can wait</p>
          </div>
        </div>
        <span className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-white/35">
          {plan.moves.length} moves
        </span>
      </div>

      <div className="divide-y divide-white/[0.05]">
        {plan.moves.map((move) => (
          <div key={move.id} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  "rounded border px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.12em]",
                  STEP_TONE[move.tone],
                )}
              >
                {move.step}
              </span>
              {move.impact ? (
                <span className="num text-[9px] text-white/30">{move.impact}</span>
              ) : null}
            </div>
            <p className="mt-2 text-[12.5px] font-semibold leading-snug text-white/90">
              {move.title}
            </p>
            <p className="mt-1 text-[10.5px] leading-relaxed text-white/45">{move.detail}</p>
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <Link
                href={move.href}
                className="inline-flex items-center gap-1 text-[10px] font-medium text-violet-300 hover:text-violet-200"
              >
                {move.action} <ArrowUpRight className="h-3 w-3" />
              </Link>
              <PoyoAskButton question={move.question}>Ask why</PoyoAskButton>
            </div>
          </div>
        ))}
      </div>

      {plan.holdOff ? (
        <div className="mx-4 mb-4 rounded-xl border border-amber/20 bg-amber/[0.05] p-3">
          <p className="flex items-center gap-1.5 font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-amber">
            <Pause className="h-3 w-3" /> Hold off for now
          </p>
          <p className="mt-1.5 text-[11px] font-medium text-white/80">{plan.holdOff.title}</p>
          <p className="mt-1 text-[10px] leading-relaxed text-white/40">{plan.holdOff.detail}</p>
          <PoyoAskButton question={plan.holdOff.question} className="mt-2">
            Ask Poyo why
          </PoyoAskButton>
        </div>
      ) : null}

      <div className="border-t border-white/[0.06] p-3">
        <PoyoAskButton
          question="What should I do with my money this month?"
          className="w-full justify-center py-2"
        >
          Talk it through with Poyo
        </PoyoAskButton>
      </div>
    </section>
  );
}
