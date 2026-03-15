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
