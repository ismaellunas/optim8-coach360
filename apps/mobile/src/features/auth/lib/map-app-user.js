/**
 * Maps domain User to the legacy mock shape used by remaining App.jsx screens.
 * Subscription tier selection moves to STORY-2.3.
 */
export function mapAppUserToLegacy(user, { isNew = false } = {}) {
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

  return {
    role: legacyRole,
    name: user.displayName ?? user.email.split('@')[0],
    email: user.email,
    tier: 'trial',
    trialDays: 14,
    isNew,
  };
}
