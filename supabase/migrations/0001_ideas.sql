-- Idea Vault: personal ideas, projects and lists.
-- Replace OWNER_EMAIL_HERE with the email of the Auth user created for this app,
-- then run the whole file once in the Supabase SQL editor.

create schema if not exists ideas;

create table if not exists ideas.entries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('idea','project','list')),
  title text not null,
  notes text not null default '',
  status text not null default 'active' check (status in ('active','done','parked')),
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ideas.steps (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references ideas.entries(id) on delete cascade,
  text text not null,
  done boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists steps_entry_idx on ideas.steps(entry_id, position);

alter table ideas.entries enable row level security;
alter table ideas.steps enable row level security;

do $$
declare
  owner_uid uuid := (select id from auth.users where email = 'OWNER_EMAIL_HERE');
begin
  if owner_uid is null then
    raise exception 'Owner user not found. Check the email.';
  end if;
  execute format('drop policy if exists owner_only on ideas.entries');
  execute format('create policy owner_only on ideas.entries for all to authenticated using (auth.uid() = %L) with check (auth.uid() = %L)', owner_uid, owner_uid);
  execute format('drop policy if exists owner_only on ideas.steps');
  execute format('create policy owner_only on ideas.steps for all to authenticated using (auth.uid() = %L) with check (auth.uid() = %L)', owner_uid, owner_uid);
end $$;

grant usage on schema ideas to authenticated;
grant all on all tables in schema ideas to authenticated;
revoke all on all tables in schema ideas from anon;
revoke usage on schema ideas from anon;

-- Expose the schema to the API. This REPLACES the list, so every schema stays in it.
alter role authenticator set pgrst.db_schemas = 'public, graphql_public, wardrobe, bathroom, ideas';
notify pgrst, 'reload config';
notify pgrst, 'reload schema';
