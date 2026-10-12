"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ENERGY_NEEDS,
  Entry,
  FOCUS_NEEDS,
  Kind,
  KIND_LABEL,
  Level,
  LEVELS,
  Status,
  Step,
  SUGGESTED_TAGS,
  TIME_OPTIONS,
  timeLabel,
} from "@/lib/types";

const json = { "Content-Type": "application/json" };

type StepChange = {
  text?: string;
  minutes?: number | null;
  tags?: string[];
  energy?: Level | null;
  focus?: Level | null;
};

export default function EntryDetail({ id }: { id: string }) {
  const router = useRouter();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [tagText, setTagText] = useState("");
  const [newStep, setNewStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ title?: string; notes?: string }>({});

  const load = useCallback(async () => {
    const res = await fetch(`/api/entries/${id}`, { cache: "no-store" });
    if (!res.ok) {
      setError("Could not find that one.");
      return;
    }
    const { entry: e } = await res.json();
    setEntry(e);
    setSteps(e.steps ?? []);
    setTitle(e.title);
    setNotes(e.notes);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/entries/${id}`, { method: "PATCH", headers: json, body: JSON.stringify(body) });
    if (!res.ok) setError("Save failed. Check your connection.");
    else setError(null);
    setSaved(res.ok);
    return res.ok;
  }

  // Title and notes edits are merged so a quick edit to one never cancels the other.
  async function flushSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    const body = pending.current;
    if (!Object.keys(body).length) {
      setSaved(true);
      return;
    }
    pending.current = {};
    const ok = await patch(body);
    if (!ok) {
      pending.current = { ...body, ...pending.current };
      return;
    }
    if (body.title) {
      const savedTitle = body.title.trim();
      setEntry((e) => (e ? { ...e, title: savedTitle } : e));
    }
  }

  function queueSave(next: { title?: string; notes?: string }) {
    setSaved(false);
    pending.current = { ...pending.current, ...next };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushSave, 700);
  }

  // Leaving the page within a moment of typing should not lose the edit.
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const body = pending.current;
      if (Object.keys(body).length) {
        fetch(`/api/entries/${id}`, { method: "PATCH", headers: json, body: JSON.stringify(body), keepalive: true });
      }
    };
  }, [id]);

  async function setStatus(status: Status) {
    if (await patch({ status })) setEntry((e) => (e ? { ...e, status } : e));
  }

  async function setKind(kind: Kind) {
    if (await patch({ kind })) setEntry((e) => (e ? { ...e, kind } : e));
  }

  async function setSize(field: "minutes" | "energy" | "focus", value: number | Level | null) {
    if (!entry) return;
    const next = entry[field] === value ? null : value;
    if (await patch({ [field]: next })) setEntry({ ...entry, [field]: next });
  }

  async function addTagValue(t: string) {
    if (!entry || entry.tags.includes(t)) return;
    const tags = [...entry.tags, t];
    if (await patch({ tags })) setEntry({ ...entry, tags });
  }

  async function addTags(e: React.FormEvent) {
    e.preventDefault();
    if (!entry) return;
    const incoming = tagText.split(/[,\s]+/).map((t) => t.replace(/^#/, "").toLowerCase()).filter(Boolean);
    if (!incoming.length) return;
    const tags = [...new Set([...entry.tags, ...incoming])];
    if (await patch({ tags })) {
      setEntry({ ...entry, tags });
      setTagText("");
    }
  }

  async function removeTag(t: string) {
    if (!entry) return;
    const tags = entry.tags.filter((x) => x !== t);
    if (await patch({ tags })) setEntry({ ...entry, tags });
  }

  async function addStep(e: React.FormEvent) {
    e.preventDefault();
    const text = newStep.trim();
    if (!text) return;
    const res = await fetch("/api/steps", { method: "POST", headers: json, body: JSON.stringify({ entry_id: id, text }) });
    if (!res.ok) {
      setError("Could not add that.");
      return;
    }
    const { step } = await res.json();
    setSteps((s) => [...s, step]);
    setNewStep("");
  }

  async function toggle(step: Step) {
    setSteps((s) => s.map((x) => (x.id === step.id ? { ...x, done: !x.done } : x)));
    const res = await fetch(`/api/steps/${step.id}`, { method: "PATCH", headers: json, body: JSON.stringify({ done: !step.done }) });
    if (!res.ok) {
      setSteps((s) => s.map((x) => (x.id === step.id ? { ...x, done: step.done } : x)));
      setError("Could not update that.");
    }
  }

  async function updateStep(step: Step, change: StepChange) {
    const before = step;
    setSteps((s) => s.map((x) => (x.id === step.id ? { ...x, ...change } : x)));
    const res = await fetch(`/api/steps/${step.id}`, { method: "PATCH", headers: json, body: JSON.stringify(change) });
    if (!res.ok) {
      setSteps((s) => s.map((x) => (x.id === step.id ? before : x)));
      setError("Could not save that.");
    }
  }

  async function removeStep(step: Step) {
    setSteps((s) => s.filter((x) => x.id !== step.id));
    await fetch(`/api/steps/${step.id}`, { method: "DELETE" });
  }

  async function remove() {
    if (!window.confirm("Delete this for good?")) return;
    const res = await fetch(`/api/entries/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else setError("Could not delete.");
  }

  if (!entry) {
    return (
      <div>
        <Link href="/" className="text-sm text-hot-pink">← Back</Link>
        <p className="mt-6 text-sm text-ink-soft">{error ?? "Loading..."}</p>
      </div>
    );
  }

  const remaining = steps.filter((s) => !s.done);
  const finished = steps.filter((s) => s.done);

  return (
    <div className="pb-16">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold text-hot-pink">← Back</Link>
        <span className="text-xs text-muted-purple">{saved ? "Saved" : "Saving..."}</span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {(["idea", "project", "list"] as Kind[]).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              entry.kind === k ? "bg-hot-pink text-white" : "bg-pale-pink text-ink-soft"
            }`}
          >
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>

      <label htmlFor="entry-title" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-purple">
        Title (tap to rename)
      </label>
      <input
        id="entry-title"
        value={title}
        placeholder="Give this a title"
        onChange={(e) => {
          const next = e.target.value;
          setTitle(next);
          if (next.trim()) queueSave({ title: next });
          else {
            // An empty title is never saved; the last good one comes back when you leave the box.
            const { title: _discard, ...rest } = pending.current;
            void _discard;
            pending.current = rest;
          }
        }}
        onBlur={() => {
          if (!title.trim()) setTitle(entry.title);
          flushSave();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="mb-3 w-full rounded-xl border border-pale-pink bg-white px-3 py-2 font-heading text-2xl font-semibold outline-none focus:border-hot-pink"
      />

      <textarea
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          queueSave({ notes: e.target.value });
        }}
        rows={6}
        placeholder="Notes, supplies, links, whatever you want to remember..."
        className="card-shadow mb-5 w-full rounded-2xl bg-white p-4 text-base outline-none"
      />

      {entry.kind !== "list" && (
        <div className="card-shadow mb-5 rounded-2xl bg-pale-teal p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            How big is one sitting? (optional)
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            {TIME_OPTIONS.map((m) => (
              <button
                key={m}
                onClick={() => setSize("minutes", m)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  entry.minutes === m ? "bg-teal text-white" : "bg-white text-ink-soft"
                }`}
              >
                {timeLabel(m)}
              </button>
            ))}
          </div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">Energy it takes</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {LEVELS.map((l) => (
              <button
                key={l}
                onClick={() => setSize("energy", l)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  entry.energy === l ? "bg-teal text-white" : "bg-white text-ink-soft"
                }`}
              >
                {ENERGY_NEEDS[l]}
              </button>
            ))}
          </div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">Focus it takes</p>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((l) => (
              <button
                key={l}
                onClick={() => setSize("focus", l)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  entry.focus === l ? "bg-teal text-white" : "bg-white text-ink-soft"
                }`}
              >
                {FOCUS_NEEDS[l]}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-purple">Tap a choice again to clear it.</p>
        </div>
      )}

      <h2 className="script-accent mb-2 text-2xl">{entry.kind === "list" ? "items" : "what's left"}</h2>
      <ul className="mb-3 space-y-2">
        {remaining.map((s) => (
          <StepRow key={s.id} step={s} onToggle={toggle} onRemove={removeStep} onUpdate={updateStep} />
        ))}
      </ul>
      <form onSubmit={addStep} className="mb-5 flex gap-2">
        <input
          value={newStep}
          onChange={(e) => setNewStep(e.target.value)}
          placeholder="Add a step or item"
          className="min-w-0 flex-1 rounded-xl border border-pale-pink bg-white px-3 py-3 text-base outline-none focus:border-hot-pink"
        />
        <button className="rounded-xl bg-teal px-4 text-sm font-semibold text-white">Add</button>
      </form>

      {finished.length > 0 && (
        <>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-purple">Done</p>
          <ul className="mb-5 space-y-2">
            {finished.map((s) => (
              <StepRow key={s.id} step={s} onToggle={toggle} onRemove={removeStep} onUpdate={updateStep} />
            ))}
          </ul>
        </>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        {entry.tags.map((t) => (
          <button key={t} onClick={() => removeTag(t)} className="rounded-full bg-pale-teal px-3 py-1 text-xs" title="Tap to remove">
            #{t} ×
          </button>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {SUGGESTED_TAGS.filter((t) => !entry.tags.includes(t)).map((t) => (
          <button
            key={t}
            onClick={() => addTagValue(t)}
            className="rounded-full border border-pale-teal bg-white px-3 py-1 text-xs text-ink-soft"
          >
            + {t}
          </button>
        ))}
      </div>
      <form onSubmit={addTags} className="mb-6 flex gap-2">
        <input
          value={tagText}
          onChange={(e) => setTagText(e.target.value)}
          placeholder="Add tags (art, kids, house)"
          className="min-w-0 flex-1 rounded-xl border border-deep-pale-pink bg-white px-3 py-2 text-base outline-none focus:border-hot-pink"
        />
        <button className="rounded-xl bg-ink px-4 text-sm font-semibold text-white">Tag</button>
      </form>

      {error && <p className="mb-3 text-sm text-hot-pink">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {entry.status !== "done" && (
          <button onClick={() => setStatus("done")} className="rounded-xl bg-sage px-4 py-2 text-sm font-semibold">
            Mark done
          </button>
        )}
        {entry.status !== "parked" && (
          <button onClick={() => setStatus("parked")} className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold">
            Park it
          </button>
        )}
        {entry.status !== "active" && (
          <button onClick={() => setStatus("active")} className="rounded-xl bg-hot-pink px-4 py-2 text-sm font-semibold text-white">
            Make active
          </button>
        )}
        <button onClick={remove} className="ml-auto rounded-xl px-4 py-2 text-sm text-muted-purple underline">
          Delete
        </button>
      </div>
    </div>
  );
}

function StepRow({
  step,
  onToggle,
  onRemove,
  onUpdate,
}: {
  step: Step;
  onToggle: (s: Step) => void;
  onRemove: (s: Step) => void;
  onUpdate: (s: Step, change: StepChange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tagText, setTagText] = useState("");
  const [text, setText] = useState(step.text);
  const tags = step.tags ?? [];

  function saveText() {
    const next = text.trim();
    if (!next) {
      setText(step.text);
      return;
    }
    if (next !== step.text) onUpdate(step, { text: next });
    setText(next);
  }

  function addTags(e: React.FormEvent) {
    e.preventDefault();
    const incoming = tagText.split(/[,\s]+/).map((t) => t.replace(/^#/, "").toLowerCase()).filter(Boolean);
    if (!incoming.length) return;
    onUpdate(step, { tags: [...new Set([...tags, ...incoming])] });
    setTagText("");
  }

  return (
    <li className="rounded-xl bg-white px-3 py-3">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={step.done}
          onChange={() => onToggle(step)}
          className="h-5 w-5 shrink-0 accent-[#eb518f]"
        />
        <span className={`min-w-0 flex-1 break-words text-base ${step.done ? "text-muted-purple line-through" : ""}`}>
          {step.text}
        </span>
        <button
          onClick={() => setOpen((o) => !o)}
          className="shrink-0 text-xs font-semibold text-hot-pink"
          aria-expanded={open}
        >
          {open ? "Done" : "Edit"}
        </button>
        <button onClick={() => onRemove(step)} className="text-lg leading-none text-muted-purple" aria-label="Remove">
          ×
        </button>
      </div>

      {!open && (step.minutes || step.energy || step.focus || tags.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1.5 pl-8">
          {step.minutes && <span className="rounded-full bg-teal px-2.5 py-0.5 text-xs font-semibold text-white">{timeLabel(step.minutes)}</span>}
          {step.energy && <span className="rounded-full bg-pale-pink px-2.5 py-0.5 text-xs">{ENERGY_NEEDS[step.energy]}</span>}
          {step.focus && <span className="rounded-full bg-pale-pink px-2.5 py-0.5 text-xs">{FOCUS_NEEDS[step.focus]}</span>}
          {tags.map((t) => (
            <span key={t} className="rounded-full bg-pale-teal px-2.5 py-0.5 text-xs">#{t}</span>
          ))}
        </div>
      )}

      {open && (
        <div className="mt-3 space-y-3 pl-8">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">Name</p>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={saveText}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              className="w-full rounded-xl border border-deep-pale-pink bg-white px-3 py-2 text-base outline-none focus:border-hot-pink"
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">How long (optional)</p>
            <div className="flex flex-wrap gap-2">
              {TIME_OPTIONS.map((m) => (
                <button
                  key={m}
                  onClick={() => onUpdate(step, { minutes: step.minutes === m ? null : m })}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    step.minutes === m ? "bg-teal text-white" : "bg-pale-teal text-ink-soft"
                  }`}
                >
                  {timeLabel(m)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">Energy it takes</p>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  onClick={() => onUpdate(step, { energy: step.energy === l ? null : l })}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    step.energy === l ? "bg-teal text-white" : "bg-pale-teal text-ink-soft"
                  }`}
                >
                  {ENERGY_NEEDS[l]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">Focus it takes</p>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  onClick={() => onUpdate(step, { focus: step.focus === l ? null : l })}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    step.focus === l ? "bg-teal text-white" : "bg-pale-teal text-ink-soft"
                  }`}
                >
                  {FOCUS_NEEDS[l]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">Tags</p>
            <div className="mb-2 flex flex-wrap gap-2">
              {tags.map((t) => (
                <button
                  key={t}
                  onClick={() => onUpdate(step, { tags: tags.filter((x) => x !== t) })}
                  className="rounded-full bg-pale-teal px-3 py-1 text-xs"
                  title="Tap to remove"
                >
                  #{t} ×
                </button>
              ))}
              {SUGGESTED_TAGS.filter((t) => !tags.includes(t)).map((t) => (
                <button
                  key={t}
                  onClick={() => onUpdate(step, { tags: [...tags, t] })}
                  className="rounded-full border border-pale-teal bg-white px-3 py-1 text-xs text-ink-soft"
                >
                  + {t}
                </button>
              ))}
            </div>
            <form onSubmit={addTags} className="flex gap-2">
              <input
                value={tagText}
                onChange={(e) => setTagText(e.target.value)}
                placeholder="Add tags (errand, call, buy)"
                className="min-w-0 flex-1 rounded-xl border border-deep-pale-pink bg-white px-3 py-2 text-base outline-none focus:border-hot-pink"
              />
              <button className="rounded-xl bg-ink px-4 text-sm font-semibold text-white">Tag</button>
            </form>
          </div>
        </div>
      )}
    </li>
  );
}
