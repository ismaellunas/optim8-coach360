// STORY-5.1 — shared RBAC guard for Supabase edge functions.
//
// Self-contained (no workspace imports) because edge functions run on Deno.
// The tier map below mirrors FEATURE_TIER_REQUIREMENTS in
// packages/domain/src/subscription/paywall.ts; tests/rbac/story-5.1.test.js
// pins the two against each other so drift fails the suite.

export type RbacRole = 'coach' | 'player' | 'team_manager' | 'team' | 'admin';
export type SubscriptionTier = 'trial' | 'basic' | 'advanced' | 'pro';
export type PaidTier = 'basic' | 'advanced' | 'pro';

type PaywallRoleKey = 'coach' | 'player' | 'team';

export const FEATURE_TIER_REQUIREMENTS: Record<
  string,
  Partial<Record<PaywallRoleKey, PaidTier>>
> = {
  // Mirrors packages/domain/src/subscription/paywall.ts (STORY-5.2 launch subset).
  chat: { coach: 'advanced', player: 'advanced', team: 'advanced' },
  createSession: { coach: 'advanced', team: 'advanced' },
  distribute: { coach: 'advanced' },
  objectives: { coach: 'pro', player: 'pro' },
  ai: { coach: 'pro', player: 'pro', team: 'pro' },
  createContent: { coach: 'advanced' },
  teamManage: { coach: 'basic', team: 'basic' },
  invitePlayers: { coach: 'advanced', team: 'basic' },
  removePlayers: { coach: 'advanced', team: 'basic' },
  assignCoach: { coach: 'pro', team: 'advanced' },
  viewProgress: { coach: 'basic', player: 'basic' },
  purchase: { coach: 'basic', player: 'basic', team: 'basic' },
  peerShare: { coach: 'advanced', player: 'advanced' },
  // STORY-8.3 AC-3 / OQ-18.3 interim — aggregated peer engagement at Pro.
  peerEngagement: { coach: 'pro' },
  feedback: { coach: 'advanced', player: 'advanced' },
  browseMarketplace: { coach: 'basic', player: 'basic', team: 'basic' },
  viewTrainingMaterials: { player: 'basic' },
  watchSharedVideo: { player: 'basic' },
  teamRoster: { coach: 'basic' },
  // STORY-6.3 AC-3 — player in-app schedule at Basic+.
  viewSchedule: { player: 'basic' },
};

const TIER_ORDER: SubscriptionTier[] = ['trial', 'basic', 'advanced', 'pro'];
const TIER_LABELS: Record<PaidTier, string> = {
  basic: 'Basic',
  advanced: 'Advanced',
  pro: 'Pro',
};

function tierIndex(tier: SubscriptionTier): number {
  return TIER_ORDER.indexOf(tier);
}

export function normalizeRbacRole(role: RbacRole): PaywallRoleKey | 'admin' {
  return role === 'team_manager' ? 'team' : role;
}

/**
 * Mirrors effectiveTierForAccess in packages/domain/src/subscription/rules.ts:
 * active trial → pro; expired/stale trial → basic; otherwise the stored tier.
 */
export function effectiveTierForAccess(
  subscription: {
    tier: SubscriptionTier;
    status: string;
    trialEndsAt?: string | null;
  } | null,
  now = new Date(),
): SubscriptionTier {
  if (!subscription) {
    return 'basic';
  }
  if (subscription.tier === 'trial') {
    const trialActive =
      subscription.status === 'trialing' &&
      (!subscription.trialEndsAt || new Date(subscription.trialEndsAt).getTime() > now.getTime());
    return trialActive ? 'pro' : 'basic';
  }
  return subscription.tier;
}

export type FeatureAccessCheck = {
  role: RbacRole;
  /** Effective access tier ('trial' = active trial, maps to Pro). */
  tier: SubscriptionTier;
  feature: string;
};

export type FeatureAccessDenialBody = {
  error: 'role_not_permitted' | 'tier_insufficient';
  feature: string;
  required_tier: PaidTier | null;
  hint: string | null;
};

export type FeatureAccessResult =
  | { ok: true }
  | { ok: false; status: 403; body: FeatureAccessDenialBody };

/**
 * AC-3: deny → 403 payload with a tier upgrade hint where an upgrade would
 * grant access; role-level denials carry no hint.
 */
export function requireFeatureAccess(check: FeatureAccessCheck): FeatureAccessResult {
  const role = normalizeRbacRole(check.role);
  if (role === 'admin') {
    return { ok: true };
  }
  const requiredTier = FEATURE_TIER_REQUIREMENTS[check.feature]?.[role] ?? null;
  if (!requiredTier) {
    return {
      ok: false,
      status: 403,
      body: {
        error: 'role_not_permitted',
        feature: check.feature,
        required_tier: null,
        hint: null,
      },
    };
  }
  const effectiveTier = check.tier === 'trial' ? 'pro' : check.tier;
  if (tierIndex(effectiveTier) >= tierIndex(requiredTier)) {
    return { ok: true };
  }
  return {
    ok: false,
    status: 403,
    body: {
      error: 'tier_insufficient',
      feature: check.feature,
      required_tier: requiredTier,
      hint: `Upgrade to ${TIER_LABELS[requiredTier]} to unlock ${check.feature}.`,
    },
  };
}

export function featureAccessDeniedResponse(
  denial: Extract<FeatureAccessResult, { ok: false }>,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(denial.body), {
    status: denial.status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

type ProfileRow = { role: string } | null;
type SubscriptionRow = {
  tier: string;
  status: string;
  trial_ends_at: string | null;
} | null;

type MaybeSingleResult<T> = Promise<{ data: T; error: { message: string } | null }>;

type SupabaseLikeClient = {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): { maybeSingle(): MaybeSingleResult<unknown> };
    };
  };
};

export type AccessContext = {
  role: RbacRole;
  tier: SubscriptionTier;
};

/**
 * Loads the caller's role and effective tier for requireFeatureAccess.
 * Use a service-role client so RLS does not hide the rows being checked.
 */
export async function loadAccessContext(
  client: SupabaseLikeClient,
  userId: string,
  now = new Date(),
): Promise<AccessContext> {
  const profileResult = await client
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }
  const profile = profileResult.data as ProfileRow;
  if (!profile) {
    throw new Error('profile_not_found');
  }

  const subscriptionResult = await client
    .from('subscriptions')
    .select('tier, status, trial_ends_at')
    .eq('profile_id', userId)
    .maybeSingle();
  if (subscriptionResult.error) {
    throw new Error(subscriptionResult.error.message);
  }
  const subscription = subscriptionResult.data as SubscriptionRow;

  return {
    role: profile.role as RbacRole,
    tier: effectiveTierForAccess(
      subscription
        ? {
            tier: subscription.tier as SubscriptionTier,
            status: subscription.status,
            trialEndsAt: subscription.trial_ends_at,
          }
        : null,
      now,
    ),
  };
}
