-- STORY-3.2 — Team invites and roster join flow

create type public.invite_status as enum (
  'active',
  'revoked',
  'consumed'
);

create table public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  code text not null unique,
  created_by uuid not null references public.profiles (id) on delete restrict,
  invited_email text,
  status public.invite_status not null default 'active',
  expires_at timestamptz not null,
  consumed_by uuid references public.profiles (id) on delete set null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index team_invites_team_id_idx on public.team_invites (team_id);
create index team_invites_code_idx on public.team_invites (code);
create index team_invites_status_idx on public.team_invites (status);

alter table public.team_invites enable row level security;

create policy "team_invites_coach_select"
  on public.team_invites for select
  using (
    public.is_team_coach(team_id, auth.uid())
    or public.is_admin(auth.uid())
  );

create policy "team_invites_authenticated_read_active"
  on public.team_invites for select
  using (
    auth.uid() is not null
    and status = 'active'
    and expires_at > now()
  );

create policy "team_invites_coach_insert"
  on public.team_invites for insert
  with check (
    public.is_team_coach(team_id, auth.uid())
    and created_by = auth.uid()
  );

create policy "team_invites_coach_update"
  on public.team_invites for update
  using (
    public.is_team_coach(team_id, auth.uid())
    or public.is_admin(auth.uid())
  )
  with check (
    public.is_team_coach(team_id, auth.uid())
    or public.is_admin(auth.uid())
  );

-- Table created after 20260706150000_authenticated_table_grants.sql; grant explicitly.
grant select, insert, update, delete on public.team_invites to authenticated;
grant select on public.team_invites to anon;

------------------------------------------------------------------------------
-- Helpers for manual add and invite acceptance (SECURITY DEFINER)
------------------------------------------------------------------------------

create or replace function public.lookup_profile_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(u.email) = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.lookup_profile_id_by_email(text) from public;
grant execute on function public.lookup_profile_id_by_email(text) to authenticated;

create or replace function public.add_player_to_roster_by_email(
  p_team_id uuid,
  p_email text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_profile_id uuid;
begin
  if v_caller is null then
    raise exception 'not_authenticated';
  end if;

  if not public.is_team_coach(p_team_id, v_caller) then
    raise exception 'not_authorized';
  end if;

  v_profile_id := public.lookup_profile_id_by_email(p_email);

  if v_profile_id is null then
    raise exception 'player_not_found';
  end if;

  insert into public.rosters (team_id, profile_id, roster_role, status)
  values (p_team_id, v_profile_id, 'player', 'active')
  on conflict (team_id, profile_id) do update
    set status = 'active',
        roster_role = 'player';

  return v_profile_id;
end;
$$;

revoke all on function public.add_player_to_roster_by_email(uuid, text) from public;
grant execute on function public.add_player_to_roster_by_email(uuid, text) to authenticated;

create or replace function public.accept_team_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.team_invites%rowtype;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select *
  into v_invite
  from public.team_invites
  where code = upper(trim(p_code))
  for update;

  if not found then
    raise exception 'invite_not_found';
  end if;

  if v_invite.status = 'revoked' then
    raise exception 'invite_revoked';
  end if;

  if v_invite.status = 'consumed' then
    raise exception 'invite_not_found';
  end if;

  if v_invite.expires_at < now() then
    raise exception 'invite_expired';
  end if;

  insert into public.rosters (team_id, profile_id, roster_role, status)
  values (v_invite.team_id, v_user_id, 'player', 'active')
  on conflict (team_id, profile_id) do update
    set status = 'active',
        roster_role = 'player';

  update public.team_invites
  set status = 'consumed',
      consumed_by = v_user_id,
      consumed_at = now()
  where id = v_invite.id;

  return v_invite.team_id;
end;
$$;

revoke all on function public.accept_team_invite(text) from public;
grant execute on function public.accept_team_invite(text) to authenticated;
