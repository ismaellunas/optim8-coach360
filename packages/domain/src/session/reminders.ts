/**
 * STORY-6.3 / Q 3.7 — session reminder timing.
 * Default 24 hours before start; admin-configurable via platform_settings.
 */

export const DEFAULT_SESSION_REMINDER_HOURS_BEFORE = 24;

export const SESSION_REMINDER_SETTING_KEY = 'session_reminder_hours_before';

export function normalizeSessionReminderHours(raw: unknown): number {
  const value = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(value) || value < 1) {
    return DEFAULT_SESSION_REMINDER_HOURS_BEFORE;
  }
  return Math.floor(value);
}

/**
 * True when a scheduled session is within the reminder window and has not
 * been reminded yet. Window: 0 < hoursRemaining <= reminderHoursBefore.
 */
export function shouldSendSessionReminder(options: {
  scheduledAt: string;
  reminderHoursBefore?: number;
  alreadyReminded?: boolean;
  now?: Date;
}): boolean {
  if (options.alreadyReminded) {
    return false;
  }
  if (!options.scheduledAt) {
    return false;
  }
  const reminderHours = normalizeSessionReminderHours(
    options.reminderHoursBefore ?? DEFAULT_SESSION_REMINDER_HOURS_BEFORE,
  );
  const scheduled = new Date(options.scheduledAt);
  const now = options.now ?? new Date();
  const hoursRemaining = (scheduled.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursRemaining > 0 && hoursRemaining <= reminderHours;
}

/** Non-cancelled sessions with scheduledAt at or after `now`. */
export function filterUpcomingSessions<T extends { scheduledAt: string; status?: string }>(
  sessions: readonly T[],
  now: Date = new Date(),
): T[] {
  const cutoff = now.getTime();
  return sessions.filter((entry) => {
    if (entry.status === 'cancelled') {
      return false;
    }
    return new Date(entry.scheduledAt).getTime() >= cutoff;
  });
}
