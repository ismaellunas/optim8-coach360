-- STORY-4.5 — Subscription upgrade/downgrade in account settings (Flow 17)
--
-- Upgrades apply immediately (Stripe proration); downgrades are scheduled for
-- the end of the current billing period. The scheduled target lives on the
-- subscription row until the Stripe webhook lands the new tier, at which point
-- the pending fields clear automatically. No user data (objectives, AI history)
-- is deleted on downgrade — history is preserved and only hidden by tier gating.

------------------------------------------------------------------------------
-- pending_tier — end-of-cycle scheduled tier change (Flow 17 downgrade rule)
------------------------------------------------------------------------------

alter table public.subscriptions
  add column if not exists pending_tier public.subscription_tier,
  add column if not exists pending_tier_effective_at timestamptz;

------------------------------------------------------------------------------
-- Clear the scheduled change once the webhook applies the pending tier
------------------------------------------------------------------------------

create or replace function public.clear_applied_pending_tier()
returns trigger
language plpgsql
as $$
begin
  if new.tier is distinct from old.tier and new.tier = old.pending_tier then
    new.pending_tier := null;
    new.pending_tier_effective_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists subscriptions_clear_applied_pending_tier on public.subscriptions;

create trigger subscriptions_clear_applied_pending_tier
  before update on public.subscriptions
  for each row
  execute function public.clear_applied_pending_tier();
