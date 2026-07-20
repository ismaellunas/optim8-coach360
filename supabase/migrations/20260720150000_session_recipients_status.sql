-- STORY-6.1 — individual recipient linkage and read policy for sessions.
--
-- MVP decision: a session is calendar-only, single-occurrence, and links to
-- either one team or one individual player.

alter table public.sessions
  add column if not exists player_id uuid references public.profiles (id) on delete restrict;

create index if not exists sessions_player_id_idx on public.sessions (player_id);

alter table public.sessions
  drop constraint if exists sessions_single_recipient_check;

alter table public.sessions
  add constraint sessions_single_recipient_check
  check (
    ((team_id is not null and player_id is null) or (team_id is null and player_id is not null))
    and (
      (session_type = 'individual' and player_id is not null and team_id is null)
      or (session_type <> 'individual' and team_id is not null and player_id is null)
    )
  );

drop policy if exists "sessions_visible_select" on public.sessions;
create policy "sessions_visible_select"
  on public.sessions for select
  using (
    coach_id = auth.uid()
    or player_id = auth.uid()
    or (team_id is not null and public.is_team_member(team_id, auth.uid()))
    or public.is_admin(auth.uid())
  );
