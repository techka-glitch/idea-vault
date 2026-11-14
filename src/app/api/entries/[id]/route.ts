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
  // Steps that live in another project but are also needed here.
  const { data: shared } = await db
    .from("steps")
    .select("*, home:entries(id, title)")
    .contains("also_in", [id])
    .order("position", { ascending: true });
  return NextResponse.json({ entry: data, shared: shared ?? [] });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.title === "string" && body.title.trim()) patch.title = body.title.trim();
  if (typeof body.notes === "string") patch.notes = body.notes;
  if (["idea", "project", "list", "action"].includes(body.kind)) patch.kind = body.kind;
  if (["active", "done", "parked"].includes(body.status)) patch.status = body.status;
  if (body.minutes === null || (Number.isInteger(body.minutes) && body.minutes > 0)) patch.minutes = body.minutes;
  if (body.energy === null || ["low", "medium", "high"].includes(body.energy)) patch.energy = body.energy;
  if (body.focus === null || ["low", "medium", "high"].includes(body.focus)) patch.focus = body.focus;
  if (body.minutes_max === null || (Number.isInteger(body.minutes_max) && body.minutes_max > 0)) patch.minutes_max = body.minutes_max;
  if (body.priority === null || ["low", "normal", "high"].includes(body.priority)) patch.priority = body.priority;
  if (body.due_date === null || (typeof body.due_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.due_date))) patch.due_date = body.due_date;
  if (body.heads_up === null || typeof body.heads_up === "string") patch.heads_up = body.heads_up ? body.heads_up : null;
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
