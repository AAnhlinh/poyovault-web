import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { FinancialProfile } from "@/lib/types";
import {
  getCompleteMonths,
  getDashboardMetrics,
  getMonthlyHistory,
} from "@/lib/finance/aggregate";
import { formatCurrency, formatDate, formatPercent } from "@/lib/finance/format";
import { Sparkline } from "@/components/charts/sparkline";
import { cn } from "@/lib/utils";

function Figure({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: number;
  detail: string;
  tone?: "default" | "coral" | "mint";
}) {
  return (
    <div className="min-w-0 border-t border-white/[0.07] pt-2.5">
      <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-white/30">{label}</p>
      <p
        className={cn(
          "num mt-1 text-[14px] font-semibold",
          tone === "coral" ? "text-coral" : tone === "mint" ? "text-mint" : "text-white/85",
        )}
      >
        {formatCurrency(value)}
      </p>
      <p className="mt-0.5 text-[9px] text-white/25">{detail}</p>
    </div>
  );
}

function FlowRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "mint" | "coral";
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-white/[0.05] py-1.5 first:border-t-0">
      <span className="text-[10.5px] text-white/40">{label}</span>
      <span
        className={cn(
          "num text-[11px] font-semibold",
          tone === "mint" ? "text-mint" : tone === "coral" ? "text-coral" : "text-white/75",
        )}
      >
        {value >= 0 ? "" : "−"}
        {formatCurrency(Math.abs(value))}
      </span>
    </div>
  );
}

export function PortfolioSummary({ profile }: { profile: FinancialProfile }) {
  const metrics = getDashboardMetrics(profile);
  const history = getCompleteMonths(getMonthlyHistory(profile));
  const assets = metrics.checkingBalance + metrics.totalSavings;
  const position = assets + metrics.totalDebt;
  const assetShare = position > 0 ? (assets / position) * 100 : 0;
  const netFlow = history.map((month) => month.netCashFlow);
  const averageNet =
    netFlow.length > 0 ? netFlow.reduce((sum, value) => sum + value, 0) / netFlow.length : 0;

  return (
    <section className="surface overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-2.5 sm:px-5">
        <p className="label">Portfolio summary</p>
        <div className="flex items-center gap-3 text-[9px] uppercase tracking-[0.12em] text-white/25">
          <span className="font-mono">As of {formatDate(profile.asOf, "short")}</span>
          <Link
            href="/accounts"
            className="inline-flex items-center gap-1 normal-case tracking-normal text-violet-300 hover:text-violet-200"
          >
            All accounts <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[1.02fr_1fr]">
        <div>
          <p className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-white/30">
            Total balance
          </p>
          <p className="num mt-1.5 font-display text-[36px] font-semibold leading-none tracking-tight text-white">
            {formatCurrency(assets)}
          </p>
          <p className="mt-1.5 text-[10px] text-white/35">
            Cash and savings across your connected accounts.
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-white/30">
            Net position{" "}
            <span
              className={cn(
                "num font-semibold",
                metrics.netWorth >= 0 ? "text-mint" : "text-white/60",
              )}
            >
              {formatCurrency(metrics.netWorth)}
            </span>{" "}
            after {formatCurrency(metrics.totalDebt)} of debt. Your home's value isn't included.
          </p>

          <div className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
            <span className="bg-mint/80" style={{ width: `${assetShare}%` }} />
            <span className="bg-coral/60" style={{ width: `${100 - assetShare}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[8.5px] uppercase tracking-[0.1em] text-white/25">
            <span>Own {formatCurrency(assets)}</span>
            <span>Owe {formatCurrency(metrics.totalDebt)}</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            <Figure
              label="Cash"
              value={metrics.checkingBalance}
              detail="checking"
              tone="mint"
            />
            <Figure
              label="Savings"
              value={metrics.totalSavings}
              detail={`${metrics.emergencyMonths.toFixed(1)} months covered`}
            />
            <Figure
              label="Card debt"
              value={metrics.creditCardBalance}
              detail={`${formatPercent(metrics.utilization, 0)} of limit`}
              tone="coral"
            />
            <Figure label="Loans" value={metrics.loanBalance} detail="remaining balance" />
          </div>
        </div>

        <div className="border-t border-white/[0.06] pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <div className="flex items-center justify-between gap-2">
            <p className="label">Cash flow · 6 months</p>
            <span
              className={cn(
                "num text-[10px] font-semibold",
                averageNet >= 0 ? "text-mint" : "text-coral",
              )}
            >
              {averageNet >= 0 ? "+" : "−"}
              {formatCurrency(Math.abs(averageNet))} / mo
            </span>
          </div>
          <div className="mt-2.5">
            <Sparkline values={netFlow} color="#5EEAD4" width={240} height={62} />
          </div>
          <div className="mt-3">
            <FlowRow label="Monthly income" value={metrics.monthlyIncome} tone="mint" />
            <FlowRow label="Spending + required payments" value={-metrics.monthlyExpenses} />
            <FlowRow label="Left over" value={metrics.disposableIncome} tone="mint" />
          </div>
          <p className="mt-2 text-[9px] leading-relaxed text-white/25">
            Required debt payments are included in spending. Three-month averages from your connected
            accounts.
          </p>
        </div>
      </div>
    </section>
  );
}
