import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapBlockedAreaCodeRow } from "@/lib/scam/rows";

export const dynamic = "force-dynamic";

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

function validAreaCode(value: unknown) {
  const clean = String(value ?? "").replace(/\D/g, "").slice(0, 3);
  return /^[2-9]\d{2}$/.test(clean) ? clean : null;
}

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ mode: "demo", persisted: false, blocked: [] });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data, error } = await supabase
    .from("blocked_area_codes")
    .select("*")
    .eq("user_id", user.id)
    .order("area_code", { ascending: true });

  if (error) {
    if (isMissingTable(error)) {
      return NextResponse.json(
        {
          error:
            "Blocked-area-code table is missing. Run supabase/schema.sql in your Supabase SQL editor.",
        },
        { status: 503 },
      );
    }
    console.error("PoyoVault blocked area code read failed", error);
    return NextResponse.json({ error: "Could not load blocked area codes." }, { status: 500 });
  }

  return NextResponse.json({
    mode: "cloud",
    persisted: true,
    blocked: (data ?? []).map((row) => mapBlockedAreaCodeRow(row as Record<string, unknown>)),
  });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
  }

  let body: { areaCode?: unknown; reason?: unknown };
  try {
    body = (await request.json()) as { areaCode?: unknown; reason?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const areaCode = validAreaCode(body.areaCode);
  if (!areaCode) {
    return NextResponse.json({ error: "Enter a valid 3-digit US area code." }, { status: 400 });
  }
  const reason = String(body.reason ?? "").trim().slice(0, 160);

  if (!isSupabaseConfigured) {
    return NextResponse.json({
      mode: "demo",
      persisted: false,
      blocked: [],
      item: {
        id: `demo_${areaCode}`,
        areaCode,
        reason,
        createdAt: new Date().toISOString(),
      },
    });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data, error } = await supabase
    .from("blocked_area_codes")
    .upsert(
      { user_id: user.id, area_code: areaCode, reason },
      { onConflict: "user_id,area_code" },
    )
    .select("*")
    .single();

  if (error) {
    if (isMissingTable(error)) {
      return NextResponse.json(
        {
          error:
            "Blocked-area-code table is missing. Run supabase/schema.sql in your Supabase SQL editor.",
        },
        { status: 503 },
      );
    }
    console.error("PoyoVault blocked area code write failed", error);
    return NextResponse.json({ error: "Could not block that area code." }, { status: 500 });
  }

  return NextResponse.json({
    mode: "cloud",
    persisted: true,
    blocked: [],
    item: mapBlockedAreaCodeRow(data as Record<string, unknown>),
  });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
  }

  const areaCode = validAreaCode(new URL(request.url).searchParams.get("areaCode"));
  if (!areaCode) {
    return NextResponse.json({ error: "Enter a valid 3-digit US area code." }, { status: 400 });
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json({ mode: "demo", persisted: false, blocked: [] });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { error } = await supabase
    .from("blocked_area_codes")
    .delete()
    .eq("user_id", user.id)
    .eq("area_code", areaCode);

  if (error) {
    if (isMissingTable(error)) {
      return NextResponse.json(
        {
          error:
            "Blocked-area-code table is missing. Run supabase/schema.sql in your Supabase SQL editor.",
        },
        { status: 503 },
      );
    }
    console.error("PoyoVault blocked area code delete failed", error);
    return NextResponse.json({ error: "Could not unblock that area code." }, { status: 500 });
  }

  return NextResponse.json({ mode: "cloud", persisted: true, blocked: [] });
}
