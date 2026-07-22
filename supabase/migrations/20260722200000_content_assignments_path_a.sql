-- STORY-9.4 — Path A private content distribution (roster-only, Q 12.6).

create table if not exists public.content_assignments (
  id uuid primary key default gen_random_uuid(),
  library_item_id uuid not null references public.coach_library_items (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  team_id uuid references public.teams (id) on delete cascade,
  player_id uuid references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint content_assignments_single_recipient_check check (
    (team_id is not null and player_id is null)
    or (team_id is null and player_id is not null)
  )
);

create index if not exists content_assignments_coach_id_idx
  on public.content_assignments (coach_id);

create index if not exists content_assignments_team_id_idx
  on public.content_assignments (team_id);

create index if not exists content_assignments_player_id_idx
  on public.content_assignments (player_id);

create index if not exists content_assignments_library_item_id_idx
  on public.content_assignments (library_item_id);

comment on table public.content_assignments is
  'Path A private distribution: coach library item assigned to full team roster or one roster player (Q 12.6 roster-only).';

alter table public.content_assignments enable row level security;

drop policy if exists content_assignments_coach_select on public.content_assignments;
create policy content_assignments_coach_select
  on public.content_assignments for select
  using (
    coach_id = auth.uid()
    or player_id = auth.uid()
    or (team_id is not null and public.is_team_member(team_id, auth.uid()))
    or public.is_admin(auth.uid())
  );

drop policy if exists content_assignments_coach_insert on public.content_assignments;
create policy content_assignments_coach_insert
  on public.content_assignments for insert
  with check (
    coach_id = auth.uid()
    and exists (
      select 1
      from public.coach_library_items i
      where i.id = library_item_id
        and i.owner_id = auth.uid()
    )
    and (
      (
        team_id is not null
        and player_id is null
        and public.is_team_coach(team_id, auth.uid())
      )
      or (
        player_id is not null
        and team_id is null
        and exists (
          select 1
          from public.rosters r
          where r.profile_id = player_id
            and r.status = 'active'
            and r.roster_role = 'player'
            and public.is_team_coach(r.team_id, auth.uid())
        )
      )
    )
  );

drop policy if exists content_assignments_coach_delete on public.content_assignments;
create policy content_assignments_coach_delete
  on public.content_assignments for delete
  using (coach_id = auth.uid() or public.is_admin(auth.uid()));

grant select, insert, delete on public.content_assignments to authenticated;
grant all on public.content_assignments to service_role;
