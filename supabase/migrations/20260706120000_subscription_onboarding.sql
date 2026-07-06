-- STORY-2.3 — Subscription onboarding RPCs and Stripe webhook idempotency ledger

------------------------------------------------------------------------------
-- billing_events  (idempotent Stripe webhook processing)
------------------------------------------------------------------------------

create table if not exists public.billing_events (
  id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.billing_events enable row level security;

------------------------------------------------------------------------------
-- activate_user_trial — one-time trial activation after profile completion
------------------------------------------------------------------------------

create or replace function public.activate_user_trial()
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  result public.subscriptions;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  if exists (select 1 from public.subscriptions where profile_id = uid) then
    raise exception 'subscription_already_set';
  end if;

  insert into public.subscriptions (profile_id, tier, status, trial_ends_at)
  values (uid, 'trial', 'trialing', now() + interval '14 days')
  returning * into result;

  return result;
end;
$$;

------------------------------------------------------------------------------
-- defer_user_to_basic — skip trial and start on Basic tier
------------------------------------------------------------------------------

create or replace function public.defer_user_to_basic()
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  result public.subscriptions;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  if exists (select 1 from public.subscriptions where profile_id = uid) then
    raise exception 'subscription_already_set';
  end if;

  insert into public.subscriptions (profile_id, tier, status)
  values (uid, 'basic', 'active')
  returning * into result;

  return result;
end;
$$;

------------------------------------------------------------------------------
-- sync_subscription_from_stripe — service-role upsert from webhook handler
------------------------------------------------------------------------------

create or replace function public.sync_subscription_from_stripe(
  p_profile_id uuid,
  p_tier public.subscription_tier,
  p_status public.subscription_status,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_current_period_end timestamptz,
  p_trial_ends_at timestamptz,
  p_event_id text,
  p_event_type text
)
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.subscriptions;
begin
  if p_event_id is not null then
    insert into public.billing_events (id, event_type)
    values (p_event_id, p_event_type)
    on conflict (id) do nothing;

    if not found then
      select * into result from public.subscriptions where profile_id = p_profile_id;
      return result;
    end if;
  end if;

  insert into public.subscriptions (
    profile_id,
    tier,
    status,
    stripe_customer_id,
    stripe_subscription_id,
    current_period_end,
    trial_ends_at
  )
  values (
    p_profile_id,
    p_tier,
    p_status,
    p_stripe_customer_id,
    p_stripe_subscription_id,
    p_current_period_end,
    p_trial_ends_at
  )
  on conflict (profile_id) do update set
    tier = excluded.tier,
    status = excluded.status,
    stripe_customer_id = coalesce(excluded.stripe_customer_id, public.subscriptions.stripe_customer_id),
    stripe_subscription_id = coalesce(excluded.stripe_subscription_id, public.subscriptions.stripe_subscription_id),
    current_period_end = excluded.current_period_end,
    trial_ends_at = excluded.trial_ends_at,
    updated_at = now()
  returning * into result;

  return result;
end;
$$;

grant execute on function public.activate_user_trial() to authenticated;
grant execute on function public.defer_user_to_basic() to authenticated;
grant execute on function public.sync_subscription_from_stripe(
  uuid,
  public.subscription_tier,
  public.subscription_status,
  text,
  text,
  timestamptz,
  timestamptz,
  text,
  text
) to service_role;
