-- Idea Vault: give every step or list item its own energy and focus level,
-- so the "What can I do right now?" picker and search can match single items.
alter table ideas.steps add column if not exists energy text check (energy is null or energy in ('low','medium','high'));
alter table ideas.steps add column if not exists focus text check (focus is null or focus in ('low','medium','high'));
notify pgrst, 'reload schema';
