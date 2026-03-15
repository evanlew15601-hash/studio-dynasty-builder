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
