-- STORY-10.3 — drip progress and completion tracking
--   * per-profile module rows (team purchases seed roster players)
--   * mark_drip_module_completed for the module owner
--   * buyer (coach) visibility + per-player completion summary for team buys

------------------------------------------------------------------------------
-- Widen uniqueness so a team purchase can hold one row per (player, module).
------------------------------------------------------------------------------

alter table public.drip_progress
  drop constraint if exists drip_progress_purchase_id_module_id_key;

alter table public.drip_progress
  add constraint drip_progress_purchase_profile_module_key
  unique (purchase_id, profile_id, module_id);

------------------------------------------------------------------------------
-- init_drip_progress_for_purchase — v2 (STORY-10.3)
-- Seeds buyer rows as in STORY-10.2; team-scope purchases also seed one row
-- per active roster player so coach can track completion (AC-4).
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

  select
    coalesce(pm.module_ids, '{}'::text[]),
    greatest(
      1,
      coalesce(
        (
          case
            when (pm.drip_schedule ->> 'intervalDays') ~ '^[0-9]+$'
              then (pm.drip_schedule ->> 'intervalDays')::int
            else null
          end
        ),
        7
      )
    )
  into v_module_ids, v_interval_days
  from public.package_metadata pm
  where pm.sanity_document_id = v_sanity_id;

  if v_module_ids is null then
    v_module_ids := '{}'::text[];
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

------------------------------------------------------------------------------
-- mark_drip_module_completed — owner marks an unlocked module done (AC-2)
-- Idempotent; refuses locked modules.
------------------------------------------------------------------------------

create or replace function public.mark_drip_module_completed(
  p_purchase_id uuid,
  p_module_id text
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_completed_at timestamptz;
begin
  if p_purchase_id is null or p_module_id is null or length(trim(p_module_id)) = 0 then
    raise exception 'drip_module_required';
  end if;

  select dp.completed_at
    into v_completed_at
  from public.drip_progress dp
  where dp.purchase_id = p_purchase_id
    and dp.module_id = trim(p_module_id)
    and dp.profile_id = auth.uid();

  if not found then
    raise exception 'drip_module_not_found';
  end if;

  if v_completed_at is not null then
    return v_completed_at;
  end if;

  update public.drip_progress
  set completed_at = now()
  where purchase_id = p_purchase_id
    and module_id = trim(p_module_id)
    and profile_id = auth.uid()
    and unlocked_at is not null
  returning completed_at into v_completed_at;

  if v_completed_at is null then
    raise exception 'drip_module_locked';
  end if;

  return v_completed_at;
end;
$$;

grant execute on function public.mark_drip_module_completed(uuid, text) to authenticated;

------------------------------------------------------------------------------
-- Buyer visibility — coach who made a team purchase can read all its rows.
------------------------------------------------------------------------------

drop policy if exists "drip_progress_team_buyer_select" on public.drip_progress;

create policy "drip_progress_team_buyer_select"
  on public.drip_progress for select
  using (
    exists (
      select 1
      from public.purchases p
      where p.id = drip_progress.purchase_id
        and p.buyer_id = auth.uid()
    )
  );

------------------------------------------------------------------------------
-- list_team_purchase_completions — per-player completion for a team buy (AC-4)
------------------------------------------------------------------------------

create or replace function public.list_team_purchase_completions(
  p_purchase_id uuid
)
returns table (
  profile_id uuid,
  display_name text,
  total_modules int,
  completed_modules int,
  unlocked_modules int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer_id uuid;
  v_scope text;
begin
  select p.buyer_id, p.scope
    into v_buyer_id, v_scope
  from public.purchases p
  where p.id = p_purchase_id;

  if v_buyer_id is null then
    raise exception 'purchase_not_found';
  end if;
  if v_buyer_id <> auth.uid() then
    raise exception 'purchase_not_owned';
  end if;
  if v_scope <> 'team' then
    raise exception 'purchase_not_team_scope';
  end if;

  return query
  select
    dp.profile_id,
    pr.display_name,
    count(*)::int as total_modules,
    count(dp.completed_at)::int as completed_modules,
    count(dp.unlocked_at)::int as unlocked_modules
  from public.drip_progress dp
  left join public.profiles pr on pr.id = dp.profile_id
  where dp.purchase_id = p_purchase_id
  group by dp.profile_id, pr.display_name
  order by pr.display_name nulls last, dp.profile_id;
end;
$$;

grant execute on function public.list_team_purchase_completions(uuid) to authenticated;
