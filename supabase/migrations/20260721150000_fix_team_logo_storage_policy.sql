-- Fix team logo storage RLS: the original policy referenced teams.name inside an
-- EXISTS subquery, so Postgres resolved bare `name` to teams.name instead of the
-- storage object path. That made foldername() return NULL and blocked all uploads.

create or replace function public.can_manage_team_logo(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (storage.foldername(p_object_name))[1] is not null
    and public.is_team_coach(
      (storage.foldername(p_object_name))[1]::uuid,
      auth.uid()
    );
$$;

drop policy if exists "team_logos_coach_insert" on storage.objects;
drop policy if exists "team_logos_coach_update" on storage.objects;
drop policy if exists "team_logos_coach_delete" on storage.objects;

create policy "team_logos_coach_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'team-logos'
    and public.can_manage_team_logo(name)
  );

create policy "team_logos_coach_update"
  on storage.objects for update
  using (
    bucket_id = 'team-logos'
    and public.can_manage_team_logo(name)
  )
  with check (
    bucket_id = 'team-logos'
    and public.can_manage_team_logo(name)
  );

create policy "team_logos_coach_delete"
  on storage.objects for delete
  using (
    bucket_id = 'team-logos'
    and public.can_manage_team_logo(name)
  );
