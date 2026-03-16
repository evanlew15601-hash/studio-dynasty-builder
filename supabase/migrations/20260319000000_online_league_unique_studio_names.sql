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
