"use client";

import { formatCurrency } from "@/lib/finance/format";

interface TooltipEntry {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
}

export function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[150px] rounded-xl border border-white/10 bg-ink-850/95 px-3 py-2.5 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.9)] backdrop-blur-xl">
      {label !== undefined ? (
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
          {label}
        </p>
      ) : null}
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={`${entry.dataKey}-${index}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-[11px] text-white/55">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: entry.color ?? "#A78BFA" }}
              />
              {entry.name}
            </span>
            <span className="num text-[11.5px] font-medium text-white">
              {typeof entry.value === "number" ? formatCurrency(entry.value) : String(entry.value ?? "")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
