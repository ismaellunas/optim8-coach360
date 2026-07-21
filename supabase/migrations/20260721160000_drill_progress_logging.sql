-- STORY-7.2 — optional drill reps/time on session content completions

alter table public.session_content_completions
  add column if not exists reps integer check (reps is null or reps >= 0),
  add column if not exists duration_seconds integer check (duration_seconds is null or duration_seconds >= 0);

create index if not exists session_content_completions_player_idx
  on public.session_content_completions (player_id, completed_at desc);

comment on column public.session_content_completions.reps is
  'Optional rep count when player logs a drill completion (STORY-7.2).';
comment on column public.session_content_completions.duration_seconds is
  'Optional duration in seconds when player logs a drill completion (STORY-7.2).';
