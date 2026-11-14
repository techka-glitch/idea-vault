export type Kind = "idea" | "project" | "list" | "action";
export type Status = "active" | "done" | "parked";
export type Level = "low" | "medium" | "high";
export type StepType = "independent" | "sequential" | "same_session";
export type Priority = "low" | "normal" | "high";

export type Step = {
  id: string;
  entry_id: string;
  text: string;
  done: boolean;
  position: number;
  minutes: number | null;
  tags: string[];
  energy: Level | null;
  focus: Level | null;
  minutes_max: number | null;
  step_type: StepType;
  session_group: string | null;
  wait_minutes: number | null;
  repeatable: boolean;
  times_done: number;
  also_in: string[];
  due_date: string | null;
  heads_up: string | null;
};

export type Entry = {
  id: string;
  kind: Kind;
  title: string;
  notes: string;
  status: Status;
  tags: string[];
  minutes: number | null;
  energy: Level | null;
  focus: Level | null;
  minutes_max: number | null;
  priority: Priority | null;
  due_date: string | null;
  heads_up: string | null;
  created_at: string;
  updated_at: string;
  steps?: Step[];
};

export const KIND_LABEL: Record<Kind, string> = {
  idea: "Idea",
  project: "Project",
  list: "List",
  action: "Action",
};

export const STEP_TYPE_LABEL: Record<StepType, string> = {
  independent: "Anytime",
  sequential: "In order",
  same_session: "Same session",
};

export const LEVELS: Level[] = ["low", "medium", "high"];
export const TIME_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180];
export const SUGGESTED_TAGS = [
  "house",
  "kitchen",
  "declutter",
  "organize",
  "pets",
  "creative",
  "joy",
  "crafts",
  "watercolor",
  "embroidery",
  "business",
  "busylooksgood",
  "recipes",
  "freezer",
  "family",
  "maintenance",
];

export function timeLabel(m: number): string {
  if (m >= 180) return "3+ hrs";
  if (m === 120) return "2 hrs";
  if (m === 60) return "1 hr";
  return `${m} min`;
}

// A time estimate, or a range when one was given. Always an estimate, never exact.
export function estimateLabel(min: number | null, max: number | null): string | null {
  if (min == null) return null;
  if (max == null || max <= min) return timeLabel(min);
  if (min % 60 === 0 && max % 60 === 0 && min >= 60) return `${min / 60} to ${max / 60} hrs`;
  return `${min} to ${max} min`;
}

export function waitLabel(m: number): string {
  if (m >= 60 && m % 60 === 0) return `${m / 60} hr${m === 60 ? "" : "s"}`;
  return `${m} min`;
}

export function dueLabel(d: string): string {
  const dt = new Date(`${d}T12:00:00`);
  return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// What an entry asks of you.
export const ENERGY_NEEDS: Record<Level, string> = {
  low: "Easy on energy",
  medium: "Some energy",
  high: "Big energy",
};
export const FOCUS_NEEDS: Record<Level, string> = {
  low: "Mindless",
  medium: "Some focus",
  high: "Deep focus",
};

// What you have right now.
export const ENERGY_HAVE: Record<Level, string> = {
  low: "Running on fumes",
  medium: "A little momentum",
  high: "Let's get something done",
};
export const FOCUS_HAVE: Record<Level, string> = {
  low: "Scattered",
  medium: "Some focus",
  high: "Locked in",
};

export const LEVEL_RANK: Record<Level, number> = { low: 0, medium: 1, high: 2 };
