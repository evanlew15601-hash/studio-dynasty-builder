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
