-- STORY-10.1 — marketplace package purchases (personal + team scope)

alter table public.purchases
  add column if not exists scope text not null default 'personal';

alter table public.purchases
  add column if not exists team_id uuid references public.teams (id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'purchases_scope_check'
  ) then
    alter table public.purchases
      add constraint purchases_scope_check
      check (scope in ('personal', 'team'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'purchases_team_scope_check'
  ) then
    alter table public.purchases
      add constraint purchases_team_scope_check
      check (
        (scope = 'personal' and team_id is null)
        or (scope = 'team' and team_id is not null)
      );
  end if;
end $$;

create index if not exists purchases_team_id_idx on public.purchases (team_id);

comment on column public.purchases.scope is
  'STORY-10.1 — personal buyer ownership or team distribution purchase.';
comment on column public.purchases.team_id is
  'Set when scope=team (coach Advanced+ team purchase).';

------------------------------------------------------------------------------
-- sync_purchase_from_stripe — service-role upsert from checkout.session.completed
------------------------------------------------------------------------------

create or replace function public.sync_purchase_from_stripe(
  p_buyer_id uuid,
  p_sanity_document_id text,
  p_stripe_payment_intent_id text,
  p_amount_cents int,
  p_currency text,
  p_scope text default 'personal',
  p_team_id uuid default null,
  p_event_id text default null,
  p_event_type text default null
)
returns public.purchases
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.purchases;
begin
  if p_buyer_id is null then
    raise exception 'purchase_buyer_required';
  end if;
  if p_sanity_document_id is null or length(trim(p_sanity_document_id)) = 0 then
    raise exception 'purchase_package_required';
  end if;
  if p_scope is null or p_scope not in ('personal', 'team') then
    raise exception 'purchase_scope_invalid';
  end if;
  if p_scope = 'team' and p_team_id is null then
    raise exception 'purchase_team_required';
  end if;
  if p_scope = 'personal' and p_team_id is not null then
    raise exception 'purchase_team_not_allowed';
  end if;

  if p_event_id is not null then
    insert into public.billing_events (id, event_type)
    values (p_event_id, coalesce(p_event_type, 'checkout.session.completed'))
    on conflict (id) do nothing;

    if not found then
      select * into result
      from public.purchases
      where stripe_payment_intent_id = p_stripe_payment_intent_id
      limit 1;
      if result.id is not null then
        return result;
      end if;
      select * into result
      from public.purchases
      where buyer_id = p_buyer_id
        and sanity_document_id = p_sanity_document_id
        and scope = p_scope
        and (p_team_id is null or team_id = p_team_id)
      order by purchased_at desc
      limit 1;
      return result;
    end if;
  end if;

  if p_stripe_payment_intent_id is not null and length(trim(p_stripe_payment_intent_id)) > 0 then
    insert into public.purchases (
      buyer_id,
      sanity_document_id,
      stripe_payment_intent_id,
      amount_cents,
      currency,
      scope,
      team_id
    )
    values (
      p_buyer_id,
      trim(p_sanity_document_id),
      trim(p_stripe_payment_intent_id),
      greatest(coalesce(p_amount_cents, 0), 0),
      lower(coalesce(nullif(trim(p_currency), ''), 'usd')),
      p_scope,
      p_team_id
    )
    on conflict (stripe_payment_intent_id) do update set
      amount_cents = excluded.amount_cents,
      currency = excluded.currency,
      scope = excluded.scope,
      team_id = excluded.team_id
    returning * into result;
  else
    insert into public.purchases (
      buyer_id,
      sanity_document_id,
      stripe_payment_intent_id,
      amount_cents,
      currency,
      scope,
      team_id
    )
    values (
      p_buyer_id,
      trim(p_sanity_document_id),
      null,
      greatest(coalesce(p_amount_cents, 0), 0),
      lower(coalesce(nullif(trim(p_currency), ''), 'usd')),
      p_scope,
      p_team_id
    )
    returning * into result;
  end if;

  return result;
end;
$$;

grant execute on function public.sync_purchase_from_stripe(
  uuid,
  text,
  text,
  int,
  text,
  text,
  uuid,
  text,
  text
) to service_role;
