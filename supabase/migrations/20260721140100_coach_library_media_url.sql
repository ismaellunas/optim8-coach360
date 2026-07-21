-- STORY-7.1 — provisional video playback URLs until STORY-9.3 / Mux

alter table public.coach_library_items
  add column if not exists media_url text;

comment on column public.coach_library_items.media_url is
  'Optional playback URL for video items (Mux HLS in STORY-9.3; demo URL for MVP).';
