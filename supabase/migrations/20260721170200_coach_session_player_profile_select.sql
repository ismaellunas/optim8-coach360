-- STORY-7.3 — coaches read display names for individual session recipients

drop policy if exists profiles_coach_session_player_select on public.profiles;
create policy profiles_coach_session_player_select
  on public.profiles for select
  using (
    exists (
      select 1
      from public.sessions s
      where s.coach_id = auth.uid()
        and s.player_id = profiles.id
    )
  );
