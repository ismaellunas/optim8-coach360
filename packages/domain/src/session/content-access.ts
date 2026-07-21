import type { Session } from './schema.js';

/**
 * STORY-7.1 / OQ-3.1 — calendar-only sessions: content is accessible when the
 * session appears on the player's shared schedule (today or later, not cancelled).
 * No in-session runtime gate.
 */
export function canAccessSessionContent(
  session: Pick<Session, 'status' | 'scheduledAt'>,
  now: Date = new Date(),
): boolean {
  if (session.status === 'cancelled') {
    return false;
  }
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return new Date(session.scheduledAt).getTime() >= startOfToday.getTime();
}

export function sessionContentAccessMessage(
  session: Pick<Session, 'status' | 'scheduledAt'>,
  now: Date = new Date(),
): string | null {
  if (canAccessSessionContent(session, now)) {
    return null;
  }
  if (session.status === 'cancelled') {
    return 'This session was cancelled.';
  }
  return 'Content unlocks on the session day.';
}
