-- RETURNS TABLE columns are plpgsql variables. ON CONFLICT (team_id) then
-- raised "column reference team_id is ambiguous". Prefer table columns.

create or replace function public.list_my_chat_conversations()
returns table (
  id uuid,
  channel_type public.chat_channel_type,
  team_id uuid,
  peer_id uuid,
  title text,
  last_body text,
  last_message_type text,
  last_attachment jsonb,
  last_at timestamptz,
  unread_count integer
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.chat_channels as ch (type, team_id)
  select 'team'::public.chat_channel_type, mine.team_id
  from (
    select r.team_id
    from public.rosters r
    where r.profile_id = uid
      and r.status = 'active'
    union
    select t.id
    from public.teams t
    where t.created_by = uid
  ) mine
  on conflict (team_id) where type = 'team' do nothing;

  insert into public.chat_channel_members (channel_id, profile_id)
  select c.id, uid
  from public.chat_channels c
  join (
    select r.team_id
    from public.rosters r
    where r.profile_id = uid
      and r.status = 'active'
    union
    select t.id
    from public.teams t
    where t.created_by = uid
  ) mine on mine.team_id = c.team_id
  where c.type = 'team'
  on conflict (channel_id, profile_id) do nothing;

  return query
  select
    c.id,
    c.type as channel_type,
    c.team_id,
    case
      when c.type = 'team' then null::uuid
      when c.member_a = uid then c.member_b
      else c.member_a
    end as peer_id,
    case
      when c.type = 'team' then coalesce(t.name, 'Team chat')
      else coalesce(
        p.display_name,
        case when c.type = 'p2p' then 'Peer chat' else 'Direct message' end
      )
    end as title,
    last.body as last_body,
    last.message_type as last_message_type,
    last.attachment as last_attachment,
    last.created_at as last_at,
    coalesce(unread.n, 0) as unread_count
  from public.chat_channel_members m
  join public.chat_channels c on c.id = m.channel_id
  left join public.teams t on t.id = c.team_id
  left join public.profiles p on p.id = case
    when c.member_a = uid then c.member_b
    else c.member_a
  end
  left join lateral (
    select msg.body, msg.message_type, msg.attachment, msg.created_at
    from public.chat_messages msg
    where msg.channel_id = c.id
      and msg.hidden_at is null
    order by msg.created_at desc
    limit 1
  ) last on true
  left join lateral (
    select count(*)::integer as n
    from public.chat_messages msg
    where msg.channel_id = c.id
      and msg.hidden_at is null
      and msg.sender_id <> uid
      and msg.created_at > m.last_read_at
  ) unread on true
  where m.profile_id = uid
  order by last.created_at desc nulls last, c.id desc;
end;
$$;
