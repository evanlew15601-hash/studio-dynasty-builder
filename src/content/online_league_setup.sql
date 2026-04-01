-- Studio Magnate — Online League (Supabase schema)
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
-- - every league member has marked themselves "ready" for the next turn, or
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
grant execute on function public.join_online_league(text, text) to authenticated;

-- === 20260315000000_online_league_turn_states.sql ===
-- Online League: host-authoritative turn snapshots
--
-- Option B multiplayer model:
-- - The league owner (host) writes the authoritative state for each turn.
-- - Members may read the state for leagues they belong to.
--
-- Notes:
-- - "snapshot_json" is stored as text to avoid depending on a specific JSON schema.
-- - The host can upsert a turn snapshot (e.g. retry publish).

create table if not exists public.online_league_turn_states (
  league_id uuid not null references public.online_leagues (id) on delete cascade,
  turn integer not null,
  snapshot_json text not null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (league_id, turn)
);

create index if not exists online_league_turn_states_league_turn_idx
  on public.online_league_turn_states (league_id, turn desc);

alter table public.online_league_turn_states enable row level security;

-- Members can read snapshots for leagues they belong to.
create policy "online_league_turn_states_select_for_members"
  on public.online_league_turn_states
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.online_league_members m
      where m.league_id = online_league_turn_states.league_id
        and m.user_id = auth.uid()
    )
  );

-- Only the league owner (host) can write snapshots.
create policy "online_league_turn_states_insert_host"
  on public.online_league_turn_states
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1
      from public.online_leagues l
      where l.id = online_league_turn_states.league_id
        and l.owner_user_id = auth.uid()
    )
  );

create policy "online_league_turn_states_update_host"
  on public.online_league_turn_states
  for update
  to authenticated
  using (
    created_by = auth.uid()
    and exists (
      select 1
      from public.online_leagues l
      where l.id = online_league_turn_states.league_id
        and l.owner_user_id = auth.uid()
    )
  )
  with check (
    created_by = auth.uid()
    and exists (
      select 1
      from public.online_leagues l
      where l.id = online_league_turn_states.league_id
        and l.owner_user_id = auth.uid()
    )
  );

-- === 20260316000000_online_league_ready_events.sql ===
-- Online League: ready-order events (first-ready conflict resolution)
--
-- Records the timestamp at which each member marked ready for a given turn.
-- This is used to deterministically resolve conflicts (e.g., talent deals)
-- by "first to ready" order.

create table if not exists public.online_league_ready_events (
  league_id uuid not null references public.online_leagues (id) on delete cascade,
  turn integer not null,
  user_id uuid not null,
  ready_at timestamptz not null default now(),
  primary key (league_id, turn, user_id)
);

create index if not exists online_league_ready_events_league_turn_ready_at_idx
  on public.online_league_ready_events (league_id, turn, ready_at asc);

alter table public.online_league_ready_events enable row level security;

create policy "online_league_ready_events_select_for_members"
  on public.online_league_ready_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.online_league_members m
      where m.league_id = online_league_ready_events.league_id
        and m.user_id = auth.uid()
    )
  );

create policy "online_league_ready_events_insert_self"
  on public.online_league_ready_events
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.online_league_members m
      where m.league_id = online_league_ready_events.league_id
        and m.user_id = auth.uid()
    )
  );

create policy "online_league_ready_events_delete_self"
  on public.online_league_ready_events
  for delete
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.online_league_members m
      where m.league_id = online_league_ready_events.league_id
        and m.user_id = auth.uid()
    )
  );

-- Replace the lockstep gate so we log ready timestamps per-turn.
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

  -- Log the first time a player marks ready for the next turn.
  -- If they unready, we delete their event so re-readying later moves them back in the order.
  if ready then
    insert into public.online_league_ready_events (league_id, turn, user_id)
    values (league_id, next_turn, auth.uid())
    on conflict (league_id, turn, user_id)
    do nothing;
  else
    delete from public.online_league_ready_events e
    where e.league_id = league_id
      and e.turn = next_turn
      and e.user_id = auth.uid();
  end if;

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

-- === 20260316001000_online_league_turn_compile.sql ===
-- Online League: end-of-turn submissions + host resolution
--
-- Model:
-- - Players submit their turn intents when they ready up for the next turn.
-- - The host resolves conflicts (e.g. talent hires) using "first ready" order.
-- - Resolutions are stored per turn; players can read them at turn start.
-- - A lightweight inbox stores immersive notifications about outcomes.

create table if not exists public.online_league_turn_submissions (
  league_id uuid not null references public.online_leagues (id) on delete cascade,
  turn integer not null,
  user_id uuid not null,
  submission_json text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (league_id, turn, user_id)
);

create index if not exists online_league_turn_submissions_league_turn_idx
  on public.online_league_turn_submissions (league_id, turn);

alter table public.online_league_turn_submissions enable row level security;

create policy "online_league_turn_submissions_select_for_members"
  on public.online_league_turn_submissions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.online_league_members m
      where m.league_id = online_league_turn_submissions.league_id
        and m.user_id = auth.uid()
    )
  );

create policy "online_league_turn_submissions_upsert_self"
  on public.online_league_turn_submissions
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.online_league_members m
      where m.league_id = online_league_turn_submissions.league_id
        and m.user_id = auth.uid()
    )
  );

create policy "online_league_turn_submissions_update_self"
  on public.online_league_turn_submissions
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Host-written resolutions (conflict outcomes, etc.)
create table if not exists public.online_league_turn_resolutions (
  league_id uuid not null references public.online_leagues (id) on delete cascade,
  turn integer not null,
  resolution_json text not null,
  resolved_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (league_id, turn)
);

create index if not exists online_league_turn_resolutions_league_turn_idx
  on public.online_league_turn_resolutions (league_id, turn desc);

alter table public.online_league_turn_resolutions enable row level security;

create policy "online_league_turn_resolutions_select_for_members"
  on public.online_league_turn_resolutions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.online_league_members m
      where m.league_id = online_league_turn_resolutions.league_id
        and m.user_id = auth.uid()
    )
  );

create policy "online_league_turn_resolutions_insert_host"
  on public.online_league_turn_resolutions
  for insert
  to authenticated
  with check (
    resolved_by = auth.uid()
    and exists (
      select 1
      from public.online_leagues l
      where l.id = online_league_turn_resolutions.league_id
        and l.owner_user_id = auth.uid()
    )
  );

create policy "online_league_turn_resolutions_update_host"
  on public.online_league_turn_resolutions
  for update
  to authenticated
  using (
    resolved_by = auth.uid()
    and exists (
      select 1
      from public.online_leagues l
      where l.id = online_league_turn_resolutions.league_id
        and l.owner_user_id = auth.uid()
    )
  )
  with check (
    resolved_by = auth.uid()
    and exists (
      select 1
      from public.online_leagues l
      where l.id = online_league_turn_resolutions.league_id
        and l.owner_user_id = auth.uid()
    )
  );

-- Per-player notifications (immersive explanations)
create table if not exists public.online_league_messages (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.online_leagues (id) on delete cascade,
  user_id uuid not null,
  turn integer not null,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists online_league_messages_inbox_idx
  on public.online_league_messages (league_id, user_id, read_at nulls first, created_at desc);

alter table public.online_league_messages enable row level security;

create policy "online_league_messages_select_recipient"
  on public.online_league_messages
  for select
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.online_league_members m
      where m.league_id = online_league_messages.league_id
        and m.user_id = auth.uid()
    )
  );

create policy "online_league_messages_update_recipient"
  on public.online_league_messages
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "online_league_messages_insert_host"
  on public.online_league_messages
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.online_leagues l
      where l.id = online_league_messages.league_id
        and l.owner_user_id = auth.uid()
    )
    and exists (
      select 1
      from public.online_league_members m
      where m.league_id = online_league_messages.league_id
        and m.user_id = online_league_messages.user_id
    )
  );

-- === 20260317000000_online_league_seasons.sql ===
-- Online League: fixed start year + season length cap
--
-- Goals:
-- - All leagues start in a fixed in-game year (2026) so the shared talent pool is consistent.
-- - The league owner selects a season length (years). The server enforces a max turn so the season ends cleanly.

alter table public.online_leagues
  add column if not exists start_year integer not null default 2026;

alter table public.online_leagues
  add column if not exists season_years integer not null default 6;

-- Update league creation RPC to accept a season length.
--
-- Note: drop the older 3-arg overload to avoid PostgREST ambiguity when season_years is omitted.
drop function if exists public.create_online_league(text, text, text);

create or replace function public.create_online_league(
  league_code text,
  league_name text,
  studio_name text,
  season_years integer default 6
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_league_id uuid;
  normalized_season_years integer;
begin
  normalized_season_years := greatest(1, least(coalesce(season_years, 6), 20));

  insert into public.online_leagues (code, name, owner_user_id, start_year, season_years)
  values (upper(league_code), league_name, auth.uid(), 2026, normalized_season_years)
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

grant execute on function public.create_online_league(text, text, text, integer) to authenticated;

-- Keep join RPC behavior the same (but re-declare so migrations remain order-independent).
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

grant execute on function public.join_online_league(text, text) to authenticated;

-- Enforce a season cap at the lockstep gate level.
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
  season_years integer;
  max_turn integer;
begin
  select l.id, l.owner_user_id, l.season_years
  into league_id, owner_id, season_years
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

  -- Max turn is inclusive; e.g. 6 years => max_turn = 312 - 1 => ends at Y2031W52.
  max_turn := (greatest(1, coalesce(season_years, 6)) * 52) - 1;

  -- Log the first time a player marks ready for the next turn.
  -- If they unready, we delete their event so re-readying later moves them back in the order.
  if ready then
    insert into public.online_league_ready_events (league_id, turn, user_id)
    values (league_id, next_turn, auth.uid())
    on conflict (league_id, turn, user_id)
    do nothing;
  else
    delete from public.online_league_ready_events e
    where e.league_id = league_id
      and e.turn = next_turn
      and e.user_id = auth.uid();
  end if;

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
    -- Season cap: do not advance beyond the final allowed turn.
    if next_turn > max_turn then
      return current_turn;
    end if;

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

-- === 20260318000000_online_league_retention.sql ===
-- Online League: retention + capacity hardening
--
-- Goals:
-- - Keep DB growth bounded (prune per-turn data).
-- - Allow periodic cleanup of inactive / completed leagues.
-- - Add basic input/size constraints to reduce abuse.
-- - Provide clearer failure modes (league full / no capacity).

-- Basic size limits (defense-in-depth; also helps keep hosted Supabase costs stable).
--
-- NOTE: Keep these limits generous enough to avoid breaking legitimate play.
-- If you bump client-side snapshot size, adjust these constraints accordingly.

alter table public.online_leagues
  add constraint online_leagues_code_format
    check (code ~ '^[A-HJ-NP-Z2-9]{6,12}$') not valid;

alter table public.online_leagues
  add constraint online_leagues_name_len
    check (char_length(name) <= 80) not valid;

alter table public.online_league_members
  add constraint online_league_members_studio_name_len
    check (char_length(studio_name) <= 60) not valid;

alter table public.online_league_snapshots
  add constraint online_league_snapshots_studio_name_len
    check (char_length(studio_name) <= 60) not valid;

alter table public.online_league_turn_submissions
  add constraint online_league_turn_submissions_json_len
    check (char_length(submission_json) <= 20000) not valid;

alter table public.online_league_turn_resolutions
  add constraint online_league_turn_resolutions_json_len
    check (char_length(resolution_json) <= 60000) not valid;

alter table public.online_league_turn_states
  add constraint online_league_turn_states_json_len
    check (char_length(snapshot_json) <= 1000000) not valid;

alter table public.online_league_messages
  add constraint online_league_messages_title_len
    check (char_length(title) <= 80) not valid;

alter table public.online_league_messages
  add constraint online_league_messages_body_len
    check (char_length(body) <= 800) not valid;

-- Delete inactive / completed leagues (everything cascades via FK on delete cascade).
create or replace function public.cleanup_online_leagues(
  inactive_after interval default interval '14 days',
  completed_after interval default interval '7 days'
)
returns integer
language plpgsql
security definer
set search_path = public
as $cleanup$
declare
  deleted_count integer;
begin
  with inactive as (
    select l.id
    from public.online_leagues l
    left join public.online_league_members m
      on m.league_id = l.id
    group by l.id, l.created_at
    having coalesce(max(m.last_seen_at), l.created_at) < now() - inactive_after
  ),
  completed as (
    select l.id
    from public.online_leagues l
    join public.online_league_clock c
      on c.league_id = l.id
    where c.turn >= ((l.season_years * 52) - 1)
      and c.updated_at < now() - completed_after
  ),
  candidates as (
    select id from inactive
    union
    select id from completed
  )
  delete from public.online_leagues l
  using candidates c
  where l.id = c.id;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$cleanup$;

revoke execute on function public.cleanup_online_leagues(interval, interval) from public;

-- Prune per-turn data to keep storage bounded.
create or replace function public.prune_online_league_turn_data(
  target_league_id uuid,
  keep_from_turn integer
)
returns void
language plpgsql
security definer
set search_path = public
as $prune$
begin
  delete from public.online_league_turn_states
  where league_id = target_league_id
    and turn < keep_from_turn;

  delete from public.online_league_turn_submissions
  where league_id = target_league_id
    and turn < keep_from_turn;

  delete from public.online_league_turn_resolutions
  where league_id = target_league_id
    and turn < keep_from_turn;

  delete from public.online_league_ready_events
  where league_id = target_league_id
    and turn < keep_from_turn;
end;
$prune$;

revoke execute on function public.prune_online_league_turn_data(uuid, integer) from public;

-- Capacity checks + opportunistic cleanup in join/create.
create or replace function public.create_online_league(
  league_code text,
  league_name text,
  studio_name text,
  season_years integer default 6
)
returns uuid
language plpgsql
security definer
set search_path = public
as $create$
declare
  new_league_id uuid;
  normalized_season_years integer;
  normalized_code text;
  max_active_leagues integer := 2500;
  active_leagues integer;
begin
  perform public.cleanup_online_leagues();

  select count(*) into active_leagues
  from public.online_leagues;

  if active_leagues >= max_active_leagues then
    raise exception 'No league spots available';
  end if;

  normalized_code := upper(trim(coalesce(league_code, '')));
  if normalized_code = '' or normalized_code !~ '^[A-HJ-NP-Z2-9]{6,12}$' then
    raise exception 'Invalid league code';
  end if;

  if char_length(coalesce(league_name, '')) = 0 or char_length(league_name) > 80 then
    raise exception 'Invalid league name';
  end if;

  if char_length(coalesce(studio_name, '')) = 0 or char_length(studio_name) > 60 then
    raise exception 'Invalid studio name';
  end if;

  normalized_season_years := greatest(1, least(coalesce(season_years, 6), 20));

  insert into public.online_leagues (code, name, owner_user_id, start_year, season_years)
  values (normalized_code, league_name, auth.uid(), 2026, normalized_season_years)
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
$create$;

revoke execute on function public.create_online_league(text, text, text, integer) from public;
grant execute on function public.create_online_league(text, text, text, integer) to authenticated;

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
  normalized_code text;
  max_members integer := 8;
  member_count integer;
  already_member boolean;
begin
  perform public.cleanup_online_leagues();

  normalized_code := upper(trim(coalesce(league_code, '')));
  if normalized_code = '' or normalized_code !~ '^[A-HJ-NP-Z2-9]{6,12}$' then
    raise exception 'Invalid league code';
  end if;

  if char_length(coalesce(studio_name, '')) = 0 or char_length(studio_name) > 60 then
    raise exception 'Invalid studio name';
  end if;

  select l.id into league_id
  from public.online_leagues l
  where l.code = normalized_code
  limit 1;

  if league_id is null then
    raise exception 'League not found';
  end if;

  select exists (
    select 1
    from public.online_league_members m
    where m.league_id = league_id
      and m.user_id = auth.uid()
  ) into already_member;

  if not already_member then
    select count(*) into member_count
    from public.online_league_members m
    where m.league_id = league_id;

    if member_count >= max_members then
      raise exception 'League is full';
    end if;
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

revoke execute on function public.join_online_league(text, text) from public;
grant execute on function public.join_online_league(text, text) to authenticated;

-- Replace the lockstep gate so we prune historical rows while keeping deterministic ready order.
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
  season_years integer;
  max_turn integer;
  prune_from integer;
  keep_turns integer := 3;
begin
  select l.id, l.owner_user_id, l.season_years
  into league_id, owner_id, season_years
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

  -- Max turn is inclusive; e.g. 6 years => max_turn = 312 - 1 => ends at Y2031W52.
  max_turn := (greatest(1, coalesce(season_years, 6)) * 52) - 1;

  -- Log the first time a player marks ready for the next turn.
  -- If they unready, we delete their event so re-readying later moves them back in the order.
  if ready then
    insert into public.online_league_ready_events (league_id, turn, user_id)
    values (league_id, next_turn, auth.uid())
    on conflict (league_id, turn, user_id)
    do nothing;
  else
    delete from public.online_league_ready_events e
    where e.league_id = league_id
      and e.turn = next_turn
      and e.user_id = auth.uid();
  end if;

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
    -- Season cap: do not advance beyond the final allowed turn.
    if next_turn > max_turn then
      return current_turn;
    end if;

    update public.online_league_clock
    set turn = next_turn,
        last_advanced_by = auth.uid(),
        updated_at = now()
    where online_league_clock.league_id = league_id;

    update public.online_league_ready
    set ready_for_turn = 0,
        updated_at = now()
    where online_league_ready.league_id = league_id;

    -- Retention: keep only a small tail of turn-scoped rows.
    prune_from := greatest(0, next_turn - keep_turns);
    perform public.prune_online_league_turn_data(league_id, prune_from);

    return next_turn;
  end if;

  return current_turn;
end;
$$;

revoke execute on function public.set_online_league_ready(text, boolean, boolean) from public;
grant execute on function public.set_online_league_ready(text, boolean, boolean) to authenticated;

-- === 20260319000000_online_league_unique_studio_names.sql ===
-- Online League: enforce unique studio names per league
--
-- Human studios shouldn't be able to share the same name in the same league.
-- We enforce this as a case-insensitive, trim-insensitive uniqueness rule.

-- If there are existing duplicate names (from before this constraint existed),
-- resolve them deterministically so the unique index can be created.
with ranked as (
  select
    league_id,
    user_id,
    studio_name,
    row_number() over (
      partition by league_id, lower(btrim(studio_name))
      order by joined_at asc, user_id asc
    ) as rn
  from public.online_league_members
)
update public.online_league_members m
set studio_name = left(btrim(m.studio_name) || ' [' || r.rn::text || ']', 60)
from ranked r
where m.league_id = r.league_id
  and m.user_id = r.user_id
  and r.rn > 1;

create unique index if not exists online_league_members_league_studio_name_uniq
  on public.online_league_members (league_id, lower(btrim(studio_name)));

-- Update RPCs to surface a friendly error before we hit the unique index.
-- This also prevents accidental rename collisions when a member updates studio_name.

create or replace function public.create_online_league(
  league_code text,
  league_name text,
  studio_name text,
  season_years integer default 6
)
returns uuid
language plpgsql
security definer
set search_path = public
as $create$
declare
  new_league_id uuid;
  normalized_season_years integer;
  normalized_code text;
  normalized_studio_name text;
  max_active_leagues integer := 2500;
  active_leagues integer;
begin
  perform public.cleanup_online_leagues();

  select count(*) into active_leagues
  from public.online_leagues;

  if active_leagues >= max_active_leagues then
    raise exception 'No league spots available';
  end if;

  normalized_code := upper(trim(coalesce(league_code, '')));
  if normalized_code = '' or normalized_code !~ '^[A-HJ-NP-Z2-9]{6,12}$' then
    raise exception 'Invalid league code';
  end if;

  if char_length(coalesce(league_name, '')) = 0 or char_length(league_name) > 80 then
    raise exception 'Invalid league name';
  end if;

  normalized_studio_name := btrim(coalesce(studio_name, ''));
  if char_length(normalized_studio_name) = 0 or char_length(normalized_studio_name) > 60 then
    raise exception 'Invalid studio name';
  end if;

  normalized_season_years := greatest(1, least(coalesce(season_years, 6), 20));

  insert into public.online_leagues (code, name, owner_user_id, start_year, season_years)
  values (normalized_code, league_name, auth.uid(), 2026, normalized_season_years)
  returning id into new_league_id;

  insert into public.online_league_members (league_id, user_id, studio_name)
  values (new_league_id, auth.uid(), normalized_studio_name)
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
$create$;

revoke execute on function public.create_online_league(text, text, text, integer) from public;
grant execute on function public.create_online_league(text, text, text, integer) to authenticated;

create or replace function public.join_online_league(
  league_code text,
  studio_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $join$
declare
  league_id uuid;
  normalized_code text;
  normalized_studio_name text;
  existing_studio_name text;
  max_members integer := 8;
  member_count integer;
  already_member boolean;
begin
  perform public.cleanup_online_leagues();

  normalized_code := upper(trim(coalesce(league_code, '')));
  if normalized_code = '' or normalized_code !~ '^[A-HJ-NP-Z2-9]{6,12}$' then
    raise exception 'Invalid league code';
  end if;

  normalized_studio_name := btrim(coalesce(studio_name, ''));
  if char_length(normalized_studio_name) = 0 or char_length(normalized_studio_name) > 60 then
    raise exception 'Invalid studio name';
  end if;

  select l.id into league_id
  from public.online_leagues l
  where l.code = normalized_code
  limit 1;

  if league_id is null then
    raise exception 'League not found';
  end if;

  select exists (
    select 1
    from public.online_league_members m
    where m.league_id = league_id
      and m.user_id = auth.uid()
  ) into already_member;

  if not already_member then
    select count(*) into member_count
    from public.online_league_members m
    where m.league_id = league_id;

    if member_count >= max_members then
      raise exception 'League is full';
    end if;
  end if;

  if exists (
    select 1
    from public.online_league_members m
    where m.league_id = league_id
      and lower(btrim(m.studio_name)) = lower(normalized_studio_name)
      and m.user_id <> auth.uid()
  ) then
    if already_member then
      select m.studio_name into existing_studio_name
      from public.online_league_members m
      where m.league_id = league_id
        and m.user_id = auth.uid()
      limit 1;

      normalized_studio_name := btrim(coalesce(existing_studio_name, normalized_studio_name));
    else
      raise exception 'Studio name already taken';
    end if;
  end if;

  insert into public.online_league_members (league_id, user_id, studio_name)
  values (league_id, auth.uid(), normalized_studio_name)
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
$join$;

revoke execute on function public.join_online_league(text, text) from public;
grant execute on function public.join_online_league(text, text) to authenticated;
