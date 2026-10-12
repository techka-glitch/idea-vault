-- Idea Vault: give every step or list item its own time and tags.
alter table ideas.steps add column if not exists minutes integer check (minutes is null or minutes > 0);
alter table ideas.steps add column if not exists tags text[] not null default '{}';
notify pgrst, 'reload schema';
