-- Allow active roster members to read their team creator's profile (coach display name in chat/DM).

drop policy if exists profiles_team_creator_select on public.profiles;
create policy profiles_team_creator_select
  on public.profiles for select
  using (
    exists (
      select 1
      from public.teams t
      join public.rosters r on r.team_id = t.id
      where t.created_by = profiles.id
        and r.profile_id = auth.uid()
        and r.status = 'active'
    )
  );

comment on policy profiles_team_creator_select on public.profiles is
  'Roster players can read team creator (coach) display_name for chat and related UI.';
