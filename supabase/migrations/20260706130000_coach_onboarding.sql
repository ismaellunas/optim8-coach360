-- STORY-2.4 — Coach guided onboarding completion tracking

alter table public.profiles
  add column if not exists coach_onboarding_completed_at timestamptz;

------------------------------------------------------------------------------
-- complete_coach_onboarding — mark Flow 15 wizard complete for current coach
------------------------------------------------------------------------------

create or replace function public.complete_coach_onboarding()
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
  set coach_onboarding_completed_at = coalesce(coach_onboarding_completed_at, now())
  where id = uid
    and role = 'coach'
  returning * into result;

  if result.id is null then
    raise exception 'profile_not_found';
  end if;

  return result;
end;
$$;

grant execute on function public.complete_coach_onboarding() to authenticated;
