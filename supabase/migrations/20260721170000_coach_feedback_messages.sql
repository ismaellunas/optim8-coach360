-- STORY-7.3 — coach-player direct messages (MVP until STORY-8.1 chat SDK)

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  player_id uuid not null references public.profiles (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  check (sender_id = coach_id or sender_id = player_id)
);

create index if not exists direct_messages_thread_idx
  on public.direct_messages (coach_id, player_id, created_at desc);

alter table public.direct_messages enable row level security;

drop policy if exists direct_messages_participant_select on public.direct_messages;
create policy direct_messages_participant_select
  on public.direct_messages for select
  using (
    coach_id = auth.uid()
    or player_id = auth.uid()
    or public.is_admin(auth.uid())
  );

drop policy if exists direct_messages_participant_insert on public.direct_messages;
create policy direct_messages_participant_insert
  on public.direct_messages for insert
  with check (
    sender_id = auth.uid()
    and (coach_id = auth.uid() or player_id = auth.uid())
  );

grant select, insert on public.direct_messages to authenticated;
grant all on public.direct_messages to service_role;

comment on table public.direct_messages is
  'Coach-player DM threads for progress feedback (STORY-7.3); full chat in STORY-8.1.';
