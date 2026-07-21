// STORY-6.3 — Share schedule and notify recipients (Q 3.7: immediate + 24h reminder).

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SESSION_REMINDER_HOURS_BEFORE,
  FEATURE_TIER_REQUIREMENTS,
  SESSION_REMINDER_SETTING_KEY,
  canViewSharedSchedule,
  filterUpcomingSessions,
  normalizeSessionReminderHours,
  sessionInputSchema,
  shouldSendSessionReminder,
} from '@coach360/domain';
import { ConsoleNotificationRepository } from '../../packages/api/src/adapters/console/console-notification-repository.ts';
import { processSessionReminders } from '../../supabase/functions/session-reminders/handler.ts';
import { REPO_ROOT } from '../helpers/supabase-test-env.js';

const UI_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'schedule',
  'ui',
  'ScheduleScreen.jsx',
);
const NOTIFICATION_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'ports',
  'notification-repository.ts',
);
const ACCESS_PATH = path.join(REPO_ROOT, 'packages', 'domain', 'src', 'session', 'access.ts');
const REMINDERS_PATH = path.join(REPO_ROOT, 'packages', 'domain', 'src', 'session', 'reminders.ts');
const PAYWALL_PATH = path.join(REPO_ROOT, 'packages', 'domain', 'src', 'subscription', 'paywall.ts');
const SQL_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260721120000_session_reminder_settings.sql',
);
const STAKEHOLDER_PATH = path.join(REPO_ROOT, 'docs', 'product', 'stakeholder-questions.md');

describe('STORY_6_3 AC1 — share to full team roster or individual player selectable', () => {
  it('test_STORY_6_3_AC1_share_team_or_individual_selectable: form and schema enforce mutually exclusive recipients', () => {
    const teamSession = sessionInputSchema.parse({
      title: 'Team Practice',
      scheduledAt: '2026-07-22T08:00:00.000Z',
      durationMinutes: 60,
      sessionType: 'practice',
      teamId: '11111111-1111-1111-8111-111111111111',
      playerId: null,
    });
    expect(teamSession.teamId).toBeTruthy();
    expect(teamSession.playerId).toBeNull();

    const individual = sessionInputSchema.parse({
      title: '1-on-1',
      scheduledAt: '2026-07-22T09:00:00.000Z',
      durationMinutes: 45,
      sessionType: 'individual',
      teamId: null,
      playerId: '22222222-2222-2222-8222-222222222222',
    });
    expect(individual.playerId).toBeTruthy();
    expect(individual.teamId).toBeNull();

    const ui = readFileSync(UI_PATH, 'utf8');
    expect(ui).toMatch(/Share with/);
    expect(ui).toMatch(/Team \(full roster\)/);
    expect(ui).toMatch(/Individual player/);
    expect(ui).toMatch(/data-testid="share-recipient-team"/);
    expect(ui).toMatch(/data-testid="share-recipient-player"/);
  });
});

describe('STORY_6_3 AC2 — recipients receive push on session create/update', () => {
  it('test_STORY_6_3_AC2_push_enqueued_on_create_and_update: port and UI enqueue create and update', () => {
    const notifications = readFileSync(NOTIFICATION_PATH, 'utf8');
    expect(notifications).toMatch(/session_created/);
    expect(notifications).toMatch(/session_updated/);
    expect(notifications).toMatch(/enqueueSessionChange/);

    const ui = readFileSync(UI_PATH, 'utf8');
    expect(ui).toMatch(/event: 'session_created'/);
    expect(ui).toMatch(/event: 'session_updated'/);
    expect(ui).toMatch(/repos\.notifications\.enqueueSessionChange/);

    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const repo = new ConsoleNotificationRepository();
    repo.enqueueSessionChange({
      sessionId: '00000000-0000-4000-8000-000000000001',
      coachId: '00000000-0000-4000-8000-000000000002',
      teamId: '00000000-0000-4000-8000-000000000003',
      playerId: null,
      triggeredBy: '00000000-0000-4000-8000-000000000002',
      event: 'session_created',
    });
    expect(debug).toHaveBeenCalledWith(
      '[notifications]',
      'session_created',
      expect.objectContaining({ event: 'session_created' }),
    );
    debug.mockRestore();
  });
});

describe('STORY_6_3 AC3 — in-app schedule shows upcoming for players at Basic+', () => {
  it('test_STORY_6_3_AC3_player_basic_sees_upcoming_schedule: Basic+ gate, paywall, upcoming filter', () => {
    expect(FEATURE_TIER_REQUIREMENTS.viewSchedule).toEqual({ player: 'basic' });
    expect(canViewSharedSchedule('player', { tier: 'basic', status: 'active' })).toBe(true);
    expect(canViewSharedSchedule('player', { tier: 'advanced', status: 'active' })).toBe(true);
    expect(canViewSharedSchedule('coach', { tier: 'basic', status: 'active' })).toBe(true);

    const access = readFileSync(ACCESS_PATH, 'utf8');
    expect(access).toMatch(/canViewSharedSchedule/);

    const paywall = readFileSync(PAYWALL_PATH, 'utf8');
    expect(paywall).toMatch(/viewSchedule:\s*\{\s*player:\s*'basic'/);

    const now = new Date(2026, 6, 21, 12, 0, 0);
    const upcoming = filterUpcomingSessions(
      [
        { id: 'past', scheduledAt: new Date(2026, 6, 19, 8, 0, 0).toISOString(), status: 'scheduled' },
        { id: 'today', scheduledAt: new Date(2026, 6, 21, 8, 0, 0).toISOString(), status: 'scheduled' },
        { id: 'soon', scheduledAt: new Date(2026, 6, 22, 8, 0, 0).toISOString(), status: 'scheduled' },
        { id: 'gone', scheduledAt: new Date(2026, 6, 23, 8, 0, 0).toISOString(), status: 'cancelled' },
      ],
      now,
    );
    expect(upcoming.map((entry) => entry.id)).toEqual(['today', 'soon']);

    const ui = readFileSync(UI_PATH, 'utf8');
    expect(ui).toMatch(/canViewSharedSchedule/);
    expect(ui).toMatch(/filterUpcomingSessions/);
    expect(ui).toMatch(/tryA\('viewSchedule'/);
    expect(ui).toMatch(/schedule-paywall/);
  });
});

describe('STORY_6_3 AC4 — reminder notifications configurable', () => {
  it('test_STORY_6_3_AC4_reminder_timing_configurable: 24h default, settings key, enqueue path', () => {
    expect(DEFAULT_SESSION_REMINDER_HOURS_BEFORE).toBe(24);
    expect(SESSION_REMINDER_SETTING_KEY).toBe('session_reminder_hours_before');
    expect(normalizeSessionReminderHours(48)).toBe(48);
    expect(normalizeSessionReminderHours(0)).toBe(24);

    const now = new Date('2026-07-21T12:00:00.000Z');
    expect(
      shouldSendSessionReminder({
        scheduledAt: '2026-07-22T10:00:00.000Z',
        reminderHoursBefore: 24,
        now,
      }),
    ).toBe(true);
    expect(
      shouldSendSessionReminder({
        scheduledAt: '2026-07-25T10:00:00.000Z',
        reminderHoursBefore: 24,
        now,
      }),
    ).toBe(false);

    const reminders = readFileSync(REMINDERS_PATH, 'utf8');
    expect(reminders).toMatch(/DEFAULT_SESSION_REMINDER_HOURS_BEFORE = 24/);
    expect(reminders).toMatch(/SESSION_REMINDER_SETTING_KEY/);

    const sql = readFileSync(SQL_PATH, 'utf8');
    expect(sql).toMatch(/session_reminder_hours_before/);
    expect(sql).toMatch(/'24'/);

    const notifications = readFileSync(NOTIFICATION_PATH, 'utf8');
    expect(notifications).toMatch(/enqueueSessionReminder/);
    expect(notifications).toMatch(/session_reminder/);

    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const repo = new ConsoleNotificationRepository();
    repo.enqueueSessionReminder({
      sessionId: '00000000-0000-4000-8000-000000000001',
      coachId: '00000000-0000-4000-8000-000000000002',
      teamId: null,
      playerId: '00000000-0000-4000-8000-000000000003',
      scheduledAt: '2026-07-22T10:00:00.000Z',
      reminderHoursBefore: 24,
      event: 'session_reminder',
    });
    expect(debug).toHaveBeenCalledWith(
      '[notifications]',
      'session_reminder',
      expect.objectContaining({ reminderHoursBefore: 24 }),
    );
    debug.mockRestore();

    const processed = processSessionReminders({
      candidates: [
        {
          session_id: '00000000-0000-4000-8000-000000000001',
          coach_id: '00000000-0000-4000-8000-000000000002',
          team_id: null,
          player_id: '00000000-0000-4000-8000-000000000003',
          scheduled_at: '2026-07-22T10:00:00.000Z',
        },
      ],
      reminderHoursBefore: 24,
      now: new Date('2026-07-21T12:00:00.000Z'),
    });
    expect(processed.sent).toHaveLength(1);
    expect(processed.reminderHoursBefore).toBe(24);

    const stakeholder = readFileSync(STAKEHOLDER_PATH, 'utf8');
    expect(stakeholder).toMatch(/24 hours/);
    expect(stakeholder).toMatch(/session_reminder_hours_before/);
  });
});
