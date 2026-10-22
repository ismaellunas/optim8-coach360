-- STORY-12.4 (resolved) — DAU scoping/presentation fix.
--
-- Keep strict calendar-day DAU (unchanged definition), but add a
-- `dau_yesterday` + `dau_date` pair so the Monitor headline card can default
-- to the last *complete* day instead of "today" (which reads as a false
-- "broken" zero whenever the admin reviews Monitor on a different UTC
-- calendar day than when the activity happened). `dau_today` is left in the
-- payload unchanged for anyone who still wants a "today so far" figure.
--
-- Copy of 20260727180000_admin_monitor_analytics.sql's admin_platform_analytics
-- with the yesterday variables/output added; no other behavior changes.

create or replace function public.admin_platform_analytics(p_days int default 14)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role public.app_role;
  v_days int;
  v_dau_today int;
  v_dau_yesterday int;
  v_dau_date date;
  v_paid_cents bigint;
  v_paid_count int;
  v_currency text;
  v_session_completions int;
  v_drip_completions int;
  v_first_drill int;
  v_signed_up int;
  v_profile_completed int;
  v_onboarding_completed int;
  v_series jsonb;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is distinct from 'admin' then
    raise exception 'admin_required';
  end if;

  v_days := greatest(1, least(coalesce(p_days, 14), 90));
  v_dau_date := (date_trunc('day', now()) - interval '1 day')::date;

  -- Derived DAU: distinct profiles with chat, session completion, drip
  -- completion, or session creation activity that calendar day.
  select count(distinct actor_id)::int into v_dau_today
  from (
    select sender_id as actor_id
    from public.chat_messages
    where created_at >= date_trunc('day', now())
      and hidden_at is null
    union
    select player_id
    from public.session_content_completions
    where completed_at >= date_trunc('day', now())
    union
    select profile_id
    from public.drip_progress
    where completed_at is not null
      and completed_at >= date_trunc('day', now())
    union
    select coach_id
    from public.sessions
    where created_at >= date_trunc('day', now())
  ) activity;

  -- Last complete day (yesterday, UTC) — the headline figure the Monitor
  -- card defaults to, so a true zero can't be mistaken for "not updating."
  select count(distinct actor_id)::int into v_dau_yesterday
  from (
    select sender_id as actor_id
    from public.chat_messages
    where created_at >= v_dau_date
      and created_at < v_dau_date + interval '1 day'
      and hidden_at is null
    union
    select player_id
    from public.session_content_completions
    where completed_at >= v_dau_date
      and completed_at < v_dau_date + interval '1 day'
    union
    select profile_id
    from public.drip_progress
    where completed_at is not null
      and completed_at >= v_dau_date
      and completed_at < v_dau_date + interval '1 day'
    union
    select coach_id
    from public.sessions
    where created_at >= v_dau_date
      and created_at < v_dau_date + interval '1 day'
  ) activity;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('date', day::date, 'dau', dau)
      order by day
    ),
    '[]'::jsonb
  )
  into v_series
  from (
    select
      d::date as day,
      (
        select count(distinct actor_id)::int
        from (
          select sender_id as actor_id
          from public.chat_messages
          where created_at >= d
            and created_at < d + interval '1 day'
            and hidden_at is null
          union
          select player_id
          from public.session_content_completions
          where completed_at >= d
            and completed_at < d + interval '1 day'
          union
          select profile_id
          from public.drip_progress
          where completed_at is not null
            and completed_at >= d
            and completed_at < d + interval '1 day'
          union
          select coach_id
          from public.sessions
          where created_at >= d
            and created_at < d + interval '1 day'
        ) day_activity
      ) as dau
    from generate_series(
      date_trunc('day', now()) - ((v_days - 1) * interval '1 day'),
      date_trunc('day', now()),
      interval '1 day'
    ) as d
  ) series;

  select
    coalesce(sum(amount_cents), 0),
    count(*)::int,
    coalesce(min(currency), 'usd')
  into v_paid_cents, v_paid_count, v_currency
  from public.billing_invoices
  where status = 'paid';

  select count(*)::int into v_session_completions
  from public.session_content_completions;

  select count(*)::int into v_drip_completions
  from public.drip_progress
  where completed_at is not null;

  select count(*)::int into v_first_drill
  from public.profiles
  where first_drill_completed_at is not null;

  select count(*)::int into v_signed_up from public.profiles;

  select count(*)::int into v_profile_completed
  from public.profiles
  where profile_completed_at is not null;

  select count(*)::int into v_onboarding_completed
  from public.profiles
  where coach_onboarding_completed_at is not null
     or player_onboarding_completed_at is not null;

  return jsonb_build_object(
    'dau_today', coalesce(v_dau_today, 0),
    'dau_yesterday', coalesce(v_dau_yesterday, 0),
    'dau_date', v_dau_date,
    'dau_series', coalesce(v_series, '[]'::jsonb),
    'paid_revenue_cents', coalesce(v_paid_cents, 0),
    'paid_invoice_count', coalesce(v_paid_count, 0),
    'currency', coalesce(v_currency, 'usd'),
    'content_completion', jsonb_build_object(
      'session_completions', coalesce(v_session_completions, 0),
      'drip_completions', coalesce(v_drip_completions, 0),
      'first_drill_completions', coalesce(v_first_drill, 0)
    ),
    'onboarding_funnel', jsonb_build_object(
      'signed_up', coalesce(v_signed_up, 0),
      'profile_completed', coalesce(v_profile_completed, 0),
      'onboarding_completed', coalesce(v_onboarding_completed, 0),
      'first_drill', coalesce(v_first_drill, 0)
    )
  );
end;
$$;

grant execute on function public.admin_platform_analytics(int) to authenticated;
