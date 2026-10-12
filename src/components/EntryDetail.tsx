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

  function queueSave(next: { title?: string; notes?: string }) {
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => patch(next), 700);
  }

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

      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          queueSave({ title: e.target.value });
        }}
        className="mb-3 w-full bg-transparent font-heading text-2xl font-semibold outline-none"
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
          <StepRow key={s.id} step={s} onToggle={toggle} onRemove={removeStep} />
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
              <StepRow key={s.id} step={s} onToggle={toggle} onRemove={removeStep} />
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
}: {
  step: Step;
  onToggle: (s: Step) => void;
  onRemove: (s: Step) => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl bg-white px-3 py-3">
      <input
        type="checkbox"
        checked={step.done}
        onChange={() => onToggle(step)}
        className="h-5 w-5 shrink-0 accent-[#eb518f]"
      />
      <span className={`min-w-0 flex-1 break-words text-base ${step.done ? "text-muted-purple line-through" : ""}`}>
        {step.text}
      </span>
      <button onClick={() => onRemove(step)} className="text-lg leading-none text-muted-purple" aria-label="Remove">
        ×
      </button>
    </li>
  );
}
