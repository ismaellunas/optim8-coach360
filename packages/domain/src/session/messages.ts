import type { ZodError } from 'zod';

const MSG_RECIPIENT = 'Select a team or player for this session.';
const MSG_TEAM = 'Select a team for this session.';
const MSG_PLAYER = 'Select a player for this 1-on-1 session.';

const SESSION_VALIDATION_MESSAGES: Record<string, string> = {
  session_recipient_required: MSG_RECIPIENT,
  team_session_requires_team: MSG_TEAM,
  individual_session_requires_player: MSG_PLAYER,
};

const FIELD_FALLBACKS: Record<string, string> = {
  title: 'Enter a session title.',
  teamId: 'Select a team for this session.',
  playerId: 'Select a player for this 1-on-1 session.',
  scheduledAt: 'Choose a date and time.',
  sessionType: 'Choose a session type.',
  contentRefs: 'Check the attached session content and try again.',
};

/** Map a machine validation code (or raw Zod issue message) to user-facing copy. */
export function mapSessionValidationMessage(codeOrMessage: string): string {
  const trimmed = codeOrMessage.trim();
  if (SESSION_VALIDATION_MESSAGES[trimmed]) {
    return SESSION_VALIDATION_MESSAGES[trimmed];
  }
  for (const [code, message] of Object.entries(SESSION_VALIDATION_MESSAGES)) {
    if (trimmed.includes(code)) {
      return message;
    }
  }
  return trimmed;
}

function messageForIssue(issue: {
  message: string;
  path: PropertyKey[];
}): string {
  const coded = mapSessionValidationMessage(issue.message);
  if (coded !== issue.message.trim()) {
    return coded;
  }
  const field = String(issue.path[0] ?? '');
  if (FIELD_FALLBACKS[field]) {
    return FIELD_FALLBACKS[field];
  }
  return 'Check the highlighted fields and try again.';
}

/**
 * Prefer specific recipient messages over the generic "team or player" line
 * when both issues are present.
 */
function preferSpecificRecipientMessages(messages: string[]): string[] {
  const hasTeam = messages.includes(MSG_TEAM);
  const hasPlayer = messages.includes(MSG_PLAYER);
  if (!hasTeam && !hasPlayer) {
    return messages;
  }
  return messages.filter((message) => message !== MSG_RECIPIENT);
}

/** Turn Zod session validation into a short, field-focused user message. */
export function formatSessionValidationError(error: ZodError): string {
  const messages = preferSpecificRecipientMessages([
    ...new Set(error.issues.map((issue) => messageForIssue(issue))),
  ]);
  if (messages.length === 0) {
    return 'Check the required fields and try again.';
  }
  return messages.join(' ');
}

/** True when a thrown/stringified error looks like raw Zod issue JSON. */
export function looksLikeZodIssueDump(message: string): boolean {
  return (
    message.includes('"code"') &&
    message.includes('"path"') &&
    (message.includes('session_') || message.includes('invalid_type'))
  );
}
