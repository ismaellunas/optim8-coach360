-- STORY-2.2 — Role-specific profile fields and completion tracking.

alter table public.profiles
  add column coach_context text,
  add column age int,
  add column position text,
  add column profile_completed_at timestamptz,
  add column team_setup_path_entered_at timestamptz;

alter table public.profiles
  add constraint profiles_coach_context_valid
    check (coach_context is null or coach_context in ('independent', 'team'));

alter table public.profiles
  add constraint profiles_age_valid
    check (age is null or (age >= 5 and age <= 99));
