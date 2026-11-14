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
  if (body.minutes_max === null || (Number.isInteger(body.minutes_max) && body.minutes_max > 0 && body.minutes_max <= 1440)) patch.minutes_max = body.minutes_max;
  if (["independent", "sequential", "same_session"].includes(body.step_type)) patch.step_type = body.step_type;
  if (body.session_group === null || typeof body.session_group === "string") patch.session_group = body.session_group ? body.session_group.trim() : null;
  if (body.wait_minutes === null || (Number.isInteger(body.wait_minutes) && body.wait_minutes > 0 && body.wait_minutes <= 20160)) patch.wait_minutes = body.wait_minutes;
  if (typeof body.repeatable === "boolean") patch.repeatable = body.repeatable;
  if (Number.isInteger(body.times_done) && body.times_done >= 0) patch.times_done = body.times_done;
  if (body.due_date === null || (typeof body.due_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.due_date))) patch.due_date = body.due_date;
  if (body.heads_up === null || typeof body.heads_up === "string") patch.heads_up = body.heads_up ? body.heads_up : null;
  const levels = ["low", "medium", "high"];
  if (body.energy === null || levels.includes(body.energy)) patch.energy = body.energy;
  if (body.focus === null || levels.includes(body.focus)) patch.focus = body.focus;
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
