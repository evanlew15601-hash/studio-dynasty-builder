export const onlineLeagueSql = `-- Studio Magnate — Online League (Supabase schema)
--
-- Run this once in your Supabase project's SQL Editor.
-- Safe to re-run (uses IF NOT EXISTS and CREATE OR REPLACE).
--
-- This is a convenience bundle of the migrations in /supabase/migrations:
--   20260314000000_online_leagues.sql
--   20260314001000_online_league_week_gating.sql
--   20260315000000_online_league_turn_states.sql
--   20260316000000_online_league_ready_events.sql
--   20260316001000_online_league_turn_compile.sql
--   20260317000000_online_league_seasons.sql
--   20260318000000_online_league_retention.sql
--   20260319000000_online_league_unique_studio_names.sql

-- === 20260314000000_online_leagues.sql ===
-- Online League (Beta)
--
-- This schema supports:
-- - invite-code leagues
-- - anonymous auth users
-- - persistent snapshots/leaderboards

create extension if not exists pgcrypto;

create table if not exists public.online_leagues (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  owner_user_id uuid not null,
  created_at timestamptz not null default now()
);

create table if not exists public.online_league_members (
  league_id uuid not null references public.online_leagues (id) on delete cascade,
  user_id uuid not null,
  studio_name text not null,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (league_id, user_id)
);

create table if not exists public.online_league_snapshots (
  league_id uuid not null references public.online_leagues (id) on delete cascade,
  user_id uuid not null,
  studio_name text not null,
  budget bigint not null,
  reputation integer not null,
  week integer not null,
  year integer not null,
  released_titles integer not null,
  updated_at timestamptz not null default now(),
  primary key (league_id, user_id)
);

create index if not exists online_league_snapshots_league_updated_at_idx
  on public.online_league_snapshots (league_id, updated_at desc);

alter table public.online_leagues enable row level security;
alter table public.online_league_members enable row level security;
alter table public.online_league_snapshots enable row level security;

-- Allow members to read their leagues
create policy "online_leagues_select_for_members"
  on public.online_leagues
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.online_league_members m
      where m.league_id = online_leagues.id
        and m.user_id = auth.uid()
    )
  );

create policy "online_leagues_insert_authenticated"
  on public.online_leagues
  for insert
  to authenticated
  with check (owner_user_id = auth.uid());

-- Members table
create policy "online_league_members_select_for_members"
  on public.online_league_members
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.online_league_members m
      where m.league_id = online_league_members.league_id
        and m.user_id = auth.uid()
    )
  );

create policy "online_league_members_insert_self"
  on public.online_league_members
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "online_league_members_update_self"
  on public.online_league_members
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Snapshots table
create policy "online_league_snapshots_select_for_members"
  on public.online_league_snapshots
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.online_league_members m
      where m.league_id = online_league_snapshots.league_id
        and m.user_id = auth.uid()
    )
  );

create policy "online_league_snapshots_upsert_self"
  on public.online_league_snapshots
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.online_league_members m
      where m.league_id = online_league_snapshots.league_id
        and m.user_id = auth.uid()
    )
  );

create policy "online_league_snapshots_update_self"
  on public.online_league_snapshots
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- RPC helpers keep the client simple.

create or replace function public.create_online_league(
  league_code text,
  league_name text,
  studio_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_league_id uuid;
begin
  insert into public.online_leagues (code, name, owner_user_id)
  values (upper(league_code), league_name, auth.uid())
  returning id into new_league_id;

  insert into public.online_league_members (league_id, user_id, studio_name)
  values (new_league_id, auth.uid(), studio_name)
  on conflict (league_id, user_id)
  do update set studio_name = excluded.studio_name, last_seen_at = now();

  return new_league_id;
end;
$$;

create or replace function public.join_online_league(
  league_code text,
  studio_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  league_id uuid;
begin
  select l.id into league_id
  from public.online_leagues l
  where l.code = upper(league_code)
  limit 1;

  if league_id is null then
    raise exception 'League not found';
  end if;

  insert into public.online_league_members (league_id, user_id, studio_name)
  values (league_id, auth.uid(), studio_name)
  on conflict (league_id, user_id)
  do update set studio_name = excluded.studio_name, last_seen_at = now();

  return league_id;
end;
$$;

-- Permit calling RPCs from authenticated clients.
grant execute on function public.create_online_league(text, text, text) to authenticated;
grant execute on function public.join_online_league(text, text) to authenticated;

-- === 20260314001000_online_league_week_gating.sql ===
-- Online League: lockstep week advancement
--
-- Goal: In online mode, the in-game week should only advance when either:
    every league member has marked themselves "ready" for the next turn, or
-- - the league owner (host) forces the advance.
--
-- Note: The readiness check counts all registered members (not only recently-active sessions).

create table if not exists public.online_league_clock (
  league_id uuid primary key references public.online_leagues (id) on delete cascade,
  turn integer not null default 0,
  last_advanced_by uuid,
  updated_at timestamptz not null default now()
);

create table if not exists public.online_league_ready (
  league_id uuid not null references public.online_leagues (id) on delete cascade,
  user_id uuid not null,
  ready_for_turn integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (league_id, user_id)
);

alter table public.online_league_clock enable row level security;
alter table public.online_league_ready enable row level security;

create policy "online_league_clock_select_for_members"
  on public.online_league_clock
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.online_league_members m
      where m.league_id = online_league_clock.league_id
        and m.user_id = auth.uid()
    )
  );

create policy "online_league_ready_select_for_members"
  on public.online_league_ready
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.online_league_members m
      where m.league_id = online_league_ready.league_id
        and m.user_id = auth.uid()
    )
  );

-- Ensure clock/ready rows exist and perform lockstep advancement.
create or replace function public.set_online_league_ready(
  league_code text,
  ready boolean,
  force boolean default false
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  league_id uuid;
  owner_id uuid;
  current_turn integer;
  member_count integer;
  ready_count integer;
  should_advance boolean := false;
  next_turn integer;
begin
  select l.id, l.owner_user_id
  into league_id, owner_id
  from public.online_leagues l
  where l.code = upper(league_code)
  limit 1;

  if league_id is null then
    raise exception 'League not found';
  end if;

  if not exists (
    select 1
    from public.online_league_members m
    where m.league_id = league_id
      and m.user_id = auth.uid()
  ) then
    raise exception 'Not a member of this league';
  end if;

  insert into public.online_league_clock (league_id)
  values (league_id)
  on conflict (league_id)
  do nothing;

  select c.turn into current_turn
  from public.online_league_clock c
  where c.league_id = league_id;

  next_turn := current_turn + 1;

  insert into public.online_league_ready (league_id, user_id, ready_for_turn)
  values (league_id, auth.uid(), (case when ready then next_turn else 0 end))
  on conflict (league_id, user_id)
  do update set ready_for_turn = excluded.ready_for_turn, updated_at = now();

  if force and auth.uid() = owner_id then
    should_advance := true;
  else
    select count(*) into member_count
    from public.online_league_members m
      where m.league_id = league_id;

    select count(*) into ready_count
    from public.online_league_ready r
    join public.online_league_members m
      on m.league_id = r.league_id and m.user_id = r.user_id
    where r.league_id = league_id
      and r.ready_for_turn = next_turn;

    if member_count > 0 and ready_count >= member_count then
      should_advance := true;
    end if;
  end if;

  if should_advance then
    update public.online_league_clock
    set turn = next_turn,
        last_advanced_by = auth.uid(),
        updated_at = now()
    where online_league_clock.league_id = league_id;

    update public.online_league_ready
    set ready_for_turn = 0,
        updated_at = now()
    where online_league_ready.league_id = league_id;

    return next_turn;
  end if;

  return current_turn;
end;
$$;

grant execute on function public.set_online_league_ready(text, boolean, boolean) to authenticated;

-- Update existing RPC helpers to initialize clock/ready rows.
create or replace function public.create_online_league(
  league_code text,
  league_name text,
  studio_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_league_id uuid;
begin
  insert into public.online_leagues (code, name, owner_user_id)
  values (upper(league_code), league_name, auth.uid())
  returning id into new_league_id;

  insert into public.online_league_members (league_id, user_id, studio_name)
  values (new_league_id, auth.uid(), studio_name)
  on conflict (league_id, user_id)
  do update set studio_name = excluded.studio_name, last_seen_at = now();

  insert into public.online_league_clock (league_id)
  values (new_league_id)
  on conflict (league_id)
  do nothing;

  insert into public.online_league_ready (league_id, user_id, ready_for_turn)
  values (new_league_id, auth.uid(), 0)
  on conflict (league_id, user_id)
  do update set updated_at = now();

  return new_league_id;
end;
$$;

create or replace function public.join_online_league(
  league_code text,
  studio_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  league_id uuid;
begin
  select l.id into league_id
  from public.online_leagues l
  where l.code = upper(league_code)
  limit 1;

  if league_id is null then
    raise exception 'League not found';
  end if;

  insert into public.online_league_members (league_id, user_id, studio_name)
  values (league_id, auth.uid(), studio_name)
  on conflict (league_id, user_id)
  do update set studio_name = excluded.studio_name, last_seen_at = now();

  insert into public.online_league_clock (league_id)
  values (league_id)
  on conflict (league_id)
  do nothing;

  insert into public.online_league_ready (league_id, user_id, ready_for_turn)
  values (league_id, auth.uid(), 0)
  on conflict (league_id, user_id)
  do update set updated_at = now();

  return league_id;
end;
$$;

grant execute on function public.create_online_league(text, text, text) to authenticated;
grant execute on function public.join_online_league(text, text) to authenticated;`;
