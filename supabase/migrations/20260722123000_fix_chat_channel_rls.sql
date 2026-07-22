-- STORY-8.1 follow-up — fix chat_channels SELECT RLS so INSERT…RETURNING works.
-- Creating a channel required SELECT before membership rows existed; coaches who
-- only own a team (created_by) also failed team channel visibility.

create or replace function public.can_select_chat_channel(p_channel_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chat_channels c
    where c.id = p_channel_id
      and (
        public.is_admin(p_user_id)
        or public.is_chat_channel_member(c.id, p_user_id)
        or (
          c.type = 'team'
          and c.team_id is not null
          and (
            public.is_team_member(c.team_id, p_user_id)
            or public.is_team_coach(c.team_id, p_user_id)
          )
        )
        or (
          c.type in ('dm', 'p2p')
          and (p_user_id = c.member_a or p_user_id = c.member_b)
        )
      )
  );
$$;

drop policy if exists chat_channels_member_select on public.chat_channels;
create policy chat_channels_member_select
  on public.chat_channels for select
  using (
    public.is_admin(auth.uid())
    or public.is_chat_channel_member(id, auth.uid())
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
      and (auth.uid() = member_a or auth.uid() = member_b)
    )
  );

-- Member inserts need to see the parent channel row; use SECURITY DEFINER helper.
drop policy if exists chat_channel_members_insert on public.chat_channel_members;
create policy chat_channel_members_insert
  on public.chat_channel_members for insert
  with check (
    public.is_admin(auth.uid())
    or public.is_chat_channel_member(channel_id, auth.uid())
    or public.can_select_chat_channel(channel_id, auth.uid())
  );

drop policy if exists chat_channel_members_select on public.chat_channel_members;
create policy chat_channel_members_select
  on public.chat_channel_members for select
  using (
    profile_id = auth.uid()
    or public.is_chat_channel_member(channel_id, auth.uid())
    or public.can_select_chat_channel(channel_id, auth.uid())
    or public.is_admin(auth.uid())
  );
