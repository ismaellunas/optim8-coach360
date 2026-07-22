-- STORY-8.2 — rich chat messages (text, content links, video attachments)

------------------------------------------------------------------------------
-- chat_messages — typed body + optional attachment payload
------------------------------------------------------------------------------

alter table public.chat_messages
  add column if not exists message_type text not null default 'text';

alter table public.chat_messages
  add column if not exists attachment jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chat_messages_message_type_check'
  ) then
    alter table public.chat_messages
      add constraint chat_messages_message_type_check
      check (message_type in ('text', 'content_link', 'video'));
  end if;
end $$;

-- Allow empty body when an attachment carries the payload (content_link / video).
do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'chat_messages'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%body%'
  loop
    execute format('alter table public.chat_messages drop constraint if exists %I', r.conname);
  end loop;
end $$;

alter table public.chat_messages
  add constraint chat_messages_body_or_attachment_check
  check (
    (
      message_type = 'text'
      and char_length(trim(body)) > 0
      and attachment is null
    )
    or (
      message_type = 'content_link'
      and attachment is not null
      and attachment ? 'kind'
      and attachment ? 'id'
      and attachment ? 'title'
    )
    or (
      message_type = 'video'
      and attachment is not null
      and attachment ? 'url'
      and attachment ? 'storagePath'
    )
  );

comment on column public.chat_messages.message_type is
  'MVP rich message kind: text | content_link | video (STORY-8.2).';

comment on column public.chat_messages.attachment is
  'JSON payload for content_link or video attachments (STORY-8.2).';

------------------------------------------------------------------------------
-- Storage — chat-media bucket (channel members can write under channel folder)
------------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', true)
on conflict (id) do nothing;

drop policy if exists chat_media_public_read on storage.objects;
create policy chat_media_public_read
  on storage.objects for select
  using (bucket_id = 'chat-media');

drop policy if exists chat_media_member_insert on storage.objects;
create policy chat_media_member_insert
  on storage.objects for insert
  with check (
    bucket_id = 'chat-media'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists chat_media_member_update on storage.objects;
create policy chat_media_member_update
  on storage.objects for update
  using (
    bucket_id = 'chat-media'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists chat_media_member_delete on storage.objects;
create policy chat_media_member_delete
  on storage.objects for delete
  using (
    bucket_id = 'chat-media'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );
