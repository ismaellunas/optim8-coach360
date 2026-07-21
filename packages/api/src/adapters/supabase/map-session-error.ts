import { ZodError } from 'zod';
import {
  formatSessionValidationError,
  looksLikeZodIssueDump,
  mapSessionValidationMessage,
} from '@coach360/domain';

type SessionErrorAction = 'load' | 'create' | 'update' | 'cancel';

function tryParseZodIssueDump(message: string): string | null {
  if (!looksLikeZodIssueDump(message)) {
    return null;
  }
  try {
    const issues = JSON.parse(message) as Array<{ message?: string; path?: PropertyKey[] }>;
    if (!Array.isArray(issues) || issues.length === 0) {
      return null;
    }
    return preferMappedMessages(
      issues.map((issue) => mapSessionValidationMessage(String(issue.message ?? ''))),
    );
  } catch {
    return mapSessionValidationMessage(message);
  }
}

function preferMappedMessages(messages: string[]): string {
  const unique = [...new Set(messages.filter(Boolean))];
  const teamMsg = mapSessionValidationMessage('team_session_requires_team');
  const playerMsg = mapSessionValidationMessage('individual_session_requires_player');
  const generic = mapSessionValidationMessage('session_recipient_required');
  const filtered =
    unique.includes(teamMsg) || unique.includes(playerMsg)
      ? unique.filter((message) => message !== generic)
      : unique;
  return filtered.join(' ') || 'Check the required fields and try again.';
}

export function mapSessionError(error: unknown, action: SessionErrorAction = 'create'): Error {
  if (error instanceof ZodError) {
    return new Error(formatSessionValidationError(error));
  }

  const raw = error instanceof Error ? error.message : String(error ?? '');
  if (
    /^(Select |Enter |Choose |Check |We could not )/i.test(raw) &&
    !looksLikeZodIssueDump(raw)
  ) {
    return error instanceof Error ? error : new Error(raw);
  }

  const fromDump = tryParseZodIssueDump(raw);
  if (fromDump) {
    return new Error(fromDump);
  }

  if (raw.includes('team_session_requires_team') || raw.includes('session_recipient_required')) {
    return new Error(mapSessionValidationMessage('team_session_requires_team'));
  }
  if (raw.includes('individual_session_requires_player')) {
    return new Error(mapSessionValidationMessage('individual_session_requires_player'));
  }

  if (action === 'load') {
    return new Error('We could not load your schedule. Check your connection and try again.');
  }
  if (action === 'cancel') {
    return new Error('We could not cancel this session. Please try again.');
  }
  if (action === 'update') {
    return new Error('We could not save your session changes. Check the required fields and try again.');
  }
  return new Error('We could not create this session. Check the required fields and try again.');
}
