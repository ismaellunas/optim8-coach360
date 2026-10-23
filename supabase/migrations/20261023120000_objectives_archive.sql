-- QA2-xx — let a user remove an objective they authored (coach-set or
-- player self-authored). Soft delete via archived_at so history/analytics
-- aren't destroyed; archived rows are excluded from listForUser.
--
-- No RLS change needed: objectives_coach_update (20260723220000_objectives.sql)
-- already allows "coach_id = auth.uid() or is_admin", which covers both
-- coach-authored and player-self-authored rows (coach_id = the author's id
-- in both cases per 20260729120000_player_self_authored_objectives.sql).

alter table public.objectives add column if not exists archived_at timestamptz;

create index if not exists objectives_active_idx
  on public.objectives (coach_id)
  where archived_at is null;

-- Stop bumping progress on an objective the user has archived.
create or replace function public.bump_objectives_on_drill_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.content_key is null or new.content_key not like 'drill:%' then
    return new;
  end if;

  -- Player-scoped objectives for this player
  update public.objectives
  set
    current_completions = least(current_completions + 1, target_completions),
    updated_at = now()
  where scope = 'player'
    and player_id = new.player_id
    and archived_at is null
    and current_completions < target_completions;

  -- Team-scoped objectives for teams where the player is an active member
  update public.objectives o
  set
    current_completions = least(o.current_completions + 1, o.target_completions),
    updated_at = now()
  from public.rosters r
  where o.scope = 'team'
    and o.team_id = r.team_id
    and r.profile_id = new.player_id
    and r.status = 'active'
    and o.archived_at is null
    and o.current_completions < o.target_completions;

  return new;
end;
$$;
