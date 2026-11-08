"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "./chart-tooltip";
import { formatCurrency } from "@/lib/finance/format";

export interface PayoffChartPoint {
  label: string;
  avalanche: number;
  snowball: number;
  minimum: number;
}

export function DebtPayoffChart({
  data,
  height = 280,
}: {
  data: PayoffChartPoint[];
  height?: number;
}) {
  return (
    <div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 6, bottom: 0, left: -14 }}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.055)" />
            <XAxis
              dataKey="label"
              tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              dy={8}
              minTickGap={24}
            />
            <YAxis
              tick={{ fill: "rgba(255,255,255,0.28)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) => formatCurrency(value, { compact: true })}
              width={60}
            />
            <Tooltip content={<ChartTooltip />} />
            <Line
              type="monotone"
              dataKey="minimum"
              name="Minimum payments"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="snowball"
              name="Snowball"
              stroke="#63D8FF"
              strokeWidth={1.8}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="avalanche"
              name="Avalanche"
              stroke="#5EEAD4"
              strokeWidth={2.2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-[10.5px] text-white/40">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-4 rounded-full bg-mint" /> Avalanche
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-4 rounded-full bg-brand-400" /> Snowball
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-4 rounded-full bg-white/25" /> Minimums only
        </span>
      </div>
    </div>
  );
}
