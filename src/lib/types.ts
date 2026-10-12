export type Kind = "idea" | "project" | "list";
export type Status = "active" | "done" | "parked";
export type Level = "low" | "medium" | "high";

export type Step = {
  id: string;
  entry_id: string;
  text: string;
  done: boolean;
  position: number;
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
  created_at: string;
  updated_at: string;
  steps?: Step[];
};

export const KIND_LABEL: Record<Kind, string> = {
  idea: "Idea",
  project: "Project",
  list: "List",
};

export const LEVELS: Level[] = ["low", "medium", "high"];
export const TIME_OPTIONS = [5, 15, 30, 60, 120];
export const SUGGESTED_TAGS = ["fun", "creative", "house", "diy", "garden"];

export function timeLabel(m: number): string {
  if (m >= 120) return "2 hrs+";
  if (m === 60) return "1 hr";
  return `${m} min`;
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
