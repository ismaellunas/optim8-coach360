-- STORY-12.3 — Content & marketplace operations
-- rejection_reason on package_metadata; global drip interval days per tier;
-- init_drip_progress falls back to tier global rules when package omits interval.

------------------------------------------------------------------------------
-- package_metadata.rejection_reason
------------------------------------------------------------------------------

alter table public.package_metadata
  add column if not exists rejection_reason text;

comment on column public.package_metadata.rejection_reason is
  'STORY-12.3 — admin rejection reason when workflow_status = rejected';

------------------------------------------------------------------------------
-- platform_settings: drip_interval_days_by_tier
------------------------------------------------------------------------------

insert into public.platform_settings (key, value)
values (
  'drip_interval_days_by_tier',
  '{"basic":7,"advanced":7,"pro":7}'::jsonb
)
on conflict (key) do nothing;

------------------------------------------------------------------------------
-- get / set drip interval days by tier
------------------------------------------------------------------------------

create or replace function public.get_drip_interval_days_by_tier()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  raw jsonb;
begin
  select value into raw
  from public.platform_settings
  where key = 'drip_interval_days_by_tier';

  if raw is null or jsonb_typeof(raw) <> 'object' then
    return '{"basic":7,"advanced":7,"pro":7}'::jsonb;
  end if;

  return jsonb_build_object(
    'basic', greatest(1, coalesce((raw ->> 'basic')::int, 7)),
    'advanced', greatest(1, coalesce((raw ->> 'advanced')::int, 7)),
    'pro', greatest(1, coalesce((raw ->> 'pro')::int, 7))
  );
end;
$$;

create or replace function public.set_drip_interval_days_by_tier(p_rules jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role public.app_role;
  normalized jsonb;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is distinct from 'admin' then
    raise exception 'admin_required';
  end if;

  if p_rules is null or jsonb_typeof(p_rules) <> 'object' then
    raise exception 'invalid_drip_interval_rules';
  end if;

  normalized := jsonb_build_object(
    'basic', greatest(1, coalesce((p_rules ->> 'basic')::int, 7)),
    'advanced', greatest(1, coalesce((p_rules ->> 'advanced')::int, 7)),
    'pro', greatest(1, coalesce((p_rules ->> 'pro')::int, 7))
  );

  insert into public.platform_settings (key, value, updated_at)
  values ('drip_interval_days_by_tier', normalized, now())
  on conflict (key) do update set
    value = excluded.value,
    updated_at = now();

  return normalized;
end;
$$;

grant execute on function public.get_drip_interval_days_by_tier() to authenticated;
grant execute on function public.set_drip_interval_days_by_tier(jsonb) to authenticated;

------------------------------------------------------------------------------
-- init_drip_progress_for_purchase — prefer package interval, else tier global
------------------------------------------------------------------------------

create or replace function public.init_drip_progress_for_purchase(
  p_purchase_id uuid
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer_id uuid;
  v_sanity_id text;
  v_purchased_at timestamptz;
  v_scope text;
  v_team_id uuid;
  v_module_ids text[];
  v_interval_days int;
  v_package_interval int;
  v_buyer_tier text;
  v_global jsonb;
  v_module_id text;
  v_index int;
  v_sched_index int;
  v_scheduled timestamptz;
  v_inserted int := 0;
  v_rowcount int;
  v_profile_id uuid;
begin
  if p_purchase_id is null then
    raise exception 'drip_purchase_required';
  end if;

  select p.buyer_id, p.sanity_document_id, p.purchased_at, p.scope, p.team_id
    into v_buyer_id, v_sanity_id, v_purchased_at, v_scope, v_team_id
  from public.purchases p
  where p.id = p_purchase_id;

  if v_buyer_id is null then
    raise exception 'drip_purchase_not_found';
  end if;

  select coalesce(pm.module_ids, '{}'::text[]),
    case
      when (pm.drip_schedule ->> 'intervalDays') ~ '^[0-9]+$'
        then (pm.drip_schedule ->> 'intervalDays')::int
      else null
    end
  into v_module_ids, v_package_interval
  from public.package_metadata pm
  where pm.sanity_document_id = v_sanity_id;

  if v_module_ids is null then
    v_module_ids := '{}'::text[];
  end if;

  -- Package interval wins (OQ-14.1). Else admin global per buyer tier (STORY-12.3).
  if v_package_interval is not null and v_package_interval >= 1 then
    v_interval_days := v_package_interval;
  else
    select s.tier into v_buyer_tier
    from public.subscriptions s
    where s.profile_id = v_buyer_id
    order by s.updated_at desc nulls last
    limit 1;

    v_global := public.get_drip_interval_days_by_tier();

    if v_buyer_tier in ('basic', 'advanced', 'pro') then
      v_interval_days := greatest(1, coalesce((v_global ->> v_buyer_tier)::int, 7));
    else
      v_interval_days := 7;
    end if;
  end if;

  if v_interval_days is null or v_interval_days < 1 then
    v_interval_days := 7;
  end if;

  for v_profile_id in
    select v_buyer_id
    union
    select r.profile_id
    from public.rosters r
    where v_scope = 'team'
      and v_team_id is not null
      and r.team_id = v_team_id
      and r.status = 'active'
  loop
    v_sched_index := 0;

    for v_index in 1 .. coalesce(array_length(v_module_ids, 1), 0)
    loop
      v_module_id := v_module_ids[v_index];
      if v_module_id is null or length(trim(v_module_id)) = 0 then
        continue;
      end if;

      if v_sched_index = 0 then
        v_scheduled := v_purchased_at;
      else
        v_scheduled := v_purchased_at + make_interval(days => v_sched_index * v_interval_days);
      end if;

      insert into public.drip_progress (
        profile_id,
        purchase_id,
        module_id,
        unlocked_at,
        scheduled_unlock_at
      )
      values (
        v_profile_id,
        p_purchase_id,
        trim(v_module_id),
        case when v_sched_index = 0 then v_purchased_at else null end,
        v_scheduled
      )
      on conflict (purchase_id, profile_id, module_id) do nothing;

      get diagnostics v_rowcount = row_count;
      if v_rowcount > 0 then
        v_inserted := v_inserted + 1;
      end if;

      v_sched_index := v_sched_index + 1;
    end loop;
  end loop;

  return v_inserted;
end;
$$;

grant execute on function public.init_drip_progress_for_purchase(uuid) to service_role;
