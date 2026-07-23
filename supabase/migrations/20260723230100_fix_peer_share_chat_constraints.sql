-- Repair: STORY-8.3 peer-share constraints never applied on DBs that recorded
-- version 20260722140000 as profiles_team_creator_select (timestamp collision).
-- Idempotent re-apply of achievement/insight message_type + body/attachment checks.

alter table public.chat_messages
  drop constraint if exists chat_messages_message_type_check;

alter table public.chat_messages
  add constraint chat_messages_message_type_check
  check (message_type in ('text', 'content_link', 'video', 'achievement', 'insight'));

alter table public.chat_messages
  drop constraint if exists chat_messages_body_or_attachment_check;

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
    or (
      message_type = 'achievement'
      and attachment is not null
      and (attachment ->> 'shareType') = 'achievement'
      and attachment ? 'title'
    )
    or (
      message_type = 'insight'
      and attachment is not null
      and (attachment ->> 'shareType') = 'insight'
      and attachment ? 'title'
      and attachment ? 'tip'
    )
  );

comment on column public.chat_messages.message_type is
  'MVP rich message kind: text | content_link | video | achievement | insight (STORY-8.2/8.3).';
