"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Entry,
  ENERGY_HAVE,
  ENERGY_NEEDS,
  FOCUS_HAVE,
  FOCUS_NEEDS,
  KIND_LABEL,
  Level,
  LEVELS,
  LEVEL_RANK,
  TIME_OPTIONS,
  timeLabel,
} from "@/lib/types";

type Row = Entry & { steps: { id: string; done: boolean }[] };

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
        active ? "bg-teal text-white" : "bg-white text-ink-soft"
      }`}
    >
      {children}
    </button>
  );
}

export default function RightNow({ rows }: { rows: Row[] }) {
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState<number | null>(null);
  const [energy, setEnergy] = useState<Level | null>(null);
  const [focus, setFocus] = useState<Level | null>(null);
  const [pickIndex, setPickIndex] = useState(0);
  const [asked, setAsked] = useState(false);

  const { sized, unsized } = useMemo(() => {
    const candidates = rows.filter((r) => r.status === "active" && r.kind !== "list");
    const energyOk = (r: Row) => !energy || !r.energy || LEVEL_RANK[r.energy] <= LEVEL_RANK[energy];
    const focusOk = (r: Row) => !focus || !r.focus || LEVEL_RANK[r.focus] <= LEVEL_RANK[focus];
    const fits = candidates.filter((r) => energyOk(r) && focusOk(r));
    return {
      sized: fits.filter((r) => r.minutes != null && (time == null || r.minutes <= time)),
      unsized: fits.filter((r) => r.minutes == null),
    };
  }, [rows, time, energy, focus]);

  const pool = sized.length > 0 ? sized : unsized;
  const pick = asked && pool.length > 0 ? pool[pickIndex % pool.length] : null;

  function choose() {
    setAsked(true);
    setPickIndex(Math.floor(Math.random() * Math.max(pool.length, 1)));
  }

  function another() {
    if (pool.length < 2) return;
    setPickIndex((i) => (i + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length);
  }

  function reset() {
    setAsked(false);
    setTime(null);
    setEnergy(null);
    setFocus(null);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="card-shadow mb-5 w-full rounded-2xl bg-gold px-4 py-4 text-left"
      >
        <span className="script-accent block text-xl">got a little time?</span>
        <span className="font-heading text-lg font-semibold text-ink">What can I do right now?</span>
      </button>
    );
  }

  return (
    <div className="card-shadow mb-5 rounded-3xl bg-pale-teal p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-heading text-lg font-semibold">What can I do right now?</p>
        <button onClick={() => { setOpen(false); reset(); }} className="text-xs text-ink-soft underline">
          Close
        </button>
      </div>

      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">How much time?</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {TIME_OPTIONS.map((m) => (
          <Chip key={m} active={time === m} onClick={() => { setTime(time === m ? null : m); setAsked(false); }}>
            {timeLabel(m)}
          </Chip>
        ))}
      </div>

      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">How is your energy?</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {LEVELS.map((l) => (
          <Chip key={l} active={energy === l} onClick={() => { setEnergy(energy === l ? null : l); setAsked(false); }}>
            {ENERGY_HAVE[l]}
          </Chip>
        ))}
      </div>

      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">How is your focus?</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {LEVELS.map((l) => (
          <Chip key={l} active={focus === l} onClick={() => { setFocus(focus === l ? null : l); setAsked(false); }}>
            {FOCUS_HAVE[l]}
          </Chip>
        ))}
      </div>

      <button onClick={choose} className="mb-3 w-full rounded-xl bg-hot-pink px-4 py-3 text-sm font-semibold text-white">
        Pick something for me
      </button>

      {asked && !pick && (
        <p className="text-sm text-ink-soft">
          Nothing is sized for that yet. Open an idea and add a time, energy or focus level, and it will show up here.
        </p>
      )}

      {pick && (
        <div className="rounded-2xl bg-white p-4">
          {sized.length === 0 && (
            <p className="mb-2 text-xs text-muted-purple">Nothing sized fits, so here is one with no size set yet.</p>
          )}
          <span className="rounded-full bg-pale-sage px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
            {KIND_LABEL[pick.kind]}
          </span>
          <p className="mt-2 font-heading text-xl font-semibold leading-snug">{pick.title}</p>
          <p className="mt-1 text-xs text-ink-soft">
            {[
              pick.minutes != null ? timeLabel(pick.minutes) : null,
              pick.energy ? ENERGY_NEEDS[pick.energy] : null,
              pick.focus ? FOCUS_NEEDS[pick.focus] : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/e/${pick.id}`} className="rounded-xl bg-teal px-4 py-2 text-sm font-semibold text-white">
              Let&apos;s do this one
            </Link>
            {pool.length > 1 && (
              <button onClick={another} className="rounded-xl bg-pale-pink px-4 py-2 text-sm font-semibold text-ink-soft">
                Show me another
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-purple">
            {pool.length} {pool.length === 1 ? "match" : "matches"}. Skipping one never counts against you.
          </p>
        </div>
      )}
    </div>
  );
}
