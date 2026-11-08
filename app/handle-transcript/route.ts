import { NextResponse } from "next/server";
import { analyzeCallTranscript } from "@/lib/ai/scam";
import { loadProfileBundle } from "@/lib/data/profile";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applyProtectionFlags } from "@/lib/scam/analyze";
import {
  callerLocationLabel,
  compareLocations,
  extractAreaCode,
  formatPhoneNumber,
  isValidUsPhone,
  networkLocationLabel,
  phoneDigits,
  requestIp,
  resolveAreaCode,
  resolveNetworkLocation,
} from "@/lib/scam/location";
import { callLogColumns, mapCallLogRow } from "@/lib/scam/rows";
import type { CallLog, HandleTranscriptPayload } from "@/lib/scam/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SETUP_MESSAGE =
  "Call logging tables are missing. Run supabase/schema.sql in your Supabase SQL editor, then try again.";

function isMissingTable(error: unknown) {
  const candidate = error as { code?: string; message?: string } | null;
  return candidate?.code === "42P01" || /does not exist/i.test(candidate?.message ?? "");
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
  }

  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> | null = null;
  let userId: string | null = null;
  if (isSupabaseConfigured) {
    supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    userId = user.id;
  }

  let payload: Partial<HandleTranscriptPayload>;
  try {
    payload = (await request.json()) as Partial<HandleTranscriptPayload>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const callerName = String(payload.callerName ?? "").trim().slice(0, 80) || "Unknown caller";
  const phoneNumber = phoneDigits(String(payload.phoneNumber ?? ""));
  const transcript = String(payload.transcript ?? "").trim().slice(0, 8000);
  const durationSeconds = Math.max(0, Math.min(3600, Math.round(Number(payload.durationSeconds ?? 5))));
  const simulated = Boolean(payload.simulated);
  const source = payload.source === "live" ? "live" : "test_dialer";

  if (!isValidUsPhone(phoneNumber)) {
    return NextResponse.json({ error: "Enter a valid 10-digit US phone number." }, { status: 400 });
  }
  if (transcript.length < 10) {
    return NextResponse.json(
      { error: "The transcript is too short to analyze. Speak or type at least a sentence." },
      { status: 400 },
    );
  }

  const areaCode = extractAreaCode(phoneNumber);
  if (!areaCode) {
    return NextResponse.json({ error: "Could not read the area code." }, { status: 400 });
  }

  try {
    const caller = resolveAreaCode(phoneNumber);
    const network = await resolveNetworkLocation(
      request,
      simulated && payload.network?.country ? payload.network : undefined,
    );
    const location = compareLocations(caller, network);

    let blocked = false;
    let blockReason: string | null = null;

    if (supabase && userId) {
      const { data, error } = await supabase
        .from("blocked_area_codes")
        .select("reason")
        .eq("user_id", userId)
        .eq("area_code", areaCode)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        blocked = true;
        blockReason =
          String(data.reason ?? "").trim() || `Area code ${areaCode} is on your blocked list.`;
      }
    } else {
      const localBlocks = Array.isArray(payload.blockedAreaCodes)
        ? payload.blockedAreaCodes.map((value) => String(value).replace(/\D/g, "").slice(0, 3))
        : [];
      blocked = localBlocks.includes(areaCode);
      if (blocked) blockReason = `Area code ${areaCode} is on your local demo block list.`;
    }

    const { profile } = await loadProfileBundle();
    const base = analyzeCallTranscript(transcript, profile);
    const analysis = applyProtectionFlags(base, location, {
      blocked,
      blockReason,
      blockedAreaCode: areaCode,
    });

    const now = new Date().toISOString();
    const log: CallLog = {
      id: crypto.randomUUID(),
      callerName,
      phoneNumber,
      direction: "incoming",
      startedAt: now,
      durationSeconds,
      transcript,
      scamScore: analysis.score,
      riskLevel: analysis.risk,
      headline: analysis.headline,
      summary: analysis.summary,
      findings: analysis.findings,
      locationMismatch: location.mismatch,
      callerAreaCode: areaCode,
      callerLocation: callerLocationLabel(caller),
      callerState: caller?.state ?? null,
      callerCity: caller?.city || null,
      networkIp: network?.ip || requestIp(request) || null,
      networkCountry: network?.country || null,
      networkRegion: network?.region || null,
      networkCity: network?.city || null,
      networkLocation: networkLocationLabel(network),
      networkSource: network?.source ?? "unknown",
      blocked,
      blockReason,
      source,
      createdAt: now,
    };

    let persisted = false;
    let savedLog = log;

    if (supabase && userId) {
      const { data, error } = await supabase
        .from("call_logs")
        .insert(callLogColumns(log, userId))
        .select("*")
        .single();
      if (error) {
        if (isMissingTable(error)) {
          return NextResponse.json({ error: SETUP_MESSAGE }, { status: 503 });
        }
        throw error;
      }
      persisted = true;
      savedLog = mapCallLogRow(data as Record<string, unknown>);
    }

    return NextResponse.json({
      ok: true,
      persisted,
      mode: persisted ? "cloud" : "demo",
      log: savedLog,
      analysis,
      location,
      blocked,
      phoneDisplay: formatPhoneNumber(phoneNumber),
    });
  } catch (error) {
    console.error("PoyoVault call transcript failed", error);
    const message = isMissingTable(error)
      ? SETUP_MESSAGE
      : "The call was analyzed but could not be logged. Check the server logs and try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
