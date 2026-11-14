-- Idea Vault phase 2: standalone actions, step types, repeatable steps, wait time, shared steps, deadlines.
-- Additive only. No existing columns are dropped or rewritten, and existing rows keep working unchanged.

-- 1. A fourth entry type: a single thing you can do in one sitting.
alter table ideas.entries drop constraint if exists entries_kind_check;
alter table ideas.entries add constraint entries_kind_check
  check (kind in ('idea','project','list','action'));

-- 2. Entry level additions.
alter table ideas.entries add column if not exists minutes_max integer check (minutes_max is null or minutes_max > 0);
alter table ideas.entries add column if not exists priority text check (priority is null or priority in ('low','normal','high'));
alter table ideas.entries add column if not exists due_date date;
alter table ideas.entries add column if not exists heads_up text;

-- 3. Step level additions.
alter table ideas.steps add column if not exists minutes_max integer check (minutes_max is null or minutes_max > 0);
-- independent: any time. sequential: only after the steps before it are done.
-- same_session: steps sharing a session_group should be planned as one sitting.
alter table ideas.steps add column if not exists step_type text not null default 'independent'
  check (step_type in ('independent','sequential','same_session'));
alter table ideas.steps add column if not exists session_group text;
-- Drying, curing, or laundry time that is not active work.
alter table ideas.steps add column if not exists wait_minutes integer check (wait_minutes is null or wait_minutes > 0);
-- Repeatable steps stay open until you mark them finished; times_done counts the sessions so far.
alter table ideas.steps add column if not exists repeatable boolean not null default false;
alter table ideas.steps add column if not exists times_done integer not null default 0 check (times_done >= 0);
-- A step lives in one home project and can be referenced from others, so it is only done once.
alter table ideas.steps add column if not exists also_in uuid[] not null default '{}';
alter table ideas.steps add column if not exists due_date date;
alter table ideas.steps add column if not exists heads_up text;

notify pgrst, 'reload schema';
