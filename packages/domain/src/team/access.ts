import type { AppRole } from '../user/schema.js';
import type { Subscription, SubscriptionTier } from '../subscription/schema.js';
import { effectiveTierForAccess } from '../subscription/rules.js';

const TIER_ORDER: SubscriptionTier[] = ['trial', 'basic', 'advanced', 'pro'];

function tierIndex(tier: SubscriptionTier): number {
  return TIER_ORDER.indexOf(tier);
}

function meetsMinimumTier(
  subscription: Pick<Subscription, 'tier' | 'status'> | null,
  minimum: SubscriptionTier,
): boolean {
  const effective = subscription ? effectiveTierForAccess(subscription) : 'trial';
  return tierIndex(effective) >= tierIndex(minimum);
}

/** Flow 11 — coach invite/manual add at Advanced+. */
export function canGenerateTeamInvite(
  role: AppRole,
  subscription: Pick<Subscription, 'tier' | 'status'> | null,
): boolean {
  if (role === 'admin') {
    return true;
  }
  if (role === 'coach') {
    return meetsMinimumTier(subscription, 'advanced');
  }
  if (role === 'team_manager') {
    return meetsMinimumTier(subscription, 'basic');
  }
  return false;
}

/** Flow 11 — team manager manual add at Basic+; coach at Advanced+. */
export function canManuallyAddRosterPlayer(
  role: AppRole,
  subscription: Pick<Subscription, 'tier' | 'status'> | null,
): boolean {
  return canGenerateTeamInvite(role, subscription);
}
