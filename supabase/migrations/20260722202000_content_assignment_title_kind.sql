-- STORY-9.4 follow-up: snapshot title/kind on assignment so players see real labels
-- even when nested coach_library_items embeds are filtered by RLS.

alter table public.content_assignments
  add column if not exists title text,
  add column if not exists kind text;

update public.content_assignments a
set
  title = coalesce(a.title, i.title, 'Assigned content'),
  kind = coalesce(a.kind, i.kind, 'drill')
from public.coach_library_items i
where i.id = a.library_item_id
  and (a.title is null or a.kind is null);

alter table public.content_assignments
  alter column title set default 'Assigned content',
  alter column kind set default 'drill';

update public.content_assignments set title = 'Assigned content' where title is null;
update public.content_assignments set kind = 'drill' where kind is null;

alter table public.content_assignments
  alter column title set not null,
  alter column kind set not null;

alter table public.content_assignments
  drop constraint if exists content_assignments_kind_check;

alter table public.content_assignments
  add constraint content_assignments_kind_check
  check (kind in ('drill', 'video', 'strategy', 'package'));

comment on column public.content_assignments.title is
  'Snapshot of library item title at assign time (player list does not rely on library embed).';

comment on column public.content_assignments.kind is
  'Snapshot of library item kind at assign time.';
