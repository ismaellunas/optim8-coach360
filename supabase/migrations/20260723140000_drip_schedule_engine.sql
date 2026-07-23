-- STORY-10.2 — drip schedule engine: seed on purchase + due unlock listing

alter table public.drip_progress
  add column if not exists scheduled_unlock_at timestamptz;

comment on column public.drip_progress.scheduled_unlock_at is
  'STORY-10.2 — when this module becomes available (set at purchase; unlock when <= now).';

create index if not exists drip_progress_due_unlock_idx
  on public.drip_progress (scheduled_unlock_at)
  where unlocked_at is null and scheduled_unlock_at is not null;

------------------------------------------------------------------------------
-- init_drip_progress_for_purchase — seed rows from package_metadata.module_ids
-- First module unlocks immediately; later modules follow intervalDays cadence.
-- OQ-14.3: no tier acceleration (interval from package only).
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
  v_module_ids text[];
  v_interval_days int;
  v_module_id text;
  v_index int;
  v_sched_index int := 0;
  v_scheduled timestamptz;
  v_inserted int := 0;
  v_rowcount int;
begin
  if p_purchase_id is null then
    raise exception 'drip_purchase_required';
  end if;

  select p.buyer_id, p.sanity_document_id, p.purchased_at
    into v_buyer_id, v_sanity_id, v_purchased_at
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
      v_buyer_id,
      p_purchase_id,
      trim(v_module_id),
      case when v_sched_index = 0 then v_purchased_at else null end,
      v_scheduled
    )
    on conflict (purchase_id, module_id) do nothing;

    get diagnostics v_rowcount = row_count;
    if v_rowcount > 0 then
      v_inserted := v_inserted + 1;
    end if;

    v_sched_index := v_sched_index + 1;
  end loop;

  return v_inserted;
end;
$$;

grant execute on function public.init_drip_progress_for_purchase(uuid) to service_role;

------------------------------------------------------------------------------
-- list_due_drip_unlocks — locked modules whose scheduled time has arrived
------------------------------------------------------------------------------

create or replace function public.list_due_drip_unlocks(
  p_now timestamptz default now()
)
returns table (
  purchase_id uuid,
  profile_id uuid,
  module_id text,
  scheduled_unlock_at timestamptz,
  sanity_document_id text
)
language sql
security definer
set search_path = public
as $$
  select
    dp.purchase_id,
    dp.profile_id,
    dp.module_id,
    dp.scheduled_unlock_at,
    p.sanity_document_id
  from public.drip_progress dp
  join public.purchases p on p.id = dp.purchase_id
  where dp.unlocked_at is null
    and dp.scheduled_unlock_at is not null
    and dp.scheduled_unlock_at <= p_now
  order by dp.scheduled_unlock_at asc;
$$;

grant execute on function public.list_due_drip_unlocks(timestamptz) to service_role;

------------------------------------------------------------------------------
-- apply_drip_module_unlock — mark a due module unlocked (idempotent)
------------------------------------------------------------------------------

create or replace function public.apply_drip_module_unlock(
  p_purchase_id uuid,
  p_module_id text,
  p_unlocked_at timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated int;
begin
  update public.drip_progress
  set unlocked_at = coalesce(p_unlocked_at, now())
  where purchase_id = p_purchase_id
    and module_id = trim(p_module_id)
    and unlocked_at is null
    and scheduled_unlock_at is not null
    and scheduled_unlock_at <= coalesce(p_unlocked_at, now());

  get diagnostics updated = row_count;
  return updated > 0;
end;
$$;

grant execute on function public.apply_drip_module_unlock(uuid, text, timestamptz) to service_role;
