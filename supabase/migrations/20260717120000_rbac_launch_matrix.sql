-- STORY-5.2 — Launch-critical access matrix rules (DEP-06 subset).
--
-- Replaces has_feature_access CASE to mirror FEATURE_TIER_REQUIREMENTS in
-- packages/domain/src/subscription/paywall.ts after STORY-5.2 expansions
-- (chat/ai for team manager, browseMarketplace, viewTrainingMaterials,
-- watchSharedVideo, teamRoster; viewProgress coach floor lowered to basic
-- for ◎ read-only). Access level ◎ vs ✓ is enforced in domain/UI only;
-- SQL remains binary allow-at-minimum (see STORY-5.2 plan).

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
    when p_feature = 'chat' and v_role = 'team_manager' then 'advanced'
    when p_feature = 'createSession' and v_role = 'coach' then 'advanced'
    when p_feature = 'distribute' and v_role = 'coach' then 'advanced'
    when p_feature = 'objectives' and v_role = 'coach' then 'pro'
    when p_feature = 'objectives' and v_role = 'player' then 'pro'
    when p_feature = 'ai' and v_role = 'coach' then 'pro'
    when p_feature = 'ai' and v_role = 'player' then 'pro'
    when p_feature = 'ai' and v_role = 'team_manager' then 'pro'
    when p_feature = 'createContent' and v_role = 'coach' then 'advanced'
    when p_feature = 'teamManage' and v_role = 'coach' then 'basic'
    when p_feature = 'teamManage' and v_role = 'team_manager' then 'basic'
    when p_feature = 'invitePlayers' and v_role = 'coach' then 'advanced'
    when p_feature = 'invitePlayers' and v_role = 'team_manager' then 'basic'
    when p_feature = 'removePlayers' and v_role = 'coach' then 'advanced'
    when p_feature = 'removePlayers' and v_role = 'team_manager' then 'basic'
    when p_feature = 'assignCoach' and v_role = 'coach' then 'pro'
    when p_feature = 'assignCoach' and v_role = 'team_manager' then 'advanced'
    when p_feature = 'viewProgress' and v_role = 'coach' then 'basic'
    when p_feature = 'viewProgress' and v_role = 'player' then 'basic'
    when p_feature = 'purchase' and v_role = 'coach' then 'basic'
    when p_feature = 'purchase' and v_role = 'player' then 'basic'
    when p_feature = 'purchase' and v_role = 'team_manager' then 'basic'
    when p_feature = 'peerShare' and v_role = 'coach' then 'advanced'
    when p_feature = 'peerShare' and v_role = 'player' then 'advanced'
    when p_feature = 'feedback' and v_role = 'coach' then 'advanced'
    when p_feature = 'feedback' and v_role = 'player' then 'advanced'
    when p_feature = 'browseMarketplace' and v_role = 'coach' then 'basic'
    when p_feature = 'browseMarketplace' and v_role = 'player' then 'basic'
    when p_feature = 'browseMarketplace' and v_role = 'team_manager' then 'basic'
    when p_feature = 'viewTrainingMaterials' and v_role = 'player' then 'basic'
    when p_feature = 'watchSharedVideo' and v_role = 'player' then 'basic'
    when p_feature = 'teamRoster' and v_role = 'coach' then 'basic'
    else null
  end;

  if v_minimum is null then
    return false;
  end if;

  return public.meets_tier(p_user_id, v_minimum);
end;
$$;
