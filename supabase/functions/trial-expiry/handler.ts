/** Self-contained STORY-4.3 trial expiry downgrade for Deno edge + vitest. */

export type TrialExpiryCandidate = {
  profile_id: string;
  trial_ends_at: string;
  tier: 'trial' | 'basic' | 'advanced' | 'pro';
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete';
};

export type TrialExpiryDowngrade = {
  profileId: string;
  trialEndsAt: string;
  fromTier: 'trial';
  toTier: 'basic';
  toStatus: 'active';
  event: 'trial_expired_downgrade';
};

export type ProcessTrialExpiryResult = {
  expired: TrialExpiryDowngrade[];
  skipped: number;
};

function isExpired(
  candidate: TrialExpiryCandidate,
  now: Date,
): boolean {
  if (candidate.tier !== 'trial' || candidate.status !== 'trialing') {
    return false;
  }
  if (!candidate.trial_ends_at) {
    return false;
  }
  return new Date(candidate.trial_ends_at).getTime() <= now.getTime();
}

/**
 * Select expired trials to downgrade to Basic (Flow 9).
 * Idempotent: only trialing rows past trial_ends_at are returned.
 */
export function processTrialExpiry(options: {
  candidates: TrialExpiryCandidate[];
  now?: Date;
}): ProcessTrialExpiryResult {
  const now = options.now ?? new Date();
  const expired: TrialExpiryDowngrade[] = [];
  let skipped = 0;

  for (const candidate of options.candidates) {
    if (!isExpired(candidate, now)) {
      skipped += 1;
      continue;
    }

    expired.push({
      profileId: candidate.profile_id,
      trialEndsAt: candidate.trial_ends_at,
      fromTier: 'trial',
      toTier: 'basic',
      toStatus: 'active',
      event: 'trial_expired_downgrade',
    });
  }

  return { expired, skipped };
}
