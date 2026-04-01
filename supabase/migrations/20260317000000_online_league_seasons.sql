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
