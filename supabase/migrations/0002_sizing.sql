-- Idea Vault: size each entry so the "What can I do right now?" picker can match it.
-- minutes: how long one sitting takes. energy and focus: how much it asks of you.
alter table ideas.entries add column if not exists minutes integer check (minutes is null or minutes > 0);
alter table ideas.entries add column if not exists energy text check (energy is null or energy in ('low','medium','high'));
alter table ideas.entries add column if not exists focus text check (focus is null or focus in ('low','medium','high'));
notify pgrst, 'reload schema';
