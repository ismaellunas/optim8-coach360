// STORY-6.1 — Create and edit practice sessions.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  SESSION_MVP_TYPES,
  canCreateIndividualSession,
  canCreateTeamSession,
  canEditSession,
  sessionInputSchema,
} from '@coach360/domain';
import { REPO_ROOT } from '../helpers/supabase-test-env.js';

const ACCESS_PATH = path.join(REPO_ROOT, 'packages', 'domain', 'src', 'session', 'access.ts');
const SCHEMA_PATH = path.join(REPO_ROOT, 'packages', 'domain', 'src', 'session', 'schema.ts');
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
const APP_PATH = path.join(REPO_ROOT, 'apps', 'mobile', 'src', 'App.jsx');
const REPO_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'adapters',
  'supabase',
  'supabase-session-repository.ts',
);
const SQL_RECIPIENT_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260720150000_session_recipients_status.sql',
);
const SQL_RBAC_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260720150100_session_team_manager_rbac.sql',
);
const NOTIFICATION_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'ports',
  'notification-repository.ts',
);
const MAPPER_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'adapters',
  'supabase',
  'mappers',
  'session-mapper.ts',
);
const MANUAL_TEST_PACK_PATH = path.join(REPO_ROOT, 'docs', 'mobile-app-test-pack.md');

describe('STORY_6_1 AC1 — coach creates session with date, time, and type', () => {
  it('test_STORY_6_1_AC1_coach_creates_session_with_datetime_and_type: schema, repo, and UI wire create flow', () => {
    const parsed = sessionInputSchema.parse({
      title: 'Ball Handling',
      scheduledAt: '2026-07-21T08:00:00.000Z',
      durationMinutes: 60,
      sessionType: 'practice',
      teamId: '11111111-1111-1111-8111-111111111111',
      playerId: null,
    });
    expect(parsed.sessionType).toBe('practice');
    expect(parsed.scheduledAt).toBe('2026-07-21T08:00:00.000Z');

    const ui = readFileSync(UI_PATH, 'utf8');
    expect(ui).toMatch(/type="date"/);
    expect(ui).toMatch(/type="time"/);
    expect(ui).toMatch(/repos\.sessions\.createSession/);

    const repo = readFileSync(REPO_PATH, 'utf8');
    expect(repo).toMatch(/async createSession/);
    expect(repo).toMatch(/from\('sessions'\)/);

    const app = readFileSync(APP_PATH, 'utf8');
    expect(app).toMatch(/import \{ ScheduleScreen \} from "\.\/features\/schedule\/ui\/ScheduleScreen\.jsx"/);
  });
});

describe('STORY_6_1 AC2 — team manager at Advanced+ can create team sessions', () => {
  it('test_STORY_6_1_AC2_team_manager_advanced_creates_team_session: access helpers and SQL allow team-only TM create', () => {
    expect(canCreateTeamSession('team_manager', { tier: 'advanced', status: 'active' })).toBe(true);
    expect(canCreateTeamSession('team_manager', { tier: 'basic', status: 'active' })).toBe(false);
    expect(canCreateIndividualSession('team_manager', { tier: 'pro', status: 'active' })).toBe(
      false,
    );

    const access = readFileSync(ACCESS_PATH, 'utf8');
    expect(access).toMatch(/canCreateTeamSession/);
    expect(access).toMatch(/team manager Advanced\+/);
    expect(access).toMatch(/canCreateIndividualSession/);

    const sql = readFileSync(SQL_RBAC_PATH, 'utf8');
    expect(sql).toMatch(/when p_feature = 'createSession' and v_role = 'team_manager' then 'advanced'/);
    expect(sql).toMatch(/team_id is not null/);
    expect(sql).toMatch(/and player_id is null/);
    expect(sql).toMatch(/role = 'coach'/);
  });
});

describe('STORY_6_1 AC3 — session types include practice, film review, and 1-on-1', () => {
  it('test_STORY_6_1_AC3_mvp_session_types_available: domain list and UI expose the MVP types', () => {
    expect(SESSION_MVP_TYPES).toEqual([
      { value: 'practice', label: 'Practice' },
      { value: 'film', label: 'Film review' },
      { value: 'individual', label: '1-on-1' },
    ]);

    const schema = readFileSync(SCHEMA_PATH, 'utf8');
    expect(schema).toMatch(/z\.enum\(\['practice', 'film', 'individual'\]\)/);

    const ui = readFileSync(UI_PATH, 'utf8');
    expect(ui).toMatch(/SESSION_MVP_TYPES/);
    expect(ui).toMatch(/sessionTypeLabel/);
    expect(ui).toMatch(/entry\.label/);
  });
});

describe('STORY_6_1 AC4 — sessions persist with team or individual recipient linkage', () => {
  it('test_STORY_6_1_AC4_session_persists_with_recipient_linkage: schema and SQL enforce one recipient target', () => {
    const teamSession = sessionInputSchema.parse({
      title: 'Team Practice',
      scheduledAt: '2026-07-21T08:00:00.000Z',
      durationMinutes: 60,
      sessionType: 'practice',
      teamId: '11111111-1111-1111-8111-111111111111',
      playerId: null,
    });
    expect(teamSession.teamId).toBeTruthy();

    const individualSession = sessionInputSchema.parse({
      title: '1-on-1 Film',
      scheduledAt: '2026-07-21T08:00:00.000Z',
      durationMinutes: 60,
      sessionType: 'individual',
      teamId: null,
      playerId: '22222222-2222-2222-8222-222222222222',
    });
    expect(individualSession.playerId).toBeTruthy();

    expect(() =>
      sessionInputSchema.parse({
        title: 'Broken',
        scheduledAt: '2026-07-21T08:00:00.000Z',
        durationMinutes: 60,
        sessionType: 'practice',
        teamId: null,
        playerId: null,
      }),
    ).toThrow(/session_recipient_required|team_session_requires_team/);

    const sql = readFileSync(SQL_RECIPIENT_PATH, 'utf8');
    expect(sql).toMatch(/add column if not exists player_id uuid/);
    expect(sql).toMatch(/sessions_single_recipient_check/);
    expect(sql).toMatch(/player_id = auth\.uid\(\)/);
  });
});

describe('STORY_6_1 AC5 — edit and cancel flows update notifications', () => {
  it('test_STORY_6_1_AC5_edit_cancel_enqueue_notifications: UI and notification port cover update and cancel events', () => {
    expect(existsSync(NOTIFICATION_PATH)).toBe(true);
    const notifications = readFileSync(NOTIFICATION_PATH, 'utf8');
    expect(notifications).toMatch(/SessionNotificationEvent = 'session_updated' \| 'session_cancelled'/);
    expect(notifications).toMatch(/enqueueSessionChange/);

    const ui = readFileSync(UI_PATH, 'utf8');
    expect(ui).toMatch(/repos\.sessions\.updateSession/);
    expect(ui).toMatch(/repos\.sessions\.cancelSession/);
    expect(ui).toMatch(/event: 'session_updated'/);
    expect(ui).toMatch(/event: 'session_cancelled'/);
    expect(ui).toMatch(/Cancel session/);
  });
});

describe('STORY_6_1 regression — manual QA bugs from Epic 6', () => {
  const coachId = '11111111-1111-1111-8111-111111111111';
  const playerId = '22222222-2222-2222-8222-222222222222';
  const session = { coachId };

  it('test_STORY_6_1_REGRESSION_session_load_omits_missing_status_column: mapper matches DB schema', () => {
    const mapper = readFileSync(MAPPER_PATH, 'utf8');
    expect(mapper).toMatch(/status: 'scheduled'/);
    expect(mapper).not.toMatch(/session_type, status, created_at/);
    expect(mapper).toMatch(
      /session_type, created_at, updated_at/,
    );

    const repo = readFileSync(REPO_PATH, 'utf8');
    expect(repo).not.toMatch(/status: 'scheduled'/);
  });

  it('test_STORY_6_1_REGRESSION_create_button_uses_user_subscription: ScheduleScreen tier gating wired', () => {
    const ui = readFileSync(UI_PATH, 'utf8');
    expect(ui).toMatch(/subscriptionFromLegacyUser/);
    expect(ui).toMatch(/showCreateAction/);
    expect(ui).toMatch(/tryA\('createSession'/);
    expect(ui).toMatch(/const \{ session \} = useAuth\(\)/);
    expect(ui).not.toMatch(/const \{ session, subscription \} = useAuth\(\)/);
  });

  it('test_STORY_6_1_REGRESSION_player_session_view_read_only: players cannot edit sessions', () => {
    expect(canEditSession('player', session, playerId)).toBe(false);
    expect(canEditSession('coach', session, coachId)).toBe(true);
    expect(canEditSession('coach', session, playerId)).toBe(false);

    const ui = readFileSync(UI_PATH, 'utf8');
    expect(ui).toMatch(/canEditSession/);
    expect(ui).toMatch(/SESSION DETAILS/);
    expect(ui).toMatch(/readOnly/);
    expect(ui).toMatch(/viewingSession/);
  });

  it('test_STORY_6_1_REGRESSION_manual_test_pack_covers_epic_6: docs include Epic 6 schedule cases', () => {
    const manual = readFileSync(MANUAL_TEST_PACK_PATH, 'utf8');
    const htmlPath = path.join(REPO_ROOT, 'docs', 'mobile-app-test-pack.html');
    const html = readFileSync(htmlPath, 'utf8');
    expect(manual).toMatch(/Epic 6 — Session Scheduling \(STORY-6\.1\)/);
    expect(manual).toMatch(/E6-T1: Schedule tab loads without error/);
    expect(manual).toMatch(/session_load_failed/);
    expect(manual).toMatch(/E6-T7: Player views session read-only/);
    expect(manual).toMatch(/E6-T2: Coach sees \*\*\+ Add Session\*\*/);
    expect(html).toMatch(/Epic 6 — Session Scheduling \(STORY-6\.1\)/);
    expect(html).toMatch(/E6-T7: Player views session read-only/);
  });
});
