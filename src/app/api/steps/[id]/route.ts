import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if (typeof body.done === "boolean") patch.done = body.done;
  if (typeof body.text === "string" && body.text.trim()) patch.text = body.text.trim();
  if (body.minutes === null) patch.minutes = null;
  else if (Number.isInteger(body.minutes) && body.minutes > 0 && body.minutes <= 1440) patch.minutes = body.minutes;
  if (Array.isArray(body.tags)) {
    patch.tags = [...new Set<string>(body.tags.filter((t: unknown): t is string => typeof t === "string").map((t: string) => t.replace(/^#/, "").trim().toLowerCase()).filter(Boolean))].slice(0, 20);
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  const db = getSupabaseServerClient();
  const { data, error } = await db.from("steps").update(patch).eq("id", id).select("entry_id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await db.from("entries").update({ updated_at: new Date().toISOString() }).eq("id", data.entry_id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const db = getSupabaseServerClient();
  const { error } = await db.from("steps").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
