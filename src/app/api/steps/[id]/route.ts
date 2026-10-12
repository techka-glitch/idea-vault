import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if (typeof body.done === "boolean") patch.done = body.done;
  if (typeof body.text === "string" && body.text.trim()) patch.text = body.text.trim();
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
