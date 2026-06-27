-- STORY-1.1 — RLS policies for coach/player/team isolation (AC-3).
--
-- Scope: tenant isolation only. Tier-based feature gating (basic/advanced/pro)
-- is implemented at the application layer in STORY-5.1, with additional RLS
-- policies layered on top in a later migration.

------------------------------------------------------------------------------
-- Helpers — SECURITY DEFINER so they bypass RLS while answering membership
-- questions without triggering recursive policy checks.
------------------------------------------------------------------------------

create or replace function public.is_team_member(p_team_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.rosters
    where team_id = p_team_id
      and profile_id = p_user_id
      and status = 'active'
  );
$$;

create or replace function public.is_team_coach(p_team_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teams t
    where t.id = p_team_id
      and t.created_by = p_user_id
  ) or exists (
    select 1
    from public.rosters r
    where r.team_id = p_team_id
      and r.profile_id = p_user_id
      and r.roster_role in ('assistant_coach', 'manager')
      and r.status = 'active'
  );
$$;

create or replace function public.is_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = p_user_id
      and role = 'admin'
  );
$$;

------------------------------------------------------------------------------
-- Enable RLS
------------------------------------------------------------------------------

alter table public.profiles      enable row level security;
alter table public.teams         enable row level security;
alter table public.rosters       enable row level security;
alter table public.subscriptions enable row level security;
alter table public.sessions      enable row level security;
alter table public.purchases     enable row level security;
alter table public.drip_progress enable row level security;

------------------------------------------------------------------------------
-- profiles
------------------------------------------------------------------------------

create policy "profiles_self_select"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_teammate_select"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.rosters mine
      join public.rosters theirs on theirs.team_id = mine.team_id
      where mine.profile_id = auth.uid()
        and theirs.profile_id = profiles.id
        and mine.status = 'active'
        and theirs.status = 'active'
    )
    or exists (
      select 1
      from public.teams t
      join public.rosters r on r.team_id = t.id
      where t.created_by = auth.uid()
        and r.profile_id = profiles.id
        and r.status = 'active'
    )
  );

create policy "profiles_admin_select"
  on public.profiles for select
  using (public.is_admin(auth.uid()));

create policy "profiles_self_update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_admin_update"
  on public.profiles for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

------------------------------------------------------------------------------
-- teams
------------------------------------------------------------------------------

create policy "teams_member_select"
  on public.teams for select
  using (
    created_by = auth.uid()
    or public.is_team_member(id, auth.uid())
    or public.is_admin(auth.uid())
  );

create policy "teams_coach_insert"
  on public.teams for insert
  with check (created_by = auth.uid());

create policy "teams_coach_update"
  on public.teams for update
  using (created_by = auth.uid() or public.is_admin(auth.uid()))
  with check (created_by = auth.uid() or public.is_admin(auth.uid()));

create policy "teams_coach_delete"
  on public.teams for delete
  using (created_by = auth.uid() or public.is_admin(auth.uid()));

------------------------------------------------------------------------------
-- rosters
------------------------------------------------------------------------------

create policy "rosters_member_select"
  on public.rosters for select
  using (
    profile_id = auth.uid()
    or public.is_team_coach(team_id, auth.uid())
    or public.is_team_member(team_id, auth.uid())
    or public.is_admin(auth.uid())
  );

create policy "rosters_coach_write"
  on public.rosters for insert
  with check (
    public.is_team_coach(team_id, auth.uid())
    or public.is_admin(auth.uid())
  );

create policy "rosters_coach_update"
  on public.rosters for update
  using (
    public.is_team_coach(team_id, auth.uid())
    or public.is_admin(auth.uid())
  )
  with check (
    public.is_team_coach(team_id, auth.uid())
    or public.is_admin(auth.uid())
  );

create policy "rosters_coach_delete"
  on public.rosters for delete
  using (
    public.is_team_coach(team_id, auth.uid())
    or public.is_admin(auth.uid())
  );

------------------------------------------------------------------------------
-- subscriptions  (owner-only reads; writes happen via service role in webhooks)
------------------------------------------------------------------------------

create policy "subscriptions_owner_select"
  on public.subscriptions for select
  using (profile_id = auth.uid() or public.is_admin(auth.uid()));

------------------------------------------------------------------------------
-- sessions  (coach who created + team members can read; only coach can write)
------------------------------------------------------------------------------

create policy "sessions_visible_select"
  on public.sessions for select
  using (
    coach_id = auth.uid()
    or (team_id is not null and public.is_team_member(team_id, auth.uid()))
    or public.is_admin(auth.uid())
  );

create policy "sessions_coach_insert"
  on public.sessions for insert
  with check (
    coach_id = auth.uid()
    and (team_id is null or public.is_team_coach(team_id, auth.uid()))
  );

create policy "sessions_coach_update"
  on public.sessions for update
  using (coach_id = auth.uid() or public.is_admin(auth.uid()))
  with check (coach_id = auth.uid() or public.is_admin(auth.uid()));

create policy "sessions_coach_delete"
  on public.sessions for delete
  using (coach_id = auth.uid() or public.is_admin(auth.uid()));

------------------------------------------------------------------------------
-- purchases & drip_progress  (owner-only)
------------------------------------------------------------------------------

create policy "purchases_owner_select"
  on public.purchases for select
  using (buyer_id = auth.uid() or public.is_admin(auth.uid()));

create policy "drip_progress_owner_select"
  on public.drip_progress for select
  using (profile_id = auth.uid() or public.is_admin(auth.uid()));

create policy "drip_progress_owner_update"
  on public.drip_progress for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

------------------------------------------------------------------------------
-- Storage — avatars bucket with owner-only write access
------------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
