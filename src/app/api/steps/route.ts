import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const entryId = body?.entry_id;
  if (!text || typeof entryId !== "string") {
    return NextResponse.json({ error: "text and entry_id required" }, { status: 400 });
  }
  const db = getSupabaseServerClient();
  const { data: last } = await db
    .from("steps")
    .select("position")
    .eq("entry_id", entryId)
    .order("position", { ascending: false })
    .limit(1);
  const position = (last?.[0]?.position ?? -1) + 1;
  const { data, error } = await db
    .from("steps")
    .insert({ entry_id: entryId, text, position })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await db.from("entries").update({ updated_at: new Date().toISOString() }).eq("id", entryId);
  return NextResponse.json({ step: data });
}
