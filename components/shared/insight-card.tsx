import Link from "next/link";
import { ArrowUpRight, AlertTriangle, CheckCircle2, Info, Lightbulb } from "lucide-react";
import type { Insight, InsightSeverity } from "@/lib/finance/insights";
import { formatCurrency } from "@/lib/finance/format";
import { PoyoAskButton } from "@/components/shared/poyo-chat";
import { cn } from "@/lib/utils";

const TONE: Record<
  InsightSeverity,
  { rail: string; text: string; label: string }
> = {
  warning: { rail: "bg-coral", text: "text-coral", label: "Fix this" },
  opportunity: { rail: "bg-amber", text: "text-amber", label: "Worth doing" },
  positive: { rail: "bg-mint", text: "text-mint", label: "Going well" },
  info: { rail: "bg-brand-400", text: "text-brand-300", label: "Worth knowing" },
};

const ICON = {
  warning: AlertTriangle,
  opportunity: Lightbulb,
  positive: CheckCircle2,
  info: Info,
};

export function InsightCard({
  insight,
  compact = false,
}: {
  insight: Insight;
  compact?: boolean;
}) {
  const tone = TONE[insight.severity];
  const Icon = ICON[insight.severity];

  return (
    <article className="group relative overflow-hidden rounded-xl border border-white/[0.08] bg-ink-900/60 transition duration-200 hover:border-white/[0.14]">
      <span className={cn("absolute inset-y-0 left-0 w-[3px]", tone.rail)} aria-hidden />
      <div className="p-3.5 pl-4">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.14em]",
              tone.text,
            )}
          >
            <Icon className="h-3 w-3" strokeWidth={2} />
            {tone.label}
          </span>
          {insight.annualImpact ? (
            <span className="num rounded border border-white/[0.07] bg-black/20 px-1.5 py-0.5 text-[9px] text-white/40">
              {formatCurrency(insight.annualImpact)} / yr
            </span>
          ) : null}
        </div>
        <h3 className="mt-2 font-display text-[13.5px] font-semibold leading-snug tracking-tight text-white">
          {insight.title}
        </h3>
        <p
          className={cn(
            "mt-1.5 text-[11px] leading-relaxed text-white/45",
            compact && "line-clamp-3",
          )}
        >
          {insight.body}
        </p>
        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-white/[0.05] pt-2.5">
          <Link
            href={insight.action.href}
            className="inline-flex items-center gap-1 text-[10px] font-medium text-white/55 transition hover:text-white"
          >
            {insight.action.label}
            <ArrowUpRight className="h-3 w-3" />
          </Link>
          <PoyoAskButton question={`${insight.title}. What should I do about this?`}>
            Ask Poyo
          </PoyoAskButton>
        </div>
      </div>
    </article>
  );
}
