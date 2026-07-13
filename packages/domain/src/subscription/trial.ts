import type { Subscription } from './schema.js';
import { trialDaysRemaining } from './rules.js';

/** Default days before trial end to send expiry warning (Flow 9 / OQ-9.2). */
export const DEFAULT_TRIAL_WARNING_DAYS_BEFORE = 3;

export const TRIAL_WARNING_SETTING_KEY = 'trial_warning_days_before';

/**
 * One trial per account: eligible when never activated (null subscription or unused).
 * After activation, trial_used_at is stamped and re-activation is blocked forever.
 */
export function canActivateTrial(
  subscription: Pick<Subscription, 'trialUsedAt'> | null,
): boolean {
  if (!subscription) {
    return true;
  }
  return subscription.trialUsedAt === null;
}

export function normalizeTrialWarningDays(raw: unknown): number {
  const value = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(value) || value < 1) {
    return DEFAULT_TRIAL_WARNING_DAYS_BEFORE;
  }
  return Math.floor(value);
}

/**
 * True when an active trial is within the warning window and has not been warned yet.
 * Window: 1..warningDaysBefore days remaining (Flow 9: default 3 days before expiry).
 */
export function shouldSendTrialExpiryWarning(options: {
  trialEndsAt: string | null;
  warningDaysBefore?: number;
  alreadyWarned?: boolean;
  now?: Date;
}): boolean {
  if (options.alreadyWarned) {
    return false;
  }
  if (!options.trialEndsAt) {
    return false;
  }
  const warningDays = normalizeTrialWarningDays(
    options.warningDaysBefore ?? DEFAULT_TRIAL_WARNING_DAYS_BEFORE,
  );
  const remaining = trialDaysRemaining(options.trialEndsAt, options.now ?? new Date());
  return remaining > 0 && remaining <= warningDays;
}
