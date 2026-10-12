import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from("entries")
    .select("*, steps(id, done)")
    .order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const kind = ["idea", "project", "list"].includes(body?.kind) ? body.kind : "idea";
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });
  const db = getSupabaseServerClient();
  const { data, error } = await db.from("entries").insert({ title, kind }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entry: data });
}
