-- STORY-5.1 — RBAC tier helpers and RLS alignment with application rules.
--
-- Completes the tier-gating layer deferred by 20260627100001_rls_policies.sql.
-- The feature → minimum-tier rules below mirror FEATURE_TIER_REQUIREMENTS in
-- packages/domain/src/subscription/paywall.ts (one `when` line per rule so
-- tests/rbac/story-5.1.test.js can pin SQL and app rules against each other).

------------------------------------------------------------------------------
-- Tier helpers
------------------------------------------------------------------------------

-- Mirrors effectiveTierForAccess (packages/domain/src/subscription/rules.ts):
-- active trial → pro, expired/stale trial → basic, no subscription → basic.
create or replace function public.effective_tier(p_user_id uuid)
returns public.subscription_tier
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select case
        when s.tier = 'trial'
          and s.status = 'trialing'
          and (s.trial_ends_at is null or s.trial_ends_at > now())
          then 'pro'::public.subscription_tier
        when s.tier = 'trial'
          then 'basic'::public.subscription_tier
        else s.tier
      end
      from public.subscriptions s
      where s.profile_id = p_user_id
    ),
    'basic'::public.subscription_tier
  );
$$;

create or replace function public.tier_rank(p_tier public.subscription_tier)
returns int
language sql
immutable
as $$
  select case p_tier
    when 'trial' then 0
    when 'basic' then 1
    when 'advanced' then 2
    when 'pro' then 3
  end;
$$;

create or replace function public.meets_tier(
  p_user_id uuid,
  p_minimum public.subscription_tier
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.tier_rank(public.effective_tier(p_user_id)) >= public.tier_rank(p_minimum);
$$;

------------------------------------------------------------------------------
-- Feature access — role × tier per FEATURE_TIER_REQUIREMENTS
------------------------------------------------------------------------------

create or replace function public.has_feature_access(p_user_id uuid, p_feature text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role public.app_role;
  v_minimum public.subscription_tier;
begin
  select role into v_role from public.profiles where id = p_user_id;

  if v_role is null then
    return false;
  end if;

  -- Admin bypasses tier restrictions for management actions.
  if v_role = 'admin' then
    return true;
  end if;

  v_minimum := case
    when p_feature = 'chat' and v_role = 'coach' then 'advanced'
    when p_feature = 'chat' and v_role = 'player' then 'advanced'
    when p_feature = 'createSession' and v_role = 'coach' then 'advanced'
    when p_feature = 'distribute' and v_role = 'coach' then 'advanced'
    when p_feature = 'objectives' and v_role = 'coach' then 'pro'
    when p_feature = 'objectives' and v_role = 'player' then 'pro'
    when p_feature = 'ai' and v_role = 'coach' then 'pro'
    when p_feature = 'ai' and v_role = 'player' then 'pro'
    when p_feature = 'createContent' and v_role = 'coach' then 'advanced'
    when p_feature = 'teamManage' and v_role = 'coach' then 'basic'
    when p_feature = 'teamManage' and v_role = 'team_manager' then 'basic'
    when p_feature = 'invitePlayers' and v_role = 'coach' then 'advanced'
    when p_feature = 'invitePlayers' and v_role = 'team_manager' then 'basic'
    when p_feature = 'removePlayers' and v_role = 'coach' then 'advanced'
    when p_feature = 'removePlayers' and v_role = 'team_manager' then 'basic'
    when p_feature = 'assignCoach' and v_role = 'coach' then 'pro'
    when p_feature = 'assignCoach' and v_role = 'team_manager' then 'advanced'
    when p_feature = 'viewProgress' and v_role = 'coach' then 'advanced'
    when p_feature = 'viewProgress' and v_role = 'player' then 'basic'
    when p_feature = 'purchase' and v_role = 'coach' then 'basic'
    when p_feature = 'purchase' and v_role = 'player' then 'basic'
    when p_feature = 'peerShare' and v_role = 'coach' then 'advanced'
    when p_feature = 'peerShare' and v_role = 'player' then 'advanced'
    when p_feature = 'feedback' and v_role = 'coach' then 'advanced'
    when p_feature = 'feedback' and v_role = 'player' then 'advanced'
    else null
  end;

  if v_minimum is null then
    return false;
  end if;

  return public.meets_tier(p_user_id, v_minimum);
end;
$$;

revoke all on function public.effective_tier(uuid) from public;
revoke all on function public.meets_tier(uuid, public.subscription_tier) from public;
revoke all on function public.has_feature_access(uuid, text) from public;
grant execute on function public.effective_tier(uuid) to authenticated, service_role;
grant execute on function public.tier_rank(public.subscription_tier) to authenticated, service_role;
grant execute on function public.meets_tier(uuid, public.subscription_tier) to authenticated, service_role;
grant execute on function public.has_feature_access(uuid, text) to authenticated, service_role;

------------------------------------------------------------------------------
-- Align representative RLS policies with the application rules.
-- (Launch-critical matrix expansion continues in STORY-5.2.)
------------------------------------------------------------------------------

-- Session creation is the 'createSession' feature (coach Advanced+).
drop policy "sessions_coach_insert" on public.sessions;
create policy "sessions_coach_insert"
  on public.sessions for insert
  with check (
    coach_id = auth.uid()
    and (team_id is null or public.is_team_coach(team_id, auth.uid()))
    and public.has_feature_access(auth.uid(), 'createSession')
  );

-- Invite creation is the 'invitePlayers' feature
-- (coach Advanced+, team manager Basic+).
drop policy "team_invites_coach_insert" on public.team_invites;
create policy "team_invites_coach_insert"
  on public.team_invites for insert
  with check (
    public.is_team_coach(team_id, auth.uid())
    and created_by = auth.uid()
    and public.has_feature_access(auth.uid(), 'invitePlayers')
  );
