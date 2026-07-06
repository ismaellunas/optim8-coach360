-- STORY-3.1 / Q11.5 — Team age range profile fields (grade level, division).

alter table public.teams
  add column grade_level text,
  add column division text;
