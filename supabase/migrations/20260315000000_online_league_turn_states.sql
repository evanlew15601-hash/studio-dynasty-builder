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
