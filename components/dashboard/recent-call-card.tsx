"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Ban, MapPin, PhoneIncoming, ShieldAlert } from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";
import { loadDemoCallLogs } from "@/lib/scam/demo-store";
import type { CallLog, CallLogsResponse } from "@/lib/scam/types";
import { formatPhoneNumber } from "@/lib/scam/location";
import { formatDate } from "@/lib/finance/format";

function tone(score: number) {
  return score >= 60 ? "coral" : score >= 25 ? "amber" : "mint";
}

export function RecentCallCard() {
  const [log, setLog] = useState<CallLog | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/call-logs", { cache: "no-store" });
        const data = (await response.json().catch(() => ({}))) as Partial<CallLogsResponse>;
        const latest =
          data.mode === "cloud"
            ? (data.logs ?? [])[0] ?? null
            : data.mode === "demo"
              ? loadDemoCallLogs()[0] ?? null
              : null;
        if (!cancelled) setLog(latest);
      } catch {
        if (!cancelled) setLog(loadDemoCallLogs()[0] ?? null);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!log) return null;

  return (
    <Card className="border-coral/15 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-coral/10 text-coral">
            <PhoneIncoming className="h-4 w-4" />
          </div>
          <div>
            <p className="label">Latest call</p>
            <h2 className="mt-0.5 font-display text-[16px] font-semibold tracking-tight text-white">
              {log.callerName}
            </h2>
            <p className="mt-0.5 text-[10px] text-white/35">
              +1 {formatPhoneNumber(log.phoneNumber)} · {formatDate(log.startedAt, "short")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <Badge tone={tone(log.scamScore)}>{log.scamScore}/100</Badge>
          {log.blocked ? (
            <Badge tone="coral">
              <Ban className="h-2.5 w-2.5" /> Blocked
            </Badge>
          ) : null}
          {log.locationMismatch ? (
            <Badge tone="amber">
              <MapPin className="h-2.5 w-2.5" /> Mismatch
            </Badge>
          ) : null}
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-[11.5px] leading-relaxed text-white/45">
        {log.headline} {log.summary}
      </p>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
        <span className="flex items-center gap-1.5 text-[9.5px] text-white/30">
          <ShieldAlert className="h-3 w-3" />
          {log.blocked
            ? "Blocked by an area-code rule"
            : log.locationMismatch
              ? "Caller ID and network location disagree"
              : "Scored against your call history"}
        </span>
        <Link
          href="/scam-protection"
          className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-violet-300 hover:text-violet-200"
        >
          View transcript <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </Card>
  );
}
