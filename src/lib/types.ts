export type Kind = "idea" | "project" | "list";
export type Status = "active" | "done" | "parked";

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
  created_at: string;
  updated_at: string;
  steps?: Step[];
};

export const KIND_LABEL: Record<Kind, string> = {
  idea: "Idea",
  project: "Project",
  list: "List",
};
