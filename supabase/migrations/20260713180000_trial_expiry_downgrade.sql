-- STORY-4.3 — Trial expiration downgrade to Basic (Flow 9)

------------------------------------------------------------------------------
-- expire_ended_trials — batch downgrade expired trials (service role / cron)
------------------------------------------------------------------------------

create or replace function public.expire_ended_trials(
  p_now timestamptz default now()
)
returns setof public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.subscriptions s
  set
    tier = 'basic',
    status = 'active',
    updated_at = p_now
  where s.tier = 'trial'
    and s.status = 'trialing'
    and s.trial_ends_at is not null
    and s.trial_ends_at <= p_now
  returning s.*;
end;
$$;

------------------------------------------------------------------------------
-- expire_own_trial_if_ended — client-side reconcile on session load
------------------------------------------------------------------------------

create or replace function public.expire_own_trial_if_ended()
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  existing public.subscriptions;
  result public.subscriptions;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into existing from public.subscriptions where profile_id = uid;

  if existing.id is null then
    raise exception 'subscription_not_found';
  end if;

  if existing.tier = 'trial'
    and existing.status = 'trialing'
    and existing.trial_ends_at is not null
    and existing.trial_ends_at <= now()
  then
    update public.subscriptions
    set
      tier = 'basic',
      status = 'active',
      updated_at = now()
    where profile_id = uid
    returning * into result;

    return result;
  end if;

  return existing;
end;
$$;

grant execute on function public.expire_ended_trials(timestamptz) to service_role;
grant execute on function public.expire_own_trial_if_ended() to authenticated;
