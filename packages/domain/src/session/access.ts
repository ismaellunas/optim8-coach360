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

/** STORY-6.1 — coach/team-manager create-session access. */
export function canCreateSession(
  role: AppRole,
  subscription: Pick<Subscription, 'tier' | 'status'> | null,
): boolean {
  if (role === 'admin') {
    return true;
  }
  if (role === 'coach' || role === 'team_manager') {
    return meetsMinimumTier(subscription, 'advanced');
  }
  return false;
}

/** Team sessions are allowed for coach Advanced+ and team manager Advanced+. */
export function canCreateTeamSession(
  role: AppRole,
  subscription: Pick<Subscription, 'tier' | 'status'> | null,
): boolean {
  return canCreateSession(role, subscription);
}

/** Individual 1-on-1 sessions are limited to coaches at Advanced+. */
export function canCreateIndividualSession(
  role: AppRole,
  subscription: Pick<Subscription, 'tier' | 'status'> | null,
): boolean {
  if (role === 'admin') {
    return true;
  }
  if (role === 'coach') {
    return meetsMinimumTier(subscription, 'advanced');
  }
  return false;
}
