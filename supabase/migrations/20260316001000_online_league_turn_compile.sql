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
