-- STORY-12.4 — Admin Monitor: analytics, chat moderation, AI config, health
-- Platform analytics RPCs, soft-hide chat messages, AI recommendation settings,
-- and system_health_events for API errors / webhook failures.

------------------------------------------------------------------------------
-- chat_messages soft-hide (AC-2)
------------------------------------------------------------------------------

alter table public.chat_messages
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_by uuid references public.profiles (id) on delete set null,
  add column if not exists hidden_reason text;

create index if not exists chat_messages_hidden_at_idx
  on public.chat_messages (channel_id, created_at)
  where hidden_at is null;

------------------------------------------------------------------------------
-- platform_settings: ai_recommendation_config (AC-3)
------------------------------------------------------------------------------

insert into public.platform_settings (key, value)
values (
  'ai_recommendation_config',
  '{"llm_top_k":3,"candidate_pool":8,"rag_top_k":8,"llm_rerank_enabled":true}'::jsonb
)
on conflict (key) do nothing;

------------------------------------------------------------------------------
-- system_health_events (AC-5)
------------------------------------------------------------------------------

create table if not exists public.system_health_events (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('api_error', 'webhook_failure')),
  source text not null,
  message text not null default '',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists system_health_events_created_idx
  on public.system_health_events (created_at desc);

create index if not exists system_health_events_kind_created_idx
  on public.system_health_events (kind, created_at desc);

alter table public.system_health_events enable row level security;

drop policy if exists system_health_events_admin_select on public.system_health_events;
create policy system_health_events_admin_select
  on public.system_health_events for select
  to authenticated
  using (public.is_admin(auth.uid()));

grant select on public.system_health_events to authenticated;
grant all on public.system_health_events to service_role;

------------------------------------------------------------------------------
-- record_system_health_event — service-role helper (AC-5)
------------------------------------------------------------------------------

create or replace function public.record_system_health_event(
  p_kind text,
  p_source text,
  p_message text default '',
  p_details jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_kind is null or p_kind not in ('api_error', 'webhook_failure') then
    raise exception 'invalid_health_event_kind';
  end if;

  if p_source is null or length(trim(p_source)) = 0 then
    raise exception 'health_event_source_required';
  end if;

  insert into public.system_health_events (kind, source, message, details)
  values (
    p_kind,
    trim(p_source),
    coalesce(p_message, ''),
    coalesce(p_details, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.record_system_health_event(text, text, text, jsonb) to service_role;

------------------------------------------------------------------------------
-- admin_platform_analytics — DAU, revenue, completion, funnel (AC-1)
------------------------------------------------------------------------------

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

------------------------------------------------------------------------------
-- Chat moderation RPCs (AC-2)
------------------------------------------------------------------------------

create or replace function public.admin_list_chat_channels()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role public.app_role;
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is distinct from 'admin' then
    raise exception 'admin_required';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'type', c.type,
        'team_id', c.team_id,
        'title', case
          when c.type = 'team' then coalesce(t.name, 'Team channel')
          else 'DM / P2P'
        end,
        'message_count', coalesce(stats.msg_count, 0),
        'last_at', stats.last_at
      )
      order by stats.last_at desc nulls last
    ),
    '[]'::jsonb
  )
  into result
  from public.chat_channels c
  left join public.teams t on t.id = c.team_id
  left join lateral (
    select
      count(*)::int as msg_count,
      max(m.created_at) as last_at
    from public.chat_messages m
    where m.channel_id = c.id
  ) stats on true;

  return result;
end;
$$;

create or replace function public.admin_list_chat_messages(p_channel_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role public.app_role;
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is distinct from 'admin' then
    raise exception 'admin_required';
  end if;

  if p_channel_id is null then
    raise exception 'channel_id_required';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'channel_id', m.channel_id,
        'sender_id', m.sender_id,
        'sender_name', p.display_name,
        'body', m.body,
        'message_type', coalesce(m.message_type::text, 'text'),
        'created_at', m.created_at,
        'hidden_at', m.hidden_at,
        'hidden_by', m.hidden_by,
        'hidden_reason', m.hidden_reason
      )
      order by m.created_at asc
    ),
    '[]'::jsonb
  )
  into result
  from public.chat_messages m
  left join public.profiles p on p.id = m.sender_id
  where m.channel_id = p_channel_id;

  return result;
end;
$$;

create or replace function public.admin_set_chat_message_hidden(
  p_message_id uuid,
  p_hidden boolean,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role public.app_role;
  result public.chat_messages;
  v_reason text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is distinct from 'admin' then
    raise exception 'admin_required';
  end if;

  if p_message_id is null then
    raise exception 'message_id_required';
  end if;

  v_reason := nullif(trim(coalesce(p_reason, '')), '');
  if v_reason is not null and length(v_reason) > 500 then
    v_reason := left(v_reason, 500);
  end if;

  update public.chat_messages
  set
    hidden_at = case when p_hidden then now() else null end,
    hidden_by = case when p_hidden then auth.uid() else null end,
    hidden_reason = case when p_hidden then v_reason else null end
  where id = p_message_id
  returning * into result;

  if result.id is null then
    raise exception 'message_not_found';
  end if;

  return jsonb_build_object(
    'id', result.id,
    'channel_id', result.channel_id,
    'hidden_at', result.hidden_at,
    'hidden_by', result.hidden_by,
    'hidden_reason', result.hidden_reason
  );
end;
$$;

grant execute on function public.admin_list_chat_channels() to authenticated;
grant execute on function public.admin_list_chat_messages(uuid) to authenticated;
grant execute on function public.admin_set_chat_message_hidden(uuid, boolean, text) to authenticated;

------------------------------------------------------------------------------
-- AI recommendation config get / set (AC-3)
------------------------------------------------------------------------------

create or replace function public.get_ai_recommendation_config()
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
  where key = 'ai_recommendation_config';

  if raw is null or jsonb_typeof(raw) is distinct from 'object' then
    return '{"llm_top_k":3,"candidate_pool":8,"rag_top_k":8,"llm_rerank_enabled":true}'::jsonb;
  end if;

  return jsonb_build_object(
    'llm_top_k', greatest(1, least(20, coalesce((raw ->> 'llm_top_k')::int, 3))),
    'candidate_pool', greatest(1, least(50, coalesce((raw ->> 'candidate_pool')::int, 8))),
    'rag_top_k', greatest(5, least(10, coalesce((raw ->> 'rag_top_k')::int, 8))),
    'llm_rerank_enabled', coalesce((raw ->> 'llm_rerank_enabled')::boolean, true)
  );
end;
$$;

create or replace function public.set_ai_recommendation_config(p_config jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role public.app_role;
  normalized jsonb;
  v_llm int;
  v_pool int;
  v_rag int;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is distinct from 'admin' then
    raise exception 'admin_required';
  end if;

  if p_config is null or jsonb_typeof(p_config) is distinct from 'object' then
    raise exception 'invalid_ai_recommendation_config';
  end if;

  v_llm := greatest(1, least(20, coalesce((p_config ->> 'llm_top_k')::int, 3)));
  v_pool := greatest(1, least(50, coalesce((p_config ->> 'candidate_pool')::int, 8)));
  if v_pool < v_llm then
    v_pool := v_llm;
  end if;
  v_rag := greatest(5, least(10, coalesce((p_config ->> 'rag_top_k')::int, 8)));

  normalized := jsonb_build_object(
    'llm_top_k', v_llm,
    'candidate_pool', v_pool,
    'rag_top_k', v_rag,
    'llm_rerank_enabled', coalesce((p_config ->> 'llm_rerank_enabled')::boolean, true)
  );

  insert into public.platform_settings (key, value, updated_at)
  values ('ai_recommendation_config', normalized, now())
  on conflict (key) do update set
    value = excluded.value,
    updated_at = now();

  return normalized;
end;
$$;

grant execute on function public.get_ai_recommendation_config() to authenticated;
grant execute on function public.get_ai_recommendation_config() to service_role;
grant execute on function public.set_ai_recommendation_config(jsonb) to authenticated;

------------------------------------------------------------------------------
-- admin_health_summary (AC-5)
------------------------------------------------------------------------------

create or replace function public.admin_health_summary(p_hours int default 24)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role public.app_role;
  v_hours int;
  v_since timestamptz;
  v_api int;
  v_webhook int;
  v_rag int;
  v_events jsonb;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is distinct from 'admin' then
    raise exception 'admin_required';
  end if;

  v_hours := greatest(1, least(coalesce(p_hours, 24), 168));
  v_since := now() - make_interval(hours => v_hours);

  select count(*)::int into v_api
  from public.system_health_events
  where kind = 'api_error'
    and created_at >= v_since;

  select count(*)::int into v_webhook
  from public.system_health_events
  where kind = 'webhook_failure'
    and created_at >= v_since;

  select count(*)::int into v_rag
  from public.rag_embedding_jobs
  where status = 'failed'
    and updated_at >= v_since;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'kind', e.kind,
        'source', e.source,
        'message', e.message,
        'created_at', e.created_at
      )
      order by e.created_at desc
    ),
    '[]'::jsonb
  )
  into v_events
  from (
    select id, kind, source, message, created_at
    from public.system_health_events
    where created_at >= v_since
    order by created_at desc
    limit 25
  ) e;

  return jsonb_build_object(
    'window_hours', v_hours,
    'api_error_count', coalesce(v_api, 0),
    'webhook_failure_count', coalesce(v_webhook, 0),
    'rag_job_failure_count', coalesce(v_rag, 0),
    'recent_events', coalesce(v_events, '[]'::jsonb)
  );
end;
$$;

grant execute on function public.admin_health_summary(int) to authenticated;
