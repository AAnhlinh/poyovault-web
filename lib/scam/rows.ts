import type { ScamFinding } from "@/lib/ai/scam";
import type { CallLog, BlockedAreaCode } from "./types";

function findingsFrom(value: unknown): ScamFinding[] {
  if (Array.isArray(value)) return value as ScamFinding[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as ScamFinding[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function mapCallLogRow(row: Record<string, unknown>): CallLog {
  return {
    id: String(row.id),
    callerName: String(row.caller_name ?? "Unknown caller"),
    phoneNumber: String(row.phone_number ?? ""),
    direction: "incoming",
    startedAt: String(row.started_at ?? new Date().toISOString()),
    durationSeconds: Number(row.duration_seconds ?? 0),
    transcript: String(row.transcript ?? ""),
    scamScore: Math.max(0, Math.min(100, Number(row.scam_score ?? 0))),
    riskLevel: row.risk_level === "high" || row.risk_level === "medium" ? row.risk_level : "low",
    headline: String(row.headline ?? ""),
    summary: String(row.summary ?? ""),
    findings: findingsFrom(row.findings),
    locationMismatch: Boolean(row.location_mismatch),
    callerAreaCode: row.caller_area_code ? String(row.caller_area_code) : null,
    callerLocation: row.caller_location ? String(row.caller_location) : null,
    callerState: row.caller_state ? String(row.caller_state) : null,
    callerCity: row.caller_city ? String(row.caller_city) : null,
    networkIp: row.network_ip ? String(row.network_ip) : null,
    networkCountry: row.network_country ? String(row.network_country) : null,
    networkRegion: row.network_region ? String(row.network_region) : null,
    networkCity: row.network_city ? String(row.network_city) : null,
    networkLocation: row.network_location ? String(row.network_location) : null,
    networkSource: row.network_source ? String(row.network_source) : null,
    blocked: Boolean(row.blocked),
    blockReason: row.block_reason ? String(row.block_reason) : null,
    source: row.source === "live" ? "live" : "test_dialer",
    createdAt: String(row.created_at ?? row.started_at ?? new Date().toISOString()),
  };
}

export function callLogColumns(log: CallLog, userId: string) {
  return {
    id: log.id,
    user_id: userId,
    caller_name: log.callerName,
    phone_number: log.phoneNumber,
    direction: log.direction,
    started_at: log.startedAt,
    duration_seconds: log.durationSeconds,
    transcript: log.transcript,
    scam_score: log.scamScore,
    risk_level: log.riskLevel,
    headline: log.headline,
    summary: log.summary,
    findings: log.findings,
    location_mismatch: log.locationMismatch,
    caller_area_code: log.callerAreaCode,
    caller_state: log.callerState,
    caller_city: log.callerCity,
    caller_location: log.callerLocation,
    network_ip: log.networkIp,
    network_country: log.networkCountry,
    network_region: log.networkRegion,
    network_city: log.networkCity,
    network_location: log.networkLocation,
    network_source: log.networkSource,
    blocked: log.blocked,
    block_reason: log.blockReason,
    source: log.source,
    created_at: log.createdAt,
  };
}

export function mapBlockedAreaCodeRow(row: Record<string, unknown>): BlockedAreaCode {
  return {
    id: String(row.id),
    areaCode: String(row.area_code ?? ""),
    reason: String(row.reason ?? ""),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}
