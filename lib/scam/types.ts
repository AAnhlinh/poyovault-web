import type { ScamAnalysis, ScamFinding, ScamRiskLevel } from "@/lib/ai/scam";
import type { AreaCodeRecord } from "./area-codes";

export type CallSource = "test_dialer" | "live";
export type StorageMode = "demo" | "cloud";

export interface NetworkLocation {
  country: string;
  countryCode: string;
  region: string;
  regionCode: string;
  city: string;
  ip: string;
  source: "simulated" | "geoip" | "headers" | "unknown";
}

export interface LocationCheck {
  caller: AreaCodeRecord | null;
  network: NetworkLocation | null;
  mismatch: boolean;
  reason: string | null;
}

export interface CallLog {
  id: string;
  callerName: string;
  phoneNumber: string;
  direction: "incoming";
  startedAt: string;
  durationSeconds: number;
  transcript: string;
  scamScore: number;
  riskLevel: ScamRiskLevel;
  headline: string;
  summary: string;
  findings: ScamFinding[];
  locationMismatch: boolean;
  callerAreaCode: string | null;
  callerLocation: string | null;
  callerState: string | null;
  callerCity: string | null;
  networkIp: string | null;
  networkCountry: string | null;
  networkRegion: string | null;
  networkCity: string | null;
  networkLocation: string | null;
  networkSource: string | null;
  blocked: boolean;
  blockReason: string | null;
  source: CallSource;
  createdAt: string;
}

export interface BlockedAreaCode {
  id: string;
  areaCode: string;
  reason: string;
  createdAt: string;
}

export interface HandleTranscriptPayload {
  callerName: string;
  phoneNumber: string;
  transcript: string;
  durationSeconds?: number;
  simulated?: boolean;
  network?: {
    country?: string;
    region?: string;
    city?: string;
  };
  source?: CallSource;
  /** Demo mode only: the browser's local block list. Supabase mode reads the table. */
  blockedAreaCodes?: string[];
}

export interface HandleTranscriptResponse {
  ok: true;
  persisted: boolean;
  mode: StorageMode;
  log: CallLog;
  analysis: ScamAnalysis;
  location: LocationCheck;
  blocked: boolean;
}

export interface CallLogsResponse {
  mode: StorageMode;
  persisted: boolean;
  logs: CallLog[];
  error?: string;
}

export interface BlockedAreaCodesResponse {
  mode: StorageMode;
  persisted: boolean;
  blocked: BlockedAreaCode[];
  item?: BlockedAreaCode;
  error?: string;
}
