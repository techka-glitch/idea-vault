import { Entry, Kind, Level, LEVEL_RANK, Step } from "@/lib/types";

export type Row = Entry & { steps: Step[] };

// Something the picker can suggest: a whole idea, project or action, a single open step,
// or a same-session group of steps that should be planned together.
export type Candidate = {
  key: string;
  entryId: string;
  title: string;
  parent: string | null;
  kind: Kind | null;
  minutes: number | null;
  minutesMax: number | null;
  energy: Level | null;
  focus: Level | null;
  tags: string[];
  waitMinutes: number | null;
  repeatable: boolean;
  timesDone: number;
  dueDate: string | null;
  headsUp: string | null;
  sessionSteps: number; // how many steps are bundled in a same-session candidate, 0 otherwise
};

export type Mood = "create" | "do" | null;

const JOY = "joy";

// Everything that is allowed to be suggested right now, before any filter is applied.
export function buildCandidates(rows: Row[]): Candidate[] {
  const active = rows.filter((r) => r.status === "active");
  const out: Candidate[] = [];

  for (const r of active) {
    if (r.kind === "list") continue;

    const steps = [...(r.steps ?? [])].sort((a, b) => a.position - b.position);
    const sizedOpen = steps.filter((s) => !s.done && (s.minutes != null || s.energy || s.focus));

    // A project with sized steps is suggested through its steps, so it is not listed twice.
    if (sizedOpen.length === 0) {
      out.push({
        key: r.id,
        entryId: r.id,
        title: r.title,
        parent: null,
        kind: r.kind,
        minutes: r.minutes,
        minutesMax: r.minutes_max ?? null,
        energy: r.energy,
        focus: r.focus,
        tags: r.tags,
        waitMinutes: null,
        repeatable: false,
        timesDone: 0,
        dueDate: r.due_date ?? null,
        headsUp: r.heads_up ?? null,
        sessionSteps: 0,
      });
      continue;
    }

    // An in-order or same-session step opens up once the ordered steps before it are finished.
    const unlocked = (s: Step) => {
      if (s.step_type === "independent") return true;
      return steps.every((p) => {
        if (p.position >= s.position) return true;
        if (p.step_type === "independent" || p.done) return true;
        // Steps inside the same session bundle do not block each other.
        return s.session_group != null && p.session_group === s.session_group;
      });
    };

    const handledGroups = new Set<string>();
    for (const s of sizedOpen) {
      if (!unlocked(s)) continue;

      if (s.step_type === "same_session" && s.session_group) {
        if (handledGroups.has(s.session_group)) continue;
        handledGroups.add(s.session_group);
        const group = steps.filter((x) => !x.done && x.session_group === s.session_group);
        const summed = group.reduce((n, x) => n + (x.minutes ?? 0), 0);
        const waits = group.reduce((n, x) => n + (x.wait_minutes ?? 0), 0);
        out.push({
          key: `${r.id}:${s.session_group}`,
          entryId: r.id,
          title: s.session_group,
          parent: r.title,
          kind: null,
          // Fall back to the project's own estimate when the steps carry no times of their own.
          minutes: summed > 0 ? summed : r.minutes,
          minutesMax: null,
          energy: strongest(group.map((x) => x.energy)) ?? r.energy,
          focus: strongest(group.map((x) => x.focus)) ?? r.focus,
          tags: [...new Set([...r.tags, ...group.flatMap((x) => x.tags ?? [])])],
          waitMinutes: waits > 0 ? waits : null,
          repeatable: false,
          timesDone: 0,
          dueDate: r.due_date ?? null,
          headsUp: group.find((x) => x.heads_up)?.heads_up ?? r.heads_up ?? null,
          sessionSteps: group.length,
        });
        continue;
      }

      out.push({
        key: s.id,
        entryId: r.id,
        title: s.text,
        parent: r.title,
        kind: null,
        minutes: s.minutes ?? null,
        minutesMax: s.minutes_max ?? null,
        energy: s.energy ?? null,
        focus: s.focus ?? null,
        tags: [...new Set([...r.tags, ...(s.tags ?? [])])],
        waitMinutes: s.wait_minutes ?? null,
        repeatable: s.repeatable,
        timesDone: s.times_done ?? 0,
        dueDate: s.due_date ?? null,
        headsUp: s.heads_up ?? r.heads_up ?? null,
        sessionSteps: 0,
      });
    }
  }
  return out;
}

function strongest(levels: (Level | null)[]): Level | null {
  let best: Level | null = null;
  for (const l of levels) if (l && (best == null || LEVEL_RANK[l] > LEVEL_RANK[best])) best = l;
  return best;
}

export type Have = {
  time: number | null; // minutes available; 180 means three hours or more
  energy: Level | null; // what you have
  focus: Level | null;
  tag: string | null;
  mood: Mood;
};

// What fits what you have. Unknown energy and focus are treated as fine, unknown time is kept apart.
export function fitting(cands: Candidate[], have: Have) {
  const energyOk = (c: Candidate) => !have.energy || !c.energy || LEVEL_RANK[c.energy] <= LEVEL_RANK[have.energy];
  const focusOk = (c: Candidate) => !have.focus || !c.focus || LEVEL_RANK[c.focus] <= LEVEL_RANK[have.focus];
  const tagOk = (c: Candidate) => !have.tag || c.tags.includes(have.tag);
  const moodOk = (c: Candidate) =>
    have.mood == null || (have.mood === "create" ? c.tags.includes(JOY) : !c.tags.includes(JOY));
  const timeOk = (c: Candidate) => have.time == null || have.time >= 180 || (c.minutes != null && c.minutes <= have.time);

  const base = cands.filter((c) => energyOk(c) && focusOk(c) && tagOk(c) && moodOk(c));
  return {
    sized: base.filter((c) => c.minutes != null && timeOk(c)),
    unsized: base.filter((c) => c.minutes == null),
  };
}
