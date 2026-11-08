"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "./chart-tooltip";
import { formatCurrency } from "@/lib/finance/format";

export function FlowChart({
  data,
  height = 250,
}: {
  data: { label: string; income: number; expenses: number }[];
  height?: number;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id={`income-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5EEAD4" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#5EEAD4" stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`expense-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#A78BFA" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#A78BFA" stopOpacity={0} />
            </linearGradient>
          </defs>
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
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="income"
            name="Income"
            stroke="#5EEAD4"
            strokeWidth={2}
            fill={`url(#income-${id})`}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="expenses"
            name="Spending"
            stroke="#A78BFA"
            strokeWidth={2}
            fill={`url(#expense-${id})`}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-3 flex items-center gap-4 text-[10.5px] text-white/40">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-4 rounded-full bg-mint" /> Income
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-4 rounded-full bg-violet-400" /> Spending
        </span>
      </div>
    </div>
  );
}
