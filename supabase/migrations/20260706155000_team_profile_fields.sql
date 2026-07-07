-- STORY-3.1 — Team profile fields and logo storage (AC-3, AC-4).

alter table public.teams
  add column description text,
  add column logo_url text,
  add column season_start date,
  add column season_end date;

alter table public.teams
  add constraint teams_season_range_valid check (
    season_start is null or season_end is null or season_start <= season_end
  );

------------------------------------------------------------------------------
-- Storage — team-logos bucket (team creator can write)
------------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('team-logos', 'team-logos', true)
on conflict (id) do nothing;

create policy "team_logos_public_read"
  on storage.objects for select
  using (bucket_id = 'team-logos');

create policy "team_logos_coach_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'team-logos'
    and exists (
      select 1
      from public.teams t
      where t.id::text = (storage.foldername(name))[1]
        and t.created_by = auth.uid()
    )
  );

create policy "team_logos_coach_update"
  on storage.objects for update
  using (
    bucket_id = 'team-logos'
    and exists (
      select 1
      from public.teams t
      where t.id::text = (storage.foldername(name))[1]
        and t.created_by = auth.uid()
    )
  );

create policy "team_logos_coach_delete"
  on storage.objects for delete
  using (
    bucket_id = 'team-logos'
    and exists (
      select 1
      from public.teams t
      where t.id::text = (storage.foldername(name))[1]
        and t.created_by = auth.uid()
    )
  );
