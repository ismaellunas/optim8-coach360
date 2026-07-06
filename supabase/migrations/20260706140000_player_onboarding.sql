-- STORY-2.5 — Player guided onboarding completion and first-drill progress

alter table public.profiles
  add column if not exists player_onboarding_completed_at timestamptz,
  add column if not exists first_drill_completed_at timestamptz,
  add column if not exists player_drills_completed_count int not null default 0;

alter table public.profiles
  add constraint profiles_player_drills_completed_count_valid
    check (player_drills_completed_count >= 0);

------------------------------------------------------------------------------
-- log_player_first_drill — record first drill completion for current player
------------------------------------------------------------------------------

create or replace function public.log_player_first_drill()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  result public.profiles;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  update public.profiles
  set
    first_drill_completed_at = coalesce(first_drill_completed_at, now()),
    player_drills_completed_count = player_drills_completed_count + 1
  where id = uid
    and role = 'player'
  returning * into result;

  if result.id is null then
    raise exception 'profile_not_found';
  end if;

  return result;
end;
$$;

grant execute on function public.log_player_first_drill() to authenticated;

------------------------------------------------------------------------------
-- complete_player_onboarding — mark Flow 16 wizard complete for current player
------------------------------------------------------------------------------

create or replace function public.complete_player_onboarding()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  result public.profiles;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  update public.profiles
  set player_onboarding_completed_at = coalesce(player_onboarding_completed_at, now())
  where id = uid
    and role = 'player'
  returning * into result;

  if result.id is null then
    raise exception 'profile_not_found';
  end if;

  return result;
end;
$$;

grant execute on function public.complete_player_onboarding() to authenticated;
