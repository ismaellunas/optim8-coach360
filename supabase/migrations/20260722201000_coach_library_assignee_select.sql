-- STORY-9.4 follow-up: assignees can read library items shared via Path A.

create or replace function public.can_read_assigned_library_item(p_item_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.content_assignments a
    where a.library_item_id = p_item_id
      and (
        a.player_id = p_user_id
        or (a.team_id is not null and public.is_team_member(a.team_id, p_user_id))
      )
  )
  or exists (
    select 1
    from public.content_assignments a
    join public.coach_library_items pkg on pkg.id = a.library_item_id
    where pkg.kind = 'package'
      and p_item_id = any (coalesce(pkg.item_ids, '{}'::uuid[]))
      and (
        a.player_id = p_user_id
        or (a.team_id is not null and public.is_team_member(a.team_id, p_user_id))
      )
  );
$$;

comment on function public.can_read_assigned_library_item(uuid, uuid) is
  'True when the user is a Path A assignee of the item or of a package that contains it.';

drop policy if exists coach_library_items_assignee_select on public.coach_library_items;
create policy coach_library_items_assignee_select
  on public.coach_library_items for select
  to authenticated
  using (public.can_read_assigned_library_item(id, auth.uid()));
