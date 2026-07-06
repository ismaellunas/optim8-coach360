import { legacyDisplayTier, trialDaysRemaining } from '@coach360/domain';

/**
 * Maps domain User to the legacy mock shape used by remaining App.jsx screens.
 */
export function mapAppUserToLegacy(user, { isNew = false, subscription = null } = {}) {
  const roleMap = {
    coach: 'coach',
    player: 'player',
    team_manager: 'team',
    admin: 'admin',
  };

  const legacyRole = roleMap[user.role];
  if (!legacyRole) {
    throw new Error(`unsupported_role:${user.role}`);
  }

  let tier = 'basic';
  let trialDays = 0;

  if (subscription) {
    tier = legacyDisplayTier(subscription);
    trialDays = trialDaysRemaining(subscription.trialEndsAt);
  }

  return {
    role: legacyRole,
    name: user.displayName ?? user.email.split('@')[0],
    email: user.email,
    tier,
    trialDays,
    isNew,
  };
}
