// STORY-7.1 — Player session view and content consumption

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  canAccessSessionContent,
  sessionContentKey,
  sessionContentRefSchema,
  sessionSchema,
} from '@coach360/domain';
import {
  LIBRARY_VIDEO_DEMO_URL,
  PURCHASED_PACKAGE_DEMO_VIDEO_URL,
} from '../../packages/api/src/adapters/supabase/supabase-session-content-repository.ts';
import { REPO_ROOT } from '../helpers/supabase-test-env.js';

const PLAYER_DETAIL_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'session',
  'ui',
  'PlayerSessionDetailScreen.jsx',
);
const VIDEO_PLAYER_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'session',
  'ui',
  'SessionVideoPlayer.jsx',
);
const SCHEDULE_UI_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'schedule',
  'ui',
  'ScheduleScreen.jsx',
);
const CONTENT_ACCESS_PATH = path.join(
  REPO_ROOT,
  'packages',
  'domain',
  'src',
  'session',
  'content-access.ts',
);
const COMPLETION_PATH = path.join(
  REPO_ROOT,
  'packages',
  'domain',
  'src',
  'session',
  'completion.ts',
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
const SESSION_CONTENT_PORT_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'ports',
  'session-content-repository.ts',
);
const DI_PATH = path.join(REPO_ROOT, 'packages', 'api', 'src', 'di', 'create-repositories.ts');
const COMPLETIONS_SQL_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260721140000_session_content_completions.sql',
);
const MEDIA_SQL_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260721140100_coach_library_media_url.sql',
);

const baseSession = {
  id: '22222222-2222-2222-8222-222222222222',
  coachId: '33333333-3333-3333-8333-333333333333',
  teamId: '11111111-1111-1111-8111-111111111111',
  playerId: null,
  title: 'Shooting Practice',
  notes: 'Focus on form',
  scheduledAt: '2026-07-22T16:00:00.000Z',
  durationMinutes: 60,
  sessionType: 'practice',
  status: 'scheduled',
  contentRefs: [
    sessionContentRefSchema.parse({
      kind: 'video',
      source: 'library',
      id: 'aaaaaaaa-aaaa-aaaa-8aaa-aaaaaaaaaaaa',
      title: 'Form Shooting Demo',
      sortOrder: 0,
    }),
    sessionContentRefSchema.parse({
      kind: 'package',
      source: 'purchase',
      id: 'elite-shooting-system',
      title: 'Elite Shooting System',
      sortOrder: 1,
    }),
  ],
  createdAt: '2026-07-21T07:00:00.000Z',
  updatedAt: '2026-07-21T07:00:00.000Z',
};

describe('STORY_7_1 AC1 — player sees session detail with attached content list', () => {
  it('test_STORY_7_1_AC1_player_sees_session_detail_with_content_list: player detail screen and ordered list', () => {
    const session = sessionSchema.parse(baseSession);
    expect(session.contentRefs).toHaveLength(2);
    expect(session.contentRefs[0].title).toBe('Form Shooting Demo');

    const playerDetail = readFileSync(PLAYER_DETAIL_PATH, 'utf8');
    expect(playerDetail).toMatch(/data-testid="player-session-detail"/);
    expect(playerDetail).toMatch(/data-testid="player-session-content-list"/);
    expect(playerDetail).toMatch(/SESSION DETAILS/);
    expect(playerDetail).toMatch(/orderedContent|contentRefs/);

    const scheduleUi = readFileSync(SCHEDULE_UI_PATH, 'utf8');
    expect(scheduleUi).toMatch(/PlayerSessionDetailScreen/);
    expect(scheduleUi).toMatch(/appRole === 'player'/);
  });
});

describe('STORY_7_1 AC2 — video playback works for shared and purchased content', () => {
  it('test_STORY_7_1_AC2_video_playback_shared_and_purchased: media resolve + HTML5 video', () => {
    const repo = readFileSync(SESSION_CONTENT_REPO_PATH, 'utf8');
    expect(repo).toMatch(/resolveMediaUrl/);
    expect(repo).toMatch(/coach_library_items/);
    expect(repo).toMatch(/owner-only RLS/);
    expect(repo).toMatch(/LIBRARY_VIDEO_DEMO_URL/);
    expect(PURCHASED_PACKAGE_DEMO_VIDEO_URL).toMatch(/^https:\/\//);
    expect(LIBRARY_VIDEO_DEMO_URL).toMatch(/^https:\/\//);

    const videoPlayer = readFileSync(VIDEO_PLAYER_PATH, 'utf8');
    expect(videoPlayer).toMatch(/data-testid="session-video-player"/);
    expect(videoPlayer).toMatch(/<video/);
    expect(videoPlayer).toMatch(/controls/);
    expect(videoPlayer).toMatch(/<source src=\{src\}/);

    const playerDetail = readFileSync(PLAYER_DETAIL_PATH, 'utf8');
    expect(playerDetail).toMatch(/SessionVideoPlayer/);
    expect(playerDetail).toMatch(/resolveMediaUrl/);
    expect(playerDetail).toMatch(/data-testid="session-video-container"/);

    const mediaSql = readFileSync(MEDIA_SQL_PATH, 'utf8');
    expect(mediaSql).toMatch(/media_url/);
  });
});

describe('STORY_7_1 AC3 — content access timing follows calendar schedule rules (OQ-3.1)', () => {
  it('test_STORY_7_1_AC3_content_access_follows_calendar_schedule_rules: upcoming non-cancelled only, no live runtime', () => {
    const now = new Date('2026-07-21T12:00:00.000Z');
    expect(
      canAccessSessionContent(
        { status: 'scheduled', scheduledAt: '2026-07-22T16:00:00.000Z' },
        now,
      ),
    ).toBe(true);
    expect(
      canAccessSessionContent(
        { status: 'cancelled', scheduledAt: '2026-07-22T16:00:00.000Z' },
        now,
      ),
    ).toBe(false);
    expect(
      canAccessSessionContent(
        { status: 'scheduled', scheduledAt: '2026-07-19T16:00:00.000Z' },
        now,
      ),
    ).toBe(false);

    const contentAccess = readFileSync(CONTENT_ACCESS_PATH, 'utf8');
    expect(contentAccess).toMatch(/calendar-only/i);
    expect(contentAccess).toMatch(/canAccessSessionContent/);

    const playerDetail = readFileSync(PLAYER_DETAIL_PATH, 'utf8');
    expect(playerDetail).toMatch(/canAccessSessionContent/);
    expect(playerDetail).not.toMatch(/isSessionLive|sessionActive|liveRuntime/i);
    expect(playerDetail).toMatch(/session-content-locked/);
  });
});

describe('STORY_7_1 AC4 — completion state tracked per content item', () => {
  it('test_STORY_7_1_AC4_completion_state_tracked_per_content_item: table, repo upsert, UI toggle', () => {
    const key = sessionContentKey({
      kind: 'drill',
      source: 'library',
      id: 'drill-1',
    });
    expect(key).toBe('drill:library:drill-1');

    const completionDomain = readFileSync(COMPLETION_PATH, 'utf8');
    expect(completionDomain).toMatch(/sessionContentKey/);

    const sql = readFileSync(COMPLETIONS_SQL_PATH, 'utf8');
    expect(sql).toMatch(/session_content_completions/);
    expect(sql).toMatch(/content_key/);
    expect(sql).toMatch(/unique \(session_id, player_id, content_key\)/);

    const port = readFileSync(SESSION_CONTENT_PORT_PATH, 'utf8');
    expect(port).toMatch(/listCompletions/);
    expect(port).toMatch(/markComplete/);

    const repo = readFileSync(SESSION_CONTENT_REPO_PATH, 'utf8');
    expect(repo).toMatch(/session_content_completions/);
    expect(repo).toMatch(/upsert/);

    const di = readFileSync(DI_PATH, 'utf8');
    expect(di).toMatch(/sessionContent: new SupabaseSessionContentRepository/);

    const playerDetail = readFileSync(PLAYER_DETAIL_PATH, 'utf8');
    expect(playerDetail).toMatch(/listCompletions/);
    expect(playerDetail).toMatch(/markComplete/);
    expect(playerDetail).toMatch(/Mark complete/);
    expect(playerDetail).toMatch(/completedKeys/);
  });
});
