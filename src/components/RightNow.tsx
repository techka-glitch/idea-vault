"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  dueLabel,
  ENERGY_HAVE,
  ENERGY_NEEDS,
  estimateLabel,
  FOCUS_HAVE,
  FOCUS_NEEDS,
  KIND_LABEL,
  Level,
  LEVELS,
  TIME_OPTIONS,
  waitLabel,
} from "@/lib/types";
import { buildCandidates, fitting, Mood, Row } from "@/lib/picker";

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

export default function RightNow({ rows, tags }: { rows: Row[]; tags: string[] }) {
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState<number | null>(null);
  const [energy, setEnergy] = useState<Level | null>(null);
  const [focus, setFocus] = useState<Level | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [mood, setMood] = useState<Mood>(null);
  const [pickIndex, setPickIndex] = useState(0);
  const [asked, setAsked] = useState(false);

  const candidates = useMemo(() => buildCandidates(rows), [rows]);
  const { sized, unsized } = useMemo(
    () => fitting(candidates, { time, energy, focus, tag, mood }),
    [candidates, time, energy, focus, tag, mood],
  );

  const pool = sized.length > 0 ? sized : unsized;
  const pick = asked && pool.length > 0 ? pool[pickIndex % pool.length] : null;

  function change(fn: () => void) {
    fn();
    setAsked(false);
  }

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
    setTag(null);
    setMood(null);
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

  const estimate = pick ? estimateLabel(pick.minutes, pick.minutesMax) : null;

  return (
    <div className="card-shadow mb-5 rounded-3xl bg-pale-teal p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-heading text-lg font-semibold">What can I do right now?</p>
        <button onClick={() => { setOpen(false); reset(); }} className="text-xs text-ink-soft underline">
          Close
        </button>
      </div>

      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">What are you in the mood for?</p>
      <div className="mb-3 flex flex-wrap gap-2">
        <Chip active={mood === "create"} onClick={() => change(() => setMood(mood === "create" ? null : "create"))}>
          I feel like creating
        </Chip>
        <Chip active={mood === "do"} onClick={() => change(() => setMood(mood === "do" ? null : "do"))}>
          I feel like getting things done
        </Chip>
      </div>

      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">How much time?</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {TIME_OPTIONS.map((m) => (
          <Chip key={m} active={time === m} onClick={() => change(() => setTime(time === m ? null : m))}>
            {estimateLabel(m, null)}
          </Chip>
        ))}
      </div>

      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">How is your energy?</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {LEVELS.map((l) => (
          <Chip key={l} active={energy === l} onClick={() => change(() => setEnergy(energy === l ? null : l))}>
            {ENERGY_HAVE[l]}
          </Chip>
        ))}
      </div>

      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">How is your focus?</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {LEVELS.map((l) => (
          <Chip key={l} active={focus === l} onClick={() => change(() => setFocus(focus === l ? null : l))}>
            {FOCUS_HAVE[l]}
          </Chip>
        ))}
      </div>

      {tags.length > 0 && (
        <>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">Just this kind of thing</p>
          <div className="mb-4 flex flex-wrap gap-2">
            {tags.map((t) => (
              <Chip key={t} active={tag === t} onClick={() => change(() => setTag(tag === t ? null : t))}>
                #{t}
              </Chip>
            ))}
          </div>
        </>
      )}

      <button onClick={choose} className="mb-3 w-full rounded-xl bg-hot-pink px-4 py-3 text-sm font-semibold text-white">
        Pick something for me
      </button>

      {asked && !pick && (
        <p className="text-sm text-ink-soft">
          Nothing matches that yet. Try more time, or open an idea and add a time, energy or focus level.
        </p>
      )}

      {pick && (
        <div className="rounded-2xl bg-white p-4">
          {sized.length === 0 && (
            <p className="mb-2 text-xs text-muted-purple">Nothing sized fits, so here is one with no size set yet.</p>
          )}
          <span className="rounded-full bg-pale-sage px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
            {pick.sessionSteps > 0 ? "Same session" : pick.kind ? KIND_LABEL[pick.kind] : "Item"}
          </span>
          <p className="mt-2 font-heading text-xl font-semibold leading-snug">{pick.title}</p>
          {pick.parent && <p className="mt-1 text-xs text-ink-soft">From: {pick.parent}</p>}
          <p className="mt-1 text-xs text-ink-soft">
            {[
              estimate ? (pick.sessionSteps > 0 ? `about ${estimate} of work` : estimate) : null,
              pick.waitMinutes ? `plus ${waitLabel(pick.waitMinutes)} waiting` : null,
              pick.energy ? ENERGY_NEEDS[pick.energy] : null,
              pick.focus ? FOCUS_NEEDS[pick.focus] : null,
              pick.repeatable ? (pick.timesDone > 0 ? `repeatable, ${pick.timesDone} done so far` : "repeatable") : null,
              pick.dueDate ? `due ${dueLabel(pick.dueDate)}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {pick.sessionSteps > 0 && (
            <p className="mt-1 text-xs text-muted-purple">
              {pick.sessionSteps} steps that work best done together. Estimates are rough and editable.
            </p>
          )}
          {pick.headsUp && <p className="mt-2 rounded-xl bg-gold px-3 py-2 text-xs font-semibold">{pick.headsUp}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/e/${pick.entryId}`} className="rounded-xl bg-teal px-4 py-2 text-sm font-semibold text-white">
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
