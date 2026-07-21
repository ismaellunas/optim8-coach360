import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import {
  formatSessionValidationError,
  mapSessionValidationMessage,
  sessionInputSchema,
} from '@coach360/domain';
import { mapSessionError } from '../../packages/api/src/adapters/supabase/map-session-error.js';

describe('session validation user messages', () => {
  it('maps machine codes to field-focused copy', () => {
    expect(mapSessionValidationMessage('team_session_requires_team')).toBe(
      'Select a team for this session.',
    );
    expect(mapSessionValidationMessage('individual_session_requires_player')).toBe(
      'Select a player for this 1-on-1 session.',
    );
  });

  it('formats Zod recipient failures without dumping JSON', () => {
    const parsed = sessionInputSchema.safeParse({
      title: 'Practice',
      scheduledAt: '2026-07-21T08:00:00.000Z',
      durationMinutes: 60,
      sessionType: 'practice',
      teamId: null,
      playerId: null,
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) {
      return;
    }
    const message = formatSessionValidationError(parsed.error);
    expect(message).toBe('Select a team for this session.');
    expect(message).not.toMatch(/session_recipient_required/);
    expect(message).not.toMatch(/"path"/);
  });

  it('mapSessionError turns Zod issue dumps into friendly copy', () => {
    const dump = JSON.stringify([
      { code: 'custom', message: 'session_recipient_required', path: ['teamId'] },
      { code: 'custom', message: 'team_session_requires_team', path: ['teamId'] },
    ]);
    expect(mapSessionError(new Error(dump), 'create').message).toBe(
      'Select a team for this session.',
    );
    expect(mapSessionError(new ZodError([]), 'create').message).toMatch(/required fields/i);
  });
});
