/**
 * STORY-12.4 AC-2 — chat moderation helpers for admin hide/restore.
 */

const MAX_REASON_LENGTH = 500;

/** Trim and cap a moderation reason; empty input becomes null. */
export function normalizeModerationReason(reason: string | null | undefined): string | null {
  if (reason == null) return null;
  const trimmed = reason.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_REASON_LENGTH);
}

/**
 * Body shown for a message after moderation. Hidden messages keep a
 * placeholder so channel history length is preserved without leaking content.
 */
export function moderatedMessageBody(
  body: string,
  hiddenAt: string | null | undefined,
): string {
  if (hiddenAt) {
    return '[Message removed by moderator]';
  }
  return body;
}

export type AdminChatChannel = {
  id: string;
  type: string;
  teamId: string | null;
  title: string;
  messageCount: number;
  lastAt: string | null;
};

export type AdminChatMessage = {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string | null;
  body: string;
  messageType: string;
  createdAt: string;
  hiddenAt: string | null;
  hiddenBy: string | null;
  hiddenReason: string | null;
};
