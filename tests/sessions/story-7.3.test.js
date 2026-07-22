// STORY-7.3 — Coach progress review and feedback loop

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildCorrectiveSessionInput,
  coachProgressFeaturesForAccess,
  featureAccessLevel,
  filterCoachCompletions,
  formatCompletionLabel,
  parseSessionContentKey,
} from '@coach360/domain';
import { REPO_ROOT } from '../helpers/supabase-test-env.js';

const COACH_PROGRESS_SCREEN_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'progress',
  'ui',
  'CoachProgressReviewScreen.jsx',
);
const CHAT_SCREEN_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'chat',
  'ui',
  'ChatScreen.jsx',
);
const APP_PATH = path.join(REPO_ROOT, 'apps', 'mobile', 'src', 'App.jsx');
const SCHEDULE_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'schedule',
  'ui',
  'ScheduleScreen.jsx',
);
const COACH_PROGRESS_DOMAIN_PATH = path.join(
  REPO_ROOT,
  'packages',
  'domain',
  'src',
  'session',
  'coach-progress.ts',
);
const SESSION_CONTENT_PORT_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'ports',
  'session-content-repository.ts',
);
const SESSION_CONTENT_REPO_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'adapters',
  'supabase',
  'supabase-session-content-repository.ts',
);
const MESSAGING_PORT_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'ports',
  'messaging-repository.ts',
);
const MESSAGING_REPO_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'adapters',
  'supabase',
  'supabase-messaging-repository.ts',
);
const DIRECT_MESSAGES_SQL_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260721170000_coach_feedback_messages.sql',
);
const RESOLVE_NAMES_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'progress',
  'lib',
  'resolve-player-display-names.js',
);
const CREATE_REPOS_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'di',
  'create-repositories.ts',
);

const sampleCompletion = {
  sessionId: 's1',
  playerId: 'p1',
  contentKey: 'drill:library:abc12345',
  completedAt: '2026-07-20T12:00:00.000Z',
  reps: 40,
  durationSeconds: 600,
};

describe('STORY_7_3 AC1 — coach at Advanced+ views player progress dashboard', () => {
  it('test_STORY_7_3_AC1_coach_advanced_plus_views_player_progress_dashboard: gating and dashboard screen', () => {
    const domain = readFileSync(COACH_PROGRESS_DOMAIN_PATH, 'utf8');
    expect(domain).toMatch(/coachProgressFeaturesForAccess/);
    expect(domain).toMatch(/Flow 13/);

    expect(featureAccessLevel('coach', 'basic', 'viewProgress')).toBe('readonly');
    expect(featureAccessLevel('coach', 'advanced', 'viewProgress')).toBe('full');
    expect(featureAccessLevel('coach', 'pro', 'viewProgress')).toBe('full');
    expect(featureAccessLevel('coach', 'trial', 'viewProgress')).toBe('full');

    const fullFeatures = coachProgressFeaturesForAccess('full');
    expect(fullFeatures.canViewDashboard).toBe(true);

    const port = readFileSync(SESSION_CONTENT_PORT_PATH, 'utf8');
    expect(port).toMatch(/listCoachCompletions/);

    const repo = readFileSync(SESSION_CONTENT_REPO_PATH, 'utf8');
    expect(repo).toMatch(/async listCoachCompletions/);
    expect(repo).toMatch(/coach_completions_load_failed/);

    const screen = readFileSync(COACH_PROGRESS_SCREEN_PATH, 'utf8');
    expect(screen).toMatch(/data-testid="coach-progress-dashboard"/);
    expect(screen).toMatch(/listCoachCompletions/);
    expect(screen).toMatch(/resolvePlayerDisplayNames/);
    expect(screen).toMatch(/playerDisplayLabel/);

    const resolveNames = readFileSync(RESOLVE_NAMES_PATH, 'utf8');
    expect(resolveNames).toMatch(/member\.displayName/);
    expect(resolveNames).toMatch(/repos\.profiles\.getById/);
    expect(resolveNames).toMatch(/chatPeerDisplayLabel/);

    const app = readFileSync(APP_PATH, 'utf8');
    expect(app).toMatch(/CoachProgressReviewScreen/);
    expect(app).toMatch(/coach-home-player-progress/);
    expect(app).toMatch(/user\.role === "coach"/);
  });
});

describe('STORY_7_3 AC2 — drill completion list filterable by player and date range', () => {
  it('test_STORY_7_3_AC2_drill_completion_list_filterable_by_player_and_date: filter helper and UI controls', () => {
    const otherPlayer = {
      ...sampleCompletion,
      playerId: 'p2',
      completedAt: '2026-07-21T12:00:00.000Z',
    };
    const rows = [sampleCompletion, otherPlayer];

    expect(filterCoachCompletions(rows, { playerId: 'p1' })).toHaveLength(1);
    expect(
      filterCoachCompletions(rows, {
        from: '2026-07-21T00:00:00.000Z',
        to: '2026-07-21',
      }),
    ).toHaveLength(1);

    const screen = readFileSync(COACH_PROGRESS_SCREEN_PATH, 'utf8');
    expect(screen).toMatch(/filterCoachCompletions/);
    expect(screen).toMatch(/data-testid="coach-progress-player-filter"/);
    expect(screen).toMatch(/data-testid="coach-progress-date-from"/);
    expect(screen).toMatch(/data-testid="coach-progress-date-to"/);
    expect(screen).toMatch(/data-testid="coach-progress-completion-list"/);
  });
});

describe('STORY_7_3 AC3 — coach provides feedback via direct message', () => {
  it('test_STORY_7_3_AC3_coach_provides_feedback_via_direct_message: DM table, repo, and chat navigation', () => {
    const sql = readFileSync(DIRECT_MESSAGES_SQL_PATH, 'utf8');
    expect(sql).toMatch(/direct_messages/);
    expect(sql).toMatch(/direct_messages_participant_select/);
    expect(sql).toMatch(/direct_messages_participant_insert/);

    const port = readFileSync(MESSAGING_PORT_PATH, 'utf8');
    expect(port).toMatch(/sendDirectMessage/);
    expect(port).toMatch(/listDirectMessages/);

    const repo = readFileSync(MESSAGING_REPO_PATH, 'utf8');
    expect(repo).toMatch(/async sendDirectMessage/);
    expect(repo).toMatch(/direct_message_send_failed/);

    const createRepos = readFileSync(CREATE_REPOS_PATH, 'utf8');
    expect(createRepos).toMatch(/messaging:/);
    expect(createRepos).toMatch(/SupabaseMessagingRepository/);

    const coachScreen = readFileSync(COACH_PROGRESS_SCREEN_PATH, 'utf8');
    expect(coachScreen).toMatch(/data-testid="coach-send-feedback"/);
    expect(coachScreen).toMatch(/onSendFeedback/);

    const chat = readFileSync(CHAT_SCREEN_PATH, 'utf8');
    expect(chat).toMatch(/data-testid="direct-message-thread"/);
    expect(chat).toMatch(/data-testid="direct-message-send"/);
    expect(chat).toMatch(/sendDirectMessage/);
    expect(chat).toMatch(/resolvePlayerDisplayNames/);

    const app = readFileSync(APP_PATH, 'utf8');
    expect(app).toMatch(/pendingChatDm/);
    expect(app).toMatch(/onSendFeedback/);
  });
});

describe('STORY_7_3 AC4 — coach assigns corrective drills from review or via content share', () => {
  it('test_STORY_7_3_AC4_coach_assigns_corrective_drills_from_review_or_content_share: session assign paths', () => {
    const parsed = parseSessionContentKey('drill:library:drill-uuid-1');
    expect(parsed).toEqual({
      kind: 'drill',
      source: 'library',
      id: 'drill-uuid-1',
    });
    expect(formatCompletionLabel('drill:library:drill-uuid-1')).toMatch(/Drill/);

    const input = buildCorrectiveSessionInput('p1', 'drill:library:drill-uuid-1');
    expect(input?.sessionType).toBe('individual');
    expect(input?.playerId).toBe('p1');
    expect(input?.contentRefs?.[0]?.kind).toBe('drill');

    const coachScreen = readFileSync(COACH_PROGRESS_SCREEN_PATH, 'utf8');
    expect(coachScreen).toMatch(/buildCorrectiveSessionInput/);
    expect(coachScreen).toMatch(/data-testid="coach-assign-corrective-drill"/);
    expect(coachScreen).toMatch(/data-testid="coach-share-via-schedule"/);
    expect(coachScreen).toMatch(/createSession/);

    const schedule = readFileSync(SCHEDULE_PATH, 'utf8');
    expect(schedule).toMatch(/prefillCreate/);
    expect(schedule).toMatch(/buildCorrectiveSessionInput/);

    const app = readFileSync(APP_PATH, 'utf8');
    expect(app).toMatch(/schedulePrefill/);
    expect(app).toMatch(/onShareViaSchedule/);
  });
});
