-- STORY-12.5 — Admin onboarding configuration and team oversight
-- Admin-editable onboarding wizard config + welcome copy, and admin team
-- oversight (list/edit all teams, manage coach assignments, archive teams).

------------------------------------------------------------------------------
-- platform_settings seed for onboarding config
------------------------------------------------------------------------------

insert into public.platform_settings (key, value)
values ('onboarding_config', '{}'::jsonb)
on conflict (key) do nothing;

------------------------------------------------------------------------------
-- get / set onboarding config (AC-1 wizard steps + mandatory flags, AC-2 copy)
------------------------------------------------------------------------------

create or replace function public.get_onboarding_config()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  raw jsonb;
begin
  select value into raw
  from public.platform_settings
  where key = 'onboarding_config';

  if raw is null or jsonb_typeof(raw) is distinct from 'object' then
    return '{}'::jsonb;
  end if;

  return raw;
end;
$$;

create or replace function public.set_onboarding_config(p_config jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role public.app_role;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is distinct from 'admin' then
    raise exception 'admin_required';
  end if;

  if p_config is null or jsonb_typeof(p_config) is distinct from 'object' then
    raise exception 'invalid_onboarding_config';
  end if;

  insert into public.platform_settings (key, value, updated_at)
  values ('onboarding_config', p_config, now())
  on conflict (key) do update set
    value = excluded.value,
    updated_at = now();

  return p_config;
end;
$$;

------------------------------------------------------------------------------
-- teams: soft-archive support (AC-4)
------------------------------------------------------------------------------

alter table public.teams
  add column if not exists archived_at timestamptz;

------------------------------------------------------------------------------
-- admin_list_teams — all teams incl. archived (AC-3)
------------------------------------------------------------------------------

create or replace function public.admin_list_teams()
returns setof public.teams
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role public.app_role;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is distinct from 'admin' then
    raise exception 'admin_required';
  end if;

  return query
    select * from public.teams
    order by archived_at nulls first, created_at desc;
end;
$$;

------------------------------------------------------------------------------
-- admin_update_team — edit team settings for any team (AC-3)
------------------------------------------------------------------------------

create or replace function public.admin_update_team(
  p_team_id uuid,
  p_name text,
  p_description text,
  p_age_min int,
  p_age_max int,
  p_grade_level text,
  p_division text,
  p_season_start date,
  p_season_end date
)
returns public.teams
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role public.app_role;
  result public.teams;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is distinct from 'admin' then
    raise exception 'admin_required';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'team_name_required';
  end if;

  update public.teams
  set
    name = p_name,
    description = p_description,
    age_min = p_age_min,
    age_max = p_age_max,
    grade_level = p_grade_level,
    division = p_division,
    season_start = p_season_start,
    season_end = p_season_end,
    updated_at = now()
  where id = p_team_id
  returning * into result;

  if result.id is null then
    raise exception 'team_not_found';
  end if;

  return result;
end;
$$;

------------------------------------------------------------------------------
-- admin_set_team_archived — archive / restore a team (AC-4)
------------------------------------------------------------------------------

create or replace function public.admin_set_team_archived(
  p_team_id uuid,
  p_archived boolean
)
returns public.teams
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role public.app_role;
  result public.teams;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is distinct from 'admin' then
    raise exception 'admin_required';
  end if;

  update public.teams
  set
    archived_at = case when p_archived then now() else null end,
    updated_at = now()
  where id = p_team_id
  returning * into result;

  if result.id is null then
    raise exception 'team_not_found';
  end if;

  return result;
end;
$$;

------------------------------------------------------------------------------
-- admin_assign_coach_to_team — manage coach-team assignments (AC-4)
------------------------------------------------------------------------------

create or replace function public.admin_assign_coach_to_team(
  p_team_id uuid,
  p_email text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role public.app_role;
  v_profile_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is distinct from 'admin' then
    raise exception 'admin_required';
  end if;

  if not exists (select 1 from public.teams where id = p_team_id) then
    raise exception 'team_not_found';
  end if;

  v_profile_id := public.lookup_profile_id_by_email(p_email);

  if v_profile_id is null then
    raise exception 'coach_not_found';
  end if;

  insert into public.rosters (team_id, profile_id, roster_role, status)
  values (p_team_id, v_profile_id, 'assistant_coach', 'active')
  on conflict (team_id, profile_id) do update
    set status = 'active',
        roster_role = 'assistant_coach';

  return v_profile_id;
end;
$$;

------------------------------------------------------------------------------
-- admin_unassign_coach — remove a coach-team assignment (AC-4)
------------------------------------------------------------------------------

create or replace function public.admin_unassign_coach(
  p_team_id uuid,
  p_profile_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role public.app_role;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is distinct from 'admin' then
    raise exception 'admin_required';
  end if;

  update public.rosters
  set status = 'removed'
  where team_id = p_team_id
    and profile_id = p_profile_id
    and roster_role = 'assistant_coach'
    and status <> 'removed';

  if not found then
    raise exception 'roster_member_not_found';
  end if;

  return p_profile_id;
end;
$$;

------------------------------------------------------------------------------
-- grants
------------------------------------------------------------------------------

grant execute on function public.get_onboarding_config() to authenticated;
grant execute on function public.get_onboarding_config() to service_role;
grant execute on function public.set_onboarding_config(jsonb) to authenticated;
grant execute on function public.admin_list_teams() to authenticated;
grant execute on function public.admin_update_team(uuid, text, text, int, int, text, text, date, date) to authenticated;
grant execute on function public.admin_set_team_archived(uuid, boolean) to authenticated;
grant execute on function public.admin_assign_coach_to_team(uuid, text) to authenticated;
grant execute on function public.admin_unassign_coach(uuid, uuid) to authenticated;
