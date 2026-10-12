import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from("entries")
    .select("*, steps(*)")
    .eq("id", id)
    .order("position", { referencedTable: "steps", ascending: true })
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ entry: data });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.title === "string" && body.title.trim()) patch.title = body.title.trim();
  if (typeof body.notes === "string") patch.notes = body.notes;
  if (["idea", "project", "list"].includes(body.kind)) patch.kind = body.kind;
  if (["active", "done", "parked"].includes(body.status)) patch.status = body.status;
  if (Array.isArray(body.tags)) {
    patch.tags = body.tags
      .filter((t: unknown) => typeof t === "string")
      .map((t: string) => t.trim().toLowerCase())
      .filter(Boolean);
  }
  const db = getSupabaseServerClient();
  const { error } = await db.from("entries").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const db = getSupabaseServerClient();
  const { error } = await db.from("entries").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
