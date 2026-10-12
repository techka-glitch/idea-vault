"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Entry, Kind, KIND_LABEL } from "@/lib/types";

type Row = Entry & { steps: { id: string; done: boolean }[] };
type Filter = "all" | Kind;

export default function Home() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [tag, setTag] = useState<string | null>(null);
  const [showParked, setShowParked] = useState(false);
  const [q, setQ] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<Kind>("idea");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/entries", { cache: "no-store" });
    if (!res.ok) {
      setError("Could not load. Try again in a moment.");
      setLoading(false);
      return;
    }
    const body = await res.json();
    setRows(body.entries);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((r) => r.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [rows]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.kind !== filter) return false;
      if (tag && !r.tags.includes(tag)) return false;
      if (!showParked && r.status !== "active") return false;
      if (needle && !(r.title + " " + r.notes + " " + r.tags.join(" ")).toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [rows, filter, tag, showParked, q]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || adding) return;
    setAdding(true);
    const res = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, kind }),
    });
    setAdding(false);
    if (!res.ok) {
      setError("Could not save that. Try again.");
      return;
    }
    setTitle("");
    await load();
  }

  function surprise() {
    const pool = rows.filter((r) => r.status === "active" && r.kind !== "list");
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    router.push(`/e/${pick.id}`);
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="script-accent text-2xl">got a few minutes?</p>
          <h1 className="font-heading text-3xl font-semibold">Idea Vault</h1>
        </div>
        <button onClick={signOut} className="mt-2 text-xs text-muted-purple underline">
          Sign out
        </button>
      </div>

      <div className="rainbow-bar mb-5" />

      <form onSubmit={add} className="card-shadow mb-5 rounded-3xl bg-white p-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Capture it before it escapes..."
          className="mb-3 w-full rounded-xl border border-pale-pink px-3 py-3 text-base outline-none focus:border-hot-pink"
        />
        <div className="flex items-center gap-2">
          {(["idea", "project", "list"] as Kind[]).map((k) => (
            <button
              type="button"
              key={k}
              onClick={() => setKind(k)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                kind === k ? "bg-hot-pink text-white" : "bg-pale-pink text-ink-soft"
              }`}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
          <button
            type="submit"
            disabled={adding || !title.trim()}
            className="ml-auto rounded-xl bg-teal px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {adding ? "Saving..." : "Save"}
          </button>
        </div>
      </form>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(["all", "idea", "project", "list"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              filter === f ? "bg-ink text-white" : "bg-white text-ink-soft"
            }`}
          >
            {f === "all" ? "Everything" : KIND_LABEL[f] + "s"}
          </button>
        ))}
        <button
          onClick={surprise}
          className="ml-auto rounded-full bg-gold px-3 py-1.5 text-xs font-semibold text-ink"
        >
          Surprise me
        </button>
      </div>

      {allTags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setTag(tag === t ? null : t)}
              className={`rounded-full px-3 py-1 text-xs ${
                tag === t ? "bg-teal text-white" : "bg-pale-teal text-ink-soft"
              }`}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search"
        className="mb-4 w-full rounded-xl border border-deep-pale-pink bg-white px-3 py-2 text-base outline-none focus:border-hot-pink"
      />

      {error && <p className="mb-3 text-sm text-hot-pink">{error}</p>}
      {loading && <p className="text-sm text-ink-soft">Loading...</p>}

      <ul className="space-y-3">
        {visible.map((r) => {
          const total = r.steps.length;
          const done = r.steps.filter((s) => s.done).length;
          return (
            <li key={r.id}>
              <Link
                href={`/e/${r.id}`}
                className="card-shadow block rounded-2xl bg-white p-4 active:scale-[0.99]"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-pale-sage px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                    {KIND_LABEL[r.kind]}
                  </span>
                  {r.status !== "active" && (
                    <span className="rounded-full bg-deep-pale-pink px-2 py-0.5 text-[10px] font-semibold uppercase">
                      {r.status}
                    </span>
                  )}
                  {total > 0 && (
                    <span className="ml-auto text-xs text-ink-soft">
                      {done}/{total}
                    </span>
                  )}
                </div>
                <p className="mt-2 font-heading text-lg font-semibold leading-snug">{r.title}</p>
                {total > 0 && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-pale-pink">
                    <div className="h-full bg-hot-pink" style={{ width: `${(done / total) * 100}%` }} />
                  </div>
                )}
                {r.tags.length > 0 && (
                  <p className="mt-2 text-xs text-muted-purple">{r.tags.map((t) => `#${t}`).join(" ")}</p>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      {!loading && visible.length === 0 && (
        <p className="py-10 text-center text-sm text-ink-soft">
          Nothing here yet. Capture the first one above.
        </p>
      )}

      <label className="mt-6 flex items-center gap-2 text-xs text-ink-soft">
        <input type="checkbox" checked={showParked} onChange={(e) => setShowParked(e.target.checked)} />
        Show done and parked
      </label>
    </div>
  );
}
