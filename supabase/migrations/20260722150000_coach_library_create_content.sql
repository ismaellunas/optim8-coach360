-- STORY-9.2 — Coach content creation on mobile (Path A library).
-- Extends provisional coach_library_items for drills/videos/strategies/packages + Mux initiate.

alter table public.coach_library_items
  add column if not exists instructions text;

alter table public.coach_library_items
  add column if not exists item_ids uuid[] not null default '{}'::uuid[];

alter table public.coach_library_items
  add column if not exists mux_upload_id text;

alter table public.coach_library_items
  add column if not exists mux_asset_id text;

alter table public.coach_library_items
  add column if not exists mux_playback_id text;

alter table public.coach_library_items
  add column if not exists transcode_status text not null default 'none';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'coach_library_items_transcode_status_check'
  ) then
    alter table public.coach_library_items
      add constraint coach_library_items_transcode_status_check
      check (transcode_status in ('none', 'pending', 'ready', 'error'));
  end if;
end $$;

comment on column public.coach_library_items.instructions is
  'Written instructions / description for drills and strategies (STORY-9.2).';

comment on column public.coach_library_items.item_ids is
  'Member library item UUIDs when kind=package (STORY-9.2 AC-3).';

comment on column public.coach_library_items.mux_upload_id is
  'Mux Direct Upload id after initiate (STORY-9.2 AC-2); asset/playback filled in STORY-9.3.';

comment on column public.coach_library_items.transcode_status is
  'none | pending | ready | error — Mux pipeline status.';

-- Optional images/files for drills/strategies (videos use Mux Direct Upload).
insert into storage.buckets (id, name, public)
values ('coach-library-media', 'coach-library-media', true)
on conflict (id) do nothing;

drop policy if exists coach_library_media_public_read on storage.objects;
create policy coach_library_media_public_read
  on storage.objects for select
  using (bucket_id = 'coach-library-media');

drop policy if exists coach_library_media_owner_insert on storage.objects;
create policy coach_library_media_owner_insert
  on storage.objects for insert
  with check (
    bucket_id = 'coach-library-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists coach_library_media_owner_update on storage.objects;
create policy coach_library_media_owner_update
  on storage.objects for update
  using (
    bucket_id = 'coach-library-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'coach-library-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists coach_library_media_owner_delete on storage.objects;
create policy coach_library_media_owner_delete
  on storage.objects for delete
  using (
    bucket_id = 'coach-library-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
