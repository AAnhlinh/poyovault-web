"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "./chart-tooltip";
import { formatCurrency } from "@/lib/finance/format";

export interface MonthlyBarPoint {
  label: string;
  income: number;
  expenses: number;
  debtPayments: number;
}

export function MonthlyBars({
  data,
  height = 260,
  showDebt = true,
}: {
  data: MonthlyBarPoint[];
  height?: number;
  showDebt?: boolean;
}) {
  return (
    <div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.055)" />
            <XAxis
              dataKey="label"
              tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              dy={8}
            />
            <YAxis
              tick={{ fill: "rgba(255,255,255,0.28)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) => formatCurrency(value, { compact: true })}
              width={64}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.035)" }} />
            <Bar dataKey="income" name="Income" fill="#5EEAD4" radius={[4, 4, 0, 0]} maxBarSize={18} />
            <Bar dataKey="expenses" name="Spending" fill="#A78BFA" radius={[4, 4, 0, 0]} maxBarSize={18} />
            {showDebt ? (
              <Bar
                dataKey="debtPayments"
                name="Debt payments"
                fill="rgba(99,216,255,0.5)"
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
              />
            ) : null}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-[10.5px] text-white/40">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-[3px] bg-mint" /> Income
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-[3px] bg-violet-400" /> Spending
        </span>
        {showDebt ? (
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-[3px] bg-brand-400/60" /> Debt payments
          </span>
        ) : null}
      </div>
    </div>
  );
}
