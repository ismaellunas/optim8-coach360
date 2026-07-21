/** Self-contained STORY-6.3 reminder selection for Deno edge + vitest. */

export const DEFAULT_SESSION_REMINDER_HOURS_BEFORE = 24;

export type SessionReminderCandidate = {
  session_id: string;
  coach_id: string;
  team_id: string | null;
  player_id: string | null;
  scheduled_at: string;
};

export type SessionReminderEnqueue = {
  sessionId: string;
  coachId: string;
  teamId: string | null;
  playerId: string | null;
  scheduledAt: string;
  reminderHoursBefore: number;
  event: 'session_reminder';
};

export type ProcessSessionRemindersResult = {
  reminderHoursBefore: number;
  sent: SessionReminderEnqueue[];
  skipped: number;
};

function normalizeReminderHours(raw: unknown): number {
  const value = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(value) || value < 1) {
    return DEFAULT_SESSION_REMINDER_HOURS_BEFORE;
  }
  return Math.floor(value);
}

/**
 * Enqueue once per session when hours until start are within the
 * admin-configured window (default 24 hours before).
 */
export function processSessionReminders(options: {
  candidates: SessionReminderCandidate[];
  reminderHoursBefore?: number;
  alreadyRemindedIds?: Iterable<string>;
  now?: Date;
}): ProcessSessionRemindersResult {
  const reminderHoursBefore = normalizeReminderHours(
    options.reminderHoursBefore ?? DEFAULT_SESSION_REMINDER_HOURS_BEFORE,
  );
  const reminded = new Set(options.alreadyRemindedIds ?? []);
  const now = options.now ?? new Date();
  const sent: SessionReminderEnqueue[] = [];
  let skipped = 0;

  for (const candidate of options.candidates) {
    if (reminded.has(candidate.session_id) || !candidate.scheduled_at) {
      skipped += 1;
      continue;
    }

    const scheduled = new Date(candidate.scheduled_at);
    const hoursRemaining = (scheduled.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursRemaining <= 0 || hoursRemaining > reminderHoursBefore) {
      skipped += 1;
      continue;
    }

    sent.push({
      sessionId: candidate.session_id,
      coachId: candidate.coach_id,
      teamId: candidate.team_id,
      playerId: candidate.player_id,
      scheduledAt: candidate.scheduled_at,
      reminderHoursBefore,
      event: 'session_reminder',
    });
    reminded.add(candidate.session_id);
  }

  return { reminderHoursBefore, sent, skipped };
}
