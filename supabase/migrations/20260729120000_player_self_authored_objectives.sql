-- STORY-11.1 — player self-authored objectives (QA3-02 "add my own").
--
-- Adds a second, permissive INSERT policy on public.objectives letting a
-- player create their own player-scoped objective (coach_id = player's own
-- id, scope = 'player', player_id = player's own id). Postgres RLS policies
-- for the same command are OR'd together, so the existing
-- objectives_coach_insert policy (20260723220000_objectives.sql) is left
-- untouched.
--
-- No SELECT policy change needed: objectives_coach_select's existing
-- "scope = 'player' and player_id = auth.uid()" branch already covers a
-- player viewing their own objectives regardless of who authored them.
-- UPDATE/DELETE also need no change: those policies already allow
-- "coach_id = auth.uid()", which is satisfied for a self-authored row.
--
-- Not covered here (flagged as a new open question in the fix plan, not
-- decided): a coach cannot see a player's self-authored objectives today,
-- since objectives_coach_select's coach branch is keyed to
-- "coach_id = auth.uid()", not to the coach's roster/team. Self-authored
-- objectives are private to the player who created them in this pass.

drop policy if exists objectives_player_self_insert on public.objectives;
create policy objectives_player_self_insert
  on public.objectives for insert
  with check (
    coach_id = auth.uid()
    and scope = 'player'
    and player_id = auth.uid()
    and public.has_feature_access(auth.uid(), 'objectives')
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'player'
    )
  );
