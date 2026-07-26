-- STORY-12.2 — Admin subscription / trial administration
-- Trial duration + tier catalog display overrides, revenue summary, user tier override.

------------------------------------------------------------------------------
-- platform_settings seeds
------------------------------------------------------------------------------

insert into public.platform_settings (key, value)
values ('trial_duration_days', '14'::jsonb)
on conflict (key) do nothing;

insert into public.platform_settings (key, value)
values ('tier_catalog_overrides', '[]'::jsonb)
on conflict (key) do nothing;

------------------------------------------------------------------------------
-- get / set trial duration days (admin-configurable)
------------------------------------------------------------------------------

create or replace function public.get_trial_duration_days()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  raw jsonb;
  days int;
begin
  select value into raw
  from public.platform_settings
  where key = 'trial_duration_days';

  if raw is null then
    return 14;
  end if;

  begin
    days := (raw #>> '{}')::int;
  exception when others then
    return 14;
  end;

  if days is null or days < 1 then
    return 14;
  end if;

  return days;
end;
$$;

create or replace function public.set_trial_duration_days(p_days int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role public.app_role;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is distinct from 'admin' then
    raise exception 'admin_required';
  end if;

  if p_days is null or p_days < 1 then
    raise exception 'invalid_trial_duration';
  end if;

  insert into public.platform_settings (key, value, updated_at)
  values ('trial_duration_days', to_jsonb(p_days), now())
  on conflict (key) do update set
    value = excluded.value,
    updated_at = now();

  return p_days;
end;
$$;

------------------------------------------------------------------------------
-- get / set tier catalog display overrides
------------------------------------------------------------------------------

create or replace function public.get_tier_catalog_overrides()
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
  where key = 'tier_catalog_overrides';

  if raw is null or jsonb_typeof(raw) is distinct from 'array' then
    return '[]'::jsonb;
  end if;

  return raw;
end;
$$;

create or replace function public.set_tier_catalog_overrides(p_overrides jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role public.app_role;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is distinct from 'admin' then
    raise exception 'admin_required';
  end if;

  if p_overrides is null or jsonb_typeof(p_overrides) is distinct from 'array' then
    raise exception 'invalid_tier_catalog_overrides';
  end if;

  insert into public.platform_settings (key, value, updated_at)
  values ('tier_catalog_overrides', p_overrides, now())
  on conflict (key) do update set
    value = excluded.value,
    updated_at = now();

  return p_overrides;
end;
$$;

------------------------------------------------------------------------------
-- activate_user_trial — use admin-configured duration
------------------------------------------------------------------------------

create or replace function public.activate_user_trial()
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  existing public.subscriptions;
  result public.subscriptions;
  duration_days int := public.get_trial_duration_days();
  ends_at timestamptz := now() + make_interval(days => duration_days);
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into existing from public.subscriptions where profile_id = uid;

  if existing.id is not null then
    if existing.trial_used_at is not null then
      raise exception 'trial_already_used';
    end if;

    update public.subscriptions
    set
      tier = 'trial',
      status = 'trialing',
      trial_ends_at = ends_at,
      trial_used_at = now(),
      updated_at = now()
    where profile_id = uid
    returning * into result;

    return result;
  end if;

  insert into public.subscriptions (
    profile_id,
    tier,
    status,
    trial_ends_at,
    trial_used_at
  )
  values (uid, 'trial', 'trialing', ends_at, now())
  returning * into result;

  return result;
end;
$$;

------------------------------------------------------------------------------
-- override_user_subscription_tier — admin manual grant (DEP-05)
------------------------------------------------------------------------------

create or replace function public.override_user_subscription_tier(
  p_profile_id uuid,
  p_tier public.subscription_tier
)
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role public.app_role;
  result public.subscriptions;
  next_status public.subscription_status;
  duration_days int := public.get_trial_duration_days();
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is distinct from 'admin' then
    raise exception 'admin_required';
  end if;

  if p_profile_id is null then
    raise exception 'profile_required';
  end if;

  if not exists (select 1 from public.profiles where id = p_profile_id) then
    raise exception 'profile_not_found';
  end if;

  if p_tier = 'trial' then
    next_status := 'trialing';
  else
    next_status := 'active';
  end if;

  insert into public.subscriptions (
    profile_id,
    tier,
    status,
    trial_ends_at,
    trial_used_at,
    pending_tier,
    pending_tier_effective_at,
    updated_at
  )
  values (
    p_profile_id,
    p_tier,
    next_status,
    case when p_tier = 'trial' then now() + make_interval(days => duration_days) else null end,
    case when p_tier = 'trial' then now() else null end,
    null,
    null,
    now()
  )
  on conflict (profile_id) do update set
    tier = excluded.tier,
    status = excluded.status,
    trial_ends_at = case
      when excluded.tier = 'trial' then excluded.trial_ends_at
      else public.subscriptions.trial_ends_at
    end,
    trial_used_at = case
      when excluded.tier = 'trial' then coalesce(public.subscriptions.trial_used_at, excluded.trial_used_at)
      else public.subscriptions.trial_used_at
    end,
    pending_tier = null,
    pending_tier_effective_at = null,
    updated_at = now()
  returning * into result;

  return result;
end;
$$;

------------------------------------------------------------------------------
-- get_billing_revenue_summary — admin Subscriptions pillar
------------------------------------------------------------------------------

create or replace function public.get_billing_revenue_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role public.app_role;
  paid_cents bigint;
  paid_count int;
  paid_currency text;
  by_tier jsonb;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is distinct from 'admin' then
    raise exception 'admin_required';
  end if;

  select
    coalesce(sum(amount_cents), 0),
    count(*)::int,
    coalesce(min(currency), 'usd')
  into paid_cents, paid_count, paid_currency
  from public.billing_invoices
  where status = 'paid';

  select coalesce(
    jsonb_agg(
      jsonb_build_object('tier', tier, 'count', cnt)
      order by tier
    ),
    '[]'::jsonb
  )
  into by_tier
  from (
    select tier::text as tier, count(*)::int as cnt
    from public.subscriptions
    where status = 'active'
      and tier in ('basic', 'advanced', 'pro')
    group by tier
  ) counts;

  return jsonb_build_object(
    'paid_revenue_cents', paid_cents,
    'paid_invoice_count', paid_count,
    'currency', paid_currency,
    'active_paid_by_tier', by_tier
  );
end;
$$;

grant execute on function public.get_trial_duration_days() to authenticated;
grant execute on function public.get_trial_duration_days() to service_role;
grant execute on function public.set_trial_duration_days(int) to authenticated;
grant execute on function public.get_tier_catalog_overrides() to authenticated;
grant execute on function public.get_tier_catalog_overrides() to service_role;
grant execute on function public.set_tier_catalog_overrides(jsonb) to authenticated;
grant execute on function public.override_user_subscription_tier(uuid, public.subscription_tier) to authenticated;
grant execute on function public.get_billing_revenue_summary() to authenticated;
grant execute on function public.activate_user_trial() to authenticated;
