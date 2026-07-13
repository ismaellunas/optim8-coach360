/** Self-contained STORY-4.2 warning selection for Deno edge + vitest. */

export const DEFAULT_TRIAL_WARNING_DAYS_BEFORE = 3;

export type TrialWarningCandidate = {
  profile_id: string;
  trial_ends_at: string;
  days_remaining?: number;
};

export type TrialWarningEnqueue = {
  profileId: string;
  trialEndsAt: string;
  daysRemaining: number;
  event: 'trial_expiry_warning';
};

export type ProcessTrialExpiryWarningsResult = {
  warningDaysBefore: number;
  sent: TrialWarningEnqueue[];
  skipped: number;
};

function normalizeWarningDays(raw: unknown): number {
  const value = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(value) || value < 1) {
    return DEFAULT_TRIAL_WARNING_DAYS_BEFORE;
  }
  return Math.floor(value);
}

function daysRemaining(trialEndsAt: string, now: Date): number {
  const end = new Date(trialEndsAt);
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

/**
 * Enqueue once per profile/trial_ends_at when remaining days are within
 * the admin-configured window (default 3 days before expiry).
 */
export function processTrialExpiryWarnings(options: {
  candidates: TrialWarningCandidate[];
  warningDaysBefore?: number;
  alreadyWarnedKeys?: Iterable<string>;
  now?: Date;
}): ProcessTrialExpiryWarningsResult {
  const warningDaysBefore = normalizeWarningDays(
    options.warningDaysBefore ?? DEFAULT_TRIAL_WARNING_DAYS_BEFORE,
  );
  const warned = new Set(options.alreadyWarnedKeys ?? []);
  const now = options.now ?? new Date();
  const sent: TrialWarningEnqueue[] = [];
  let skipped = 0;

  for (const candidate of options.candidates) {
    const key = `${candidate.profile_id}:${candidate.trial_ends_at}`;
    if (warned.has(key) || !candidate.trial_ends_at) {
      skipped += 1;
      continue;
    }

    const remaining = daysRemaining(candidate.trial_ends_at, now);
    if (remaining <= 0 || remaining > warningDaysBefore) {
      skipped += 1;
      continue;
    }

    sent.push({
      profileId: candidate.profile_id,
      trialEndsAt: candidate.trial_ends_at,
      daysRemaining: remaining,
      event: 'trial_expiry_warning',
    });
    warned.add(key);
  }

  return { warningDaysBefore, sent, skipped };
}
