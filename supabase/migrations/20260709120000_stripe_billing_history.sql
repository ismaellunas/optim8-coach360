-- STORY-4.1 — Stripe billing invoice history + webhook sync helpers

------------------------------------------------------------------------------
-- billing_invoices  (Stripe invoice read-model for account settings)
------------------------------------------------------------------------------

create table if not exists public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  stripe_invoice_id text not null unique,
  amount_cents int not null check (amount_cents >= 0),
  currency text not null default 'usd',
  status text not null check (status in ('draft', 'open', 'paid', 'void', 'uncollectible')),
  hosted_invoice_url text,
  invoice_pdf text,
  period_start timestamptz,
  period_end timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists billing_invoices_profile_id_idx
  on public.billing_invoices (profile_id, created_at desc);

alter table public.billing_invoices enable row level security;

create policy "billing_invoices_owner_select"
  on public.billing_invoices for select
  using (profile_id = auth.uid() or public.is_admin(auth.uid()));

------------------------------------------------------------------------------
-- sync_billing_invoice_from_stripe — service-role upsert from webhook
------------------------------------------------------------------------------

create or replace function public.sync_billing_invoice_from_stripe(
  p_profile_id uuid,
  p_stripe_invoice_id text,
  p_amount_cents int,
  p_currency text,
  p_status text,
  p_hosted_invoice_url text,
  p_invoice_pdf text,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_paid_at timestamptz,
  p_event_id text,
  p_event_type text
)
returns public.billing_invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.billing_invoices;
begin
  if p_event_id is not null then
    insert into public.billing_events (id, event_type)
    values (p_event_id, p_event_type)
    on conflict (id) do nothing;

    if not found then
      select * into result from public.billing_invoices
      where stripe_invoice_id = p_stripe_invoice_id;
      return result;
    end if;
  end if;

  insert into public.billing_invoices (
    profile_id,
    stripe_invoice_id,
    amount_cents,
    currency,
    status,
    hosted_invoice_url,
    invoice_pdf,
    period_start,
    period_end,
    paid_at
  )
  values (
    p_profile_id,
    p_stripe_invoice_id,
    p_amount_cents,
    coalesce(p_currency, 'usd'),
    p_status,
    p_hosted_invoice_url,
    p_invoice_pdf,
    p_period_start,
    p_period_end,
    p_paid_at
  )
  on conflict (stripe_invoice_id) do update set
    profile_id = excluded.profile_id,
    amount_cents = excluded.amount_cents,
    currency = excluded.currency,
    status = excluded.status,
    hosted_invoice_url = excluded.hosted_invoice_url,
    invoice_pdf = excluded.invoice_pdf,
    period_start = excluded.period_start,
    period_end = excluded.period_end,
    paid_at = excluded.paid_at
  returning * into result;

  return result;
end;
$$;

grant execute on function public.sync_billing_invoice_from_stripe(
  uuid,
  text,
  int,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  timestamptz,
  text,
  text
) to service_role;

------------------------------------------------------------------------------
-- mark_subscription_past_due_by_customer — failed payment locked state
------------------------------------------------------------------------------

create or replace function public.mark_subscription_past_due_by_customer(
  p_stripe_customer_id text,
  p_profile_id uuid,
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
  target_profile uuid := p_profile_id;
begin
  if p_event_id is not null then
    insert into public.billing_events (id, event_type)
    values (p_event_id, p_event_type)
    on conflict (id) do nothing;

    if not found then
      if target_profile is not null then
        select * into result from public.subscriptions where profile_id = target_profile;
      else
        select * into result from public.subscriptions
        where stripe_customer_id = p_stripe_customer_id
        limit 1;
      end if;
      return result;
    end if;
  end if;

  if target_profile is null then
    select profile_id into target_profile
    from public.subscriptions
    where stripe_customer_id = p_stripe_customer_id
    limit 1;
  end if;

  if target_profile is null then
    raise exception 'subscription_not_found_for_customer';
  end if;

  update public.subscriptions
  set status = 'past_due', updated_at = now()
  where profile_id = target_profile
  returning * into result;

  return result;
end;
$$;

grant execute on function public.mark_subscription_past_due_by_customer(
  text,
  uuid,
  text,
  text
) to service_role;
