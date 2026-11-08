"use client";

import { useEffect, useState } from "react";
import {
  Ban,
  ChevronDown,
  Globe2,
  Loader2,
  MapPin,
  PhoneIncoming,
  RefreshCw,
  ShieldBan,
  ShieldAlert,
  X,
} from "lucide-react";
import { Badge, Button, Card, CardHeader, EmptyState, Progress } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import {
  addDemoBlockedAreaCode,
  loadDemoBlockedAreaCodes,
  loadDemoCallLogs,
  removeDemoBlockedAreaCode,
} from "@/lib/scam/demo-store";
import { formatPhoneNumber } from "@/lib/scam/location";
import type {
  BlockedAreaCode,
  BlockedAreaCodesResponse,
  CallLog,
  CallLogsResponse,
  StorageMode,
} from "@/lib/scam/types";

function scoreTone(score: number) {
  return score >= 60 ? "coral" : score >= 25 ? "amber" : "mint";
}

function riskLabel(level: CallLog["riskLevel"]) {
  return level === "high" ? "High risk" : level === "medium" ? "Medium risk" : "Low risk";
}

function occurredLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "??"
  );
}

export function CallLogPanel() {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [blocked, setBlocked] = useState<BlockedAreaCode[]>([]);
  const [mode, setMode] = useState<StorageMode>("demo");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [areaCode, setAreaCode] = useState("");
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [callsResponse, blockedResponse] = await Promise.all([
        fetch("/api/call-logs", { cache: "no-store" }),
        fetch("/api/blocked-area-codes", { cache: "no-store" }),
      ]);
      const calls = (await callsResponse.json().catch(() => ({}))) as Partial<CallLogsResponse>;
      const blocks = (await blockedResponse.json().catch(() => ({}))) as Partial<BlockedAreaCodesResponse>;

      if (calls.mode === "cloud") {
        setMode("cloud");
        setLogs(Array.isArray(calls.logs) ? calls.logs : []);
      } else if (calls.mode === "demo") {
        setMode("demo");
        setLogs(loadDemoCallLogs());
      } else {
        setMode("cloud");
        setLogs([]);
      }

      if (blocks.mode === "cloud") {
        setBlocked(Array.isArray(blocks.blocked) ? blocks.blocked : []);
      } else if (blocks.mode === "demo") {
        setBlocked(loadDemoBlockedAreaCodes());
      }

      const setupError = calls.error || blocks.error;
      if (setupError) setError(setupError);
    } catch {
      setMode("demo");
      setLogs(loadDemoCallLogs());
      setBlocked(loadDemoBlockedAreaCodes());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function addBlock(value = areaCode, blockReason = reason) {
    const clean = value.replace(/\D/g, "").slice(0, 3);
    if (!/^[2-9]\d{2}$/.test(clean)) {
      setError("Enter a valid 3-digit US area code, like 415.");
      return;
    }
    setWorking(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/blocked-area-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areaCode: clean, reason: blockReason }),
      });
      const data = (await response.json().catch(() => ({}))) as Partial<BlockedAreaCodesResponse>;
      if (!response.ok) {
        throw new Error(data.error || "Could not block that area code.");
      }
      if (data.mode === "demo") {
        setMode("demo");
        setBlocked(addDemoBlockedAreaCode(clean, blockReason));
      } else {
        setMode("cloud");
        await refresh();
      }
      setAreaCode("");
      setReason("");
      setNotice(`Area code ${clean} is now blocked. New calls get a 100/100 score.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not block that area code.");
    } finally {
      setWorking(false);
    }
  }

  async function removeBlock(value: string) {
    setWorking(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/blocked-area-codes?areaCode=${encodeURIComponent(value)}`,
        { method: "DELETE" },
      );
      const data = (await response.json().catch(() => ({}))) as Partial<BlockedAreaCodesResponse>;
      if (!response.ok) {
        throw new Error(data.error || "Could not unblock that area code.");
      }
      if (data.mode === "demo") {
        setMode("demo");
        setBlocked(removeDemoBlockedAreaCode(value));
      } else {
        setMode("cloud");
        await refresh();
      }
      setNotice(`Area code ${value} is no longer blocked.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not unblock that area code.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-12 xl:items-start">
      <Card className="p-5 sm:p-6 xl:col-span-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/12 text-violet-300">
              <PhoneIncoming className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-[16px] font-semibold tracking-tight text-white">
                Call log
              </h2>
              <p className="mt-1 text-[11px] text-white/40">
                Simulated and live calls with their score, location comparison and transcript.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={mode === "cloud" ? "mint" : "amber"}>
              {mode === "cloud" ? "Supabase call_logs" : "Local demo log"}
            </Badge>
            <Badge tone="neutral">{logs.length}</Badge>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="rounded-lg border border-white/10 p-1.5 text-white/35 transition hover:border-white/20 hover:text-white disabled:opacity-40"
              aria-label="Refresh call log"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber/20 bg-amber/[0.05] px-3 py-2.5 text-[10px] leading-relaxed text-amber/85">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {loading && logs.length === 0 ? (
          <div className="mt-4 space-y-2">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-16 animate-pulse-soft rounded-xl bg-white/[0.04]" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={<PhoneIncoming className="h-5 w-5" />}
              title="No calls logged yet"
              description="A simulated call from the hidden test dialer will appear here with its score and full transcript."
            />
          </div>
        ) : (
          <div className="mt-3 divide-y divide-white/[0.055]">
            {logs.map((log) => {
              const open = expanded === log.id;
              const tone = scoreTone(log.scamScore);
              return (
                <div key={log.id}>
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : log.id)}
                    aria-expanded={open}
                    className="flex w-full items-center gap-3 py-3 text-left transition hover:bg-white/[0.02]"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-[10px] font-semibold text-white/55">
                      {initials(log.callerName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-[12px] font-medium text-white/85">
                          {log.callerName}
                        </p>
                        {log.blocked ? <Badge tone="coral">Blocked</Badge> : null}
                        {log.locationMismatch ? <Badge tone="amber">Location mismatch</Badge> : null}
                      </div>
                      <p className="mt-0.5 truncate text-[9.5px] text-white/30">
                        +1 {formatPhoneNumber(log.phoneNumber)} · {occurredLabel(log.startedAt)} ·{" "}
                        {log.durationSeconds}s
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="text-right">
                        <Badge tone={tone}>{log.scamScore}/100</Badge>
                        <p className="mt-0.5 text-[8.5px] text-white/25">{riskLabel(log.riskLevel)}</p>
                      </div>
                      <ChevronDown
                        className={cn("h-3.5 w-3.5 text-white/25 transition", open && "rotate-180")}
                      />
                    </div>
                  </button>

                  {open ? (
                    <div className="mb-3 rounded-xl border border-white/[0.06] bg-black/20 p-3.5">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-2.5">
                          <p className="label">Caller ID</p>
                          <p className="mt-1 text-[10.5px] text-white/65">
                            {log.callerLocation ?? "Unknown area code"}
                          </p>
                          <p className="text-[9px] text-white/25">
                            Area code {log.callerAreaCode ?? "—"}
                          </p>
                        </div>
                        <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-2.5">
                          <p className="label">Network origin</p>
                          <p className="mt-1 text-[10.5px] text-white/65">
                            {log.networkLocation ?? "Not available"}
                          </p>
                          <p className="text-[9px] text-white/25">
                            {log.networkSource === "simulated"
                              ? "Simulated test origin"
                              : log.networkSource === "geoip"
                                ? "GeoIP lookup"
                                : log.networkSource === "headers"
                                  ? "Edge headers"
                                  : "Unknown source"}
                          </p>
                        </div>
                      </div>

                      {log.locationMismatch ? (
                        <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber/20 bg-amber/[0.05] px-2.5 py-2 text-[9.5px] leading-relaxed text-amber/85">
                          <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                          <span>{log.findings.find((item) => item.id === "location_mismatch")?.quotes[0]}</span>
                        </div>
                      ) : null}
                      {log.blocked ? (
                        <div className="mt-2 flex items-start gap-2 rounded-lg border border-coral/20 bg-coral/[0.05] px-2.5 py-2 text-[9.5px] leading-relaxed text-coral/85">
                          <Ban className="mt-0.5 h-3 w-3 shrink-0" />
                          <span>{log.blockReason}</span>
                        </div>
                      ) : null}

                      <div className="mt-2.5">
                        <div className="flex items-center justify-between">
                          <p className="label">Transcript</p>
                          <span className="text-[8.5px] text-white/25">
                            {log.transcript.split(/\s+/).length} words
                          </span>
                        </div>
                        <div className="mt-1.5 max-h-[190px] overflow-y-auto whitespace-pre-wrap rounded-lg border border-white/[0.05] bg-white/[0.02] p-2.5 text-[10.5px] leading-relaxed text-white/55">
                          {log.transcript}
                        </div>
                      </div>

                      <div className="mt-2.5">
                        <div className="flex items-center justify-between">
                          <p className="label">Score</p>
                          <span className="text-[9px] text-white/35">{log.headline}</span>
                        </div>
                        <Progress
                          value={log.scamScore}
                          tone={log.scamScore >= 60 ? "coral" : log.scamScore >= 25 ? "amber" : "mint"}
                          size="sm"
                          className="mt-1.5"
                          label="Scam score"
                        />
                      </div>

                      {log.findings.length ? (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {log.findings.slice(0, 6).map((finding) => (
                            <span
                              key={finding.id}
                              className="rounded-md border border-white/[0.07] bg-white/[0.03] px-1.5 py-0.5 text-[8.5px] text-white/45"
                            >
                              {finding.label}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[9px] leading-relaxed text-white/25">{log.summary}</p>
                        {!log.blocked && log.callerAreaCode ? (
                          <button
                            type="button"
                            onClick={() => void addBlock(log.callerAreaCode ?? "", "Blocked from call log")}
                            disabled={working}
                            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-coral/20 bg-coral/[0.06] px-2 py-1 text-[9px] text-coral transition hover:bg-coral/[0.1] disabled:opacity-40"
                          >
                            <ShieldBan className="h-2.5 w-2.5" /> Block {log.callerAreaCode}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="p-5 sm:p-6 xl:col-span-4">
        <CardHeader
          title="Blocked area codes"
          description="Calls from these codes are forced to a 100/100 score and flagged before the transcript is saved."
          action={<ShieldBan className="h-4 w-4 text-coral/60" />}
        />

        <form
          className="mt-4 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            void addBlock();
          }}
        >
          <div className="grid grid-cols-[88px_1fr] gap-2">
            <input
              value={areaCode}
              onChange={(event) => {
                setAreaCode(event.target.value.replace(/\D/g, "").slice(0, 3));
                setError(null);
                setNotice(null);
              }}
              inputMode="numeric"
              maxLength={3}
              placeholder="415"
              aria-label="Area code to block"
              className="field font-mono tracking-[0.15em]"
            />
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value.slice(0, 160))}
              placeholder="Reason (optional)"
              aria-label="Reason for blocking area code"
              className="field"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            disabled={working || areaCode.length !== 3}
            className="w-full"
          >
            {working ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
            Block area code
          </Button>
        </form>

        {notice ? (
          <p className="mt-2 text-[9.5px] leading-relaxed text-mint/80">{notice}</p>
        ) : null}

        <div className="mt-4 space-y-2">
          {blocked.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center">
              <Globe2 className="mx-auto h-4 w-4 text-white/25" />
              <p className="mt-1.5 text-[10.5px] text-white/45">No blocked area codes</p>
              <p className="mt-0.5 text-[9px] leading-relaxed text-white/25">
                Add one to stop simulated calls from that region.
              </p>
            </div>
          ) : (
            blocked.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="num text-[12px] font-semibold text-white/80">{item.areaCode}</p>
                  <p className="truncate text-[9px] text-white/30">
                    {item.reason || "Blocked by you"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void removeBlock(item.areaCode)}
                  disabled={working}
                  className="shrink-0 rounded-lg p-1.5 text-white/25 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-40"
                  aria-label={`Unblock area code ${item.areaCode}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <p className="mt-3 text-[9px] leading-relaxed text-white/25">
          {mode === "cloud"
            ? "Stored per user in Supabase. Incoming calls check this list before analysis."
            : "Demo mode stores these blocks in this browser. Add Supabase keys to persist them."}
        </p>
      </Card>
    </div>
  );
}
