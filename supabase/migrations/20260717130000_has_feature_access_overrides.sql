-- STORY-5.4 — has_feature_access consults admin feature_flags overrides.
--
-- Same merge rule as domain applyFeatureFlagOverrides: for each
-- (feature, role) pair, use feature_flags.required_tier when present,
-- otherwise the code-default CASE from 20260717120000_rbac_launch_matrix.sql.
-- Profiles use app_role 'team_manager'; feature_flags stores role 'team'.

create or replace function public.has_feature_access(p_user_id uuid, p_feature text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role public.app_role;
  v_flag_role text;
  v_minimum public.subscription_tier;
  v_override text;
begin
  select role into v_role from public.profiles where id = p_user_id;

  if v_role is null then
    return false;
  end if;

  -- Admin bypasses tier restrictions for management actions.
  if v_role = 'admin' then
    return true;
  end if;

  -- feature_flags uses mobile paywall role keys ('team' not 'team_manager').
  v_flag_role := case
    when v_role = 'team_manager' then 'team'
    else v_role::text
  end;

  select ff.required_tier
    into v_override
  from public.feature_flags ff
  where ff.feature_key = p_feature
    and ff.role = v_flag_role;

  if v_override is not null then
    v_minimum := v_override::public.subscription_tier;
  else
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
  end if;

  if v_minimum is null then
    return false;
  end if;

  return public.meets_tier(p_user_id, v_minimum);
end;
$$;
