-- STORY-11.1 — Objectives (player + team goals; drill-completion KPI)

create table if not exists public.objectives (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  scope text not null check (scope in ('player', 'team')),
  player_id uuid references public.profiles (id) on delete cascade,
  team_id uuid references public.teams (id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  category text check (category is null or category in ('shooting', 'defense', 'strategy', 'other')),
  target_completions integer not null default 10 check (target_completions > 0),
  current_completions integer not null default 0 check (current_completions >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint objectives_assignee_check check (
    (scope = 'player' and player_id is not null and team_id is null)
    or (scope = 'team' and team_id is not null and player_id is null)
  )
);

create index if not exists objectives_coach_idx on public.objectives (coach_id, created_at desc);
create index if not exists objectives_player_idx on public.objectives (player_id) where player_id is not null;
create index if not exists objectives_team_idx on public.objectives (team_id) where team_id is not null;

comment on table public.objectives is
  'Coach-set player/team objectives (STORY-11.1 / OQ-6.1). KPI = drill completion count toward target.';

alter table public.objectives enable row level security;

-- Coach (Pro) can manage own objectives
drop policy if exists objectives_coach_select on public.objectives;
create policy objectives_coach_select
  on public.objectives for select
  using (
    coach_id = auth.uid()
    or public.is_admin(auth.uid())
    or (
      scope = 'player'
      and player_id = auth.uid()
      and public.has_feature_access(auth.uid(), 'objectives')
    )
    or (
      scope = 'team'
      and team_id is not null
      and public.is_team_member(team_id, auth.uid())
      and public.has_feature_access(auth.uid(), 'objectives')
    )
  );

drop policy if exists objectives_coach_insert on public.objectives;
create policy objectives_coach_insert
  on public.objectives for insert
  with check (
    coach_id = auth.uid()
    and public.has_feature_access(auth.uid(), 'objectives')
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'coach'
    )
  );

drop policy if exists objectives_coach_update on public.objectives;
create policy objectives_coach_update
  on public.objectives for update
  using (coach_id = auth.uid() or public.is_admin(auth.uid()))
  with check (coach_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists objectives_coach_delete on public.objectives;
create policy objectives_coach_delete
  on public.objectives for delete
  using (coach_id = auth.uid() or public.is_admin(auth.uid()));

grant select, insert, update, delete on public.objectives to authenticated;
grant all on public.objectives to service_role;

-- On first drill completion insert, bump matching open objectives
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
    and o.current_completions < o.target_completions;

  return new;
end;
$$;

drop trigger if exists session_content_completions_bump_objectives on public.session_content_completions;
create trigger session_content_completions_bump_objectives
  after insert on public.session_content_completions
  for each row
  execute function public.bump_objectives_on_drill_completion();

revoke all on function public.bump_objectives_on_drill_completion() from public;
grant execute on function public.bump_objectives_on_drill_completion() to authenticated, service_role;
