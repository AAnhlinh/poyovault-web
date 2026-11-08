import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapCallLogRow } from "@/lib/scam/rows";

export const dynamic = "force-dynamic";

function isMissingTable(error: unknown) {
  const candidate = error as { code?: string; message?: string } | null;
  return candidate?.code === "42P01" || /does not exist/i.test(candidate?.message ?? "");
}

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ mode: "demo", persisted: false, logs: [] });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data, error } = await supabase
    .from("call_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(30);

  if (error) {
    if (isMissingTable(error)) {
      return NextResponse.json(
        {
          error:
            "Call logging tables are missing. Run supabase/schema.sql in your Supabase SQL editor.",
        },
        { status: 503 },
      );
    }
    console.error("PoyoVault call log read failed", error);
    return NextResponse.json({ error: "Could not load the call log." }, { status: 500 });
  }

  return NextResponse.json({
    mode: "cloud",
    persisted: true,
    logs: (data ?? []).map((row) => mapCallLogRow(row as Record<string, unknown>)),
  });
}
