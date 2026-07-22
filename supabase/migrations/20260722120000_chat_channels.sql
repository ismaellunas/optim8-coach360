-- STORY-8.1 — Chat channel model (team / dm / p2p) + Supabase Realtime

create type public.chat_channel_type as enum ('team', 'dm', 'p2p');

create table if not exists public.chat_channels (
  id uuid primary key default gen_random_uuid(),
  type public.chat_channel_type not null,
  team_id uuid references public.teams (id) on delete cascade,
  member_a uuid references public.profiles (id) on delete cascade,
  member_b uuid references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint chat_channels_shape check (
    (
      type = 'team'
      and team_id is not null
      and member_a is null
      and member_b is null
    )
    or (
      type in ('dm', 'p2p')
      and team_id is null
      and member_a is not null
      and member_b is not null
      and member_a < member_b
    )
  )
);

create unique index if not exists chat_channels_team_unique
  on public.chat_channels (team_id)
  where type = 'team';

create unique index if not exists chat_channels_pair_unique
  on public.chat_channels (type, member_a, member_b)
  where type in ('dm', 'p2p');

create table if not exists public.chat_channel_members (
  channel_id uuid not null references public.chat_channels (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default 'epoch'::timestamptz,
  joined_at timestamptz not null default now(),
  primary key (channel_id, profile_id)
);

create index if not exists chat_channel_members_profile_idx
  on public.chat_channel_members (profile_id);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.chat_channels (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_channel_created_idx
  on public.chat_messages (channel_id, created_at asc);

create or replace function public.is_chat_channel_member(p_channel_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chat_channel_members m
    where m.channel_id = p_channel_id
      and m.profile_id = p_user_id
  );
$$;

alter table public.chat_channels enable row level security;
alter table public.chat_channel_members enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists chat_channels_member_select on public.chat_channels;
create policy chat_channels_member_select
  on public.chat_channels for select
  using (
    public.is_chat_channel_member(id, auth.uid())
    or (
      type = 'team'
      and team_id is not null
      and public.is_team_member(team_id, auth.uid())
    )
    or public.is_admin(auth.uid())
  );

drop policy if exists chat_channels_participant_insert on public.chat_channels;
create policy chat_channels_participant_insert
  on public.chat_channels for insert
  with check (
    public.is_admin(auth.uid())
    or (
      type = 'team'
      and team_id is not null
      and (
        public.is_team_member(team_id, auth.uid())
        or public.is_team_coach(team_id, auth.uid())
      )
    )
    or (
      type in ('dm', 'p2p')
      and member_a is not null
      and member_b is not null
      and (auth.uid() = member_a or auth.uid() = member_b)
    )
  );

drop policy if exists chat_channel_members_select on public.chat_channel_members;
create policy chat_channel_members_select
  on public.chat_channel_members for select
  using (
    profile_id = auth.uid()
    or public.is_chat_channel_member(channel_id, auth.uid())
    or public.is_admin(auth.uid())
  );

drop policy if exists chat_channel_members_insert on public.chat_channel_members;
create policy chat_channel_members_insert
  on public.chat_channel_members for insert
  with check (
    public.is_admin(auth.uid())
    or public.is_chat_channel_member(channel_id, auth.uid())
    or exists (
      select 1
      from public.chat_channels c
      where c.id = channel_id
        and (
          (
            c.type = 'team'
            and c.team_id is not null
            and (
              public.is_team_member(c.team_id, auth.uid())
              or public.is_team_coach(c.team_id, auth.uid())
            )
          )
          or (
            c.type in ('dm', 'p2p')
            and (auth.uid() = c.member_a or auth.uid() = c.member_b)
          )
        )
    )
  );

drop policy if exists chat_channel_members_update_self on public.chat_channel_members;
create policy chat_channel_members_update_self
  on public.chat_channel_members for update
  using (profile_id = auth.uid() or public.is_admin(auth.uid()))
  with check (profile_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists chat_messages_member_select on public.chat_messages;
create policy chat_messages_member_select
  on public.chat_messages for select
  using (
    public.is_chat_channel_member(channel_id, auth.uid())
    or public.is_admin(auth.uid())
  );

drop policy if exists chat_messages_member_insert on public.chat_messages;
create policy chat_messages_member_insert
  on public.chat_messages for insert
  with check (
    sender_id = auth.uid()
    and public.is_chat_channel_member(channel_id, auth.uid())
  );

grant select, insert on public.chat_channels to authenticated;
grant select, insert, update on public.chat_channel_members to authenticated;
grant select, insert on public.chat_messages to authenticated;
grant all on public.chat_channels to service_role;
grant all on public.chat_channel_members to service_role;
grant all on public.chat_messages to service_role;

-- Backfill coach-player DMs from STORY-7.3 direct_messages
insert into public.chat_channels (type, member_a, member_b)
select distinct
  'dm'::public.chat_channel_type,
  least(dm.coach_id, dm.player_id),
  greatest(dm.coach_id, dm.player_id)
from public.direct_messages dm
on conflict do nothing;

insert into public.chat_channel_members (channel_id, profile_id)
select c.id, c.member_a
from public.chat_channels c
where c.type = 'dm'
  and c.member_a is not null
on conflict do nothing;

insert into public.chat_channel_members (channel_id, profile_id)
select c.id, c.member_b
from public.chat_channels c
where c.type = 'dm'
  and c.member_b is not null
on conflict do nothing;

insert into public.chat_messages (channel_id, sender_id, body, created_at)
select
  c.id,
  dm.sender_id,
  dm.body,
  dm.created_at
from public.direct_messages dm
join public.chat_channels c
  on c.type = 'dm'
 and c.member_a = least(dm.coach_id, dm.player_id)
 and c.member_b = greatest(dm.coach_id, dm.player_id)
where not exists (
  select 1
  from public.chat_messages m
  where m.channel_id = c.id
    and m.sender_id = dm.sender_id
    and m.body = dm.body
    and m.created_at = dm.created_at
);

alter publication supabase_realtime add table public.chat_messages;

comment on table public.chat_channels is
  'STORY-8.1 chat channels: team group, coach-player DM, and player-to-player.';
comment on table public.chat_messages is
  'STORY-8.1 chat messages delivered via Supabase Realtime.';
comment on table public.chat_channel_members is
  'STORY-8.1 channel membership and last_read_at for unread counts.';
