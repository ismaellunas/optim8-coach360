-- STORY-3.3 — Roster management and coach assignment

create or replace function public.remove_roster_member(
  p_team_id uuid,
  p_profile_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
begin
  if v_caller is null then
    raise exception 'not_authenticated';
  end if;

  if not public.is_team_coach(p_team_id, v_caller) then
    raise exception 'not_authorized';
  end if;

  update public.rosters
  set status = 'removed'
  where team_id = p_team_id
    and profile_id = p_profile_id
    and roster_role = 'player'
    and status <> 'removed';

  if not found then
    raise exception 'roster_member_not_found';
  end if;

  return p_profile_id;
end;
$$;

revoke all on function public.remove_roster_member(uuid, uuid) from public;
grant execute on function public.remove_roster_member(uuid, uuid) to authenticated;

create or replace function public.assign_coach_to_team_by_email(
  p_team_id uuid,
  p_email text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_profile_id uuid;
begin
  if v_caller is null then
    raise exception 'not_authenticated';
  end if;

  if not public.is_team_coach(p_team_id, v_caller) then
    raise exception 'not_authorized';
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

revoke all on function public.assign_coach_to_team_by_email(uuid, text) from public;
grant execute on function public.assign_coach_to_team_by_email(uuid, text) to authenticated;
