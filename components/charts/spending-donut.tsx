"use client";

import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartTooltip } from "./chart-tooltip";
import { formatCurrency, formatPercent } from "@/lib/finance/format";

interface Slice {
  category: string;
  label: string;
  amount: number;
  color: string;
}

export function SpendingDonut({
  data,
  total,
  height = 220,
  showLegend = true,
  totalLabel = "Total spending",
  totalCaption = "last complete month",
  amountNoun = "spend",
}: {
  data: Slice[];
  total: number;
  height?: number;
  showLegend?: boolean;
  totalLabel?: string;
  totalCaption?: string;
  amountNoun?: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const active = activeIndex === null ? null : data[activeIndex];

  return (
    <div>
      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius="64%"
              outerRadius="92%"
              paddingAngle={2.5}
              stroke="none"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {data.map((slice, index) => (
                <Cell
                  key={slice.category}
                  fill={slice.color}
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.3}
                  style={{ transition: "opacity 200ms ease" }}
                />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="max-w-[110px] truncate text-center text-[10px] font-medium uppercase tracking-[0.12em] text-white/35">
            {active ? active.label : totalLabel}
          </p>
          <p className="num mt-1 font-display text-[22px] font-semibold tracking-tight text-white">
            {formatCurrency(active ? active.amount : total)}
          </p>
          {active ? (
            <p className="mt-0.5 text-[10px] text-white/30">
              {formatPercent(total > 0 ? active.amount / total : 0, 0)} of {amountNoun}
            </p>
          ) : (
            <p className="mt-0.5 text-[10px] text-white/30">{totalCaption}</p>
          )}
        </div>
      </div>

      {showLegend ? (
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
          {data.map((slice, index) => (
            <button
              type="button"
              key={slice.category}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              className="flex min-w-0 items-center gap-2 text-left transition hover:opacity-100"
              style={{ opacity: activeIndex === null || activeIndex === index ? 1 : 0.45 }}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-[3px]"
                style={{ backgroundColor: slice.color }}
              />
              <span className="truncate text-[11px] text-white/50">{slice.label}</span>
              <span className="num ml-auto shrink-0 text-[11px] font-medium text-white/80">
                {formatCurrency(slice.amount, { compact: slice.amount >= 1000 })}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
