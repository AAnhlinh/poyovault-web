"use client";

import { useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "./chart-tooltip";
import { formatCurrency } from "@/lib/finance/format";
import { cn } from "@/lib/utils";

type SeriesKey = "income" | "expenses" | "debtPayments" | "savings";
const SERIES: { key: SeriesKey; label: string; color: string; dashed?: boolean }[] = [
  { key: "income", label: "Income", color: "#5EEAD4" },
  { key: "expenses", label: "Expenses", color: "#A78BFA" },
  { key: "debtPayments", label: "Debt payments", color: "#FBBF24" },
  { key: "savings", label: "Savings balance", color: "#63D8FF", dashed: true },
];

export function ForecastChart({
  data,
  height = 310,
}: {
  data: { label: string; income: number; expenses: number; debtPayments: number; savings: number }[];
  height?: number;
}) {
  const [hidden, setHidden] = useState<SeriesKey[]>([]);

  return (
    <div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 12, right: 4, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.055)" />
            <XAxis
              dataKey="label"
              tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              dy={8}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="flows"
              tick={{ fill: "rgba(255,255,255,0.28)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) => formatCurrency(value, { compact: true })}
              width={62}
            />
            <YAxis
              yAxisId="balance"
              orientation="right"
              tick={{ fill: "rgba(255,255,255,0.22)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) => formatCurrency(value, { compact: true })}
              width={54}
            />
            <Tooltip content={<ChartTooltip />} />
            {SERIES.map((series) => (
              <Line
                key={series.key}
                yAxisId={series.key === "savings" ? "balance" : "flows"}
                type="monotone"
                dataKey={series.key}
                name={series.label}
                stroke={series.color}
                strokeWidth={series.key === "savings" ? 1.8 : 2.2}
                strokeDasharray={series.dashed ? "5 4" : undefined}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                hide={hidden.includes(series.key)}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {SERIES.map((series) => {
          const isHidden = hidden.includes(series.key);
          return (
            <button
              key={series.key}
              type="button"
              onClick={() =>
                setHidden((current) =>
                  current.includes(series.key)
                    ? current.filter((key) => key !== series.key)
                    : [...current, series.key],
                )
              }
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] transition",
                isHidden
                  ? "border-white/[0.06] text-white/25"
                  : "border-white/[0.08] bg-white/[0.03] text-white/55 hover:text-white/80",
              )}
            >
              <span
                className="h-1.5 w-3 rounded-full"
                style={{ backgroundColor: isHidden ? "rgba(255,255,255,0.15)" : series.color }}
              />
              {series.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
