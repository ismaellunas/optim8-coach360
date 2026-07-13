-- STORY-4.2 — Free trial activation policy, countdown support, expiry warnings

------------------------------------------------------------------------------
-- trial_used_at — one trial per account (re-activation blocked after use)
------------------------------------------------------------------------------

alter table public.subscriptions
  add column if not exists trial_used_at timestamptz;

-- Existing rows that already had a trial window count as used.
update public.subscriptions
set trial_used_at = coalesce(created_at, now())
where trial_ends_at is not null
  and trial_used_at is null;

------------------------------------------------------------------------------
-- platform_settings — admin-configurable trial warning schedule
------------------------------------------------------------------------------

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.platform_settings enable row level security;

insert into public.platform_settings (key, value)
values ('trial_warning_days_before', '3'::jsonb)
on conflict (key) do nothing;

-- Authenticated users can read settings (warning days used client-side too).
create policy platform_settings_select_authenticated
  on public.platform_settings
  for select
  to authenticated
  using (true);

-- Only service role / admin RPCs write settings (no direct client update policy).

grant select on public.platform_settings to authenticated;
grant select, insert, update on public.platform_settings to service_role;

------------------------------------------------------------------------------
-- trial_warning_events — idempotent expiry warning delivery ledger
------------------------------------------------------------------------------

create table if not exists public.trial_warning_events (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  warning_for_ends_at timestamptz not null,
  sent_at timestamptz not null default now(),
  primary key (profile_id, warning_for_ends_at)
);

alter table public.trial_warning_events enable row level security;

grant select, insert on public.trial_warning_events to service_role;

------------------------------------------------------------------------------
-- activate_user_trial — once per account; allow unused Basic deferrals (Flow 10)
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
  ends_at timestamptz := now() + interval '14 days';
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
-- get / set trial warning days (admin-configurable)
------------------------------------------------------------------------------

create or replace function public.get_trial_warning_days()
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
  where key = 'trial_warning_days_before';

  if raw is null then
    return 3;
  end if;

  begin
    days := (raw #>> '{}')::int;
  exception when others then
    return 3;
  end;

  if days is null or days < 1 then
    return 3;
  end if;

  return days;
end;
$$;

create or replace function public.set_trial_warning_days(p_days int)
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
    raise exception 'invalid_warning_days';
  end if;

  insert into public.platform_settings (key, value, updated_at)
  values ('trial_warning_days_before', to_jsonb(p_days), now())
  on conflict (key) do update set
    value = excluded.value,
    updated_at = now();

  return p_days;
end;
$$;

------------------------------------------------------------------------------
-- list_trial_warning_candidates — active trials inside the warning window
------------------------------------------------------------------------------

create or replace function public.list_trial_warning_candidates(
  p_now timestamptz default now()
)
returns table (
  profile_id uuid,
  trial_ends_at timestamptz,
  days_remaining int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  warning_days int := public.get_trial_warning_days();
begin
  return query
  select
    s.profile_id,
    s.trial_ends_at,
    greatest(
      0,
      ceil(extract(epoch from (s.trial_ends_at - p_now)) / 86400.0)
    )::int as days_remaining
  from public.subscriptions s
  where s.tier = 'trial'
    and s.status = 'trialing'
    and s.trial_ends_at is not null
    and s.trial_ends_at > p_now
    and ceil(extract(epoch from (s.trial_ends_at - p_now)) / 86400.0) <= warning_days
    and not exists (
      select 1
      from public.trial_warning_events e
      where e.profile_id = s.profile_id
        and e.warning_for_ends_at = s.trial_ends_at
    );
end;
$$;

create or replace function public.record_trial_warning_sent(
  p_profile_id uuid,
  p_trial_ends_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.trial_warning_events (profile_id, warning_for_ends_at)
  values (p_profile_id, p_trial_ends_at)
  on conflict do nothing;
end;
$$;

grant execute on function public.activate_user_trial() to authenticated;
grant execute on function public.get_trial_warning_days() to authenticated;
grant execute on function public.get_trial_warning_days() to service_role;
grant execute on function public.set_trial_warning_days(int) to authenticated;
grant execute on function public.list_trial_warning_candidates(timestamptz) to service_role;
grant execute on function public.record_trial_warning_sent(uuid, timestamptz) to service_role;
