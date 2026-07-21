// STORY-7.4 — Player profile and dashboard by tier

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  filterUpcomingSessions,
  playerProgressFeaturesForAccess,
  resolvedTierForFeatureRole,
  summarizePlayerProgress,
} from '@coach360/domain';
import { REPO_ROOT } from '../helpers/supabase-test-env.js';

const APP_PATH = path.join(REPO_ROOT, 'apps', 'mobile', 'src', 'App.jsx');
const PROTOTYPE_README_PATH = path.join(
  REPO_ROOT,
  'docs',
  'prototype',
  'README.md',
);

describe('STORY_7_4 AC1 — player home shows schedule summary and progress at minimum', () => {
  it('test_STORY_7_4_AC1_player_home_shows_real_schedule_summary_and_progress: home wired to real repos', () => {
    const upcoming = filterUpcomingSessions([
      { id: 's1', scheduledAt: new Date(Date.now() + 3600_000).toISOString(), status: 'scheduled' },
      { id: 's2', scheduledAt: new Date(Date.now() - 3600_000 * 48).toISOString(), status: 'scheduled' },
    ]);
    expect(upcoming).toHaveLength(1);
    expect(upcoming[0].id).toBe('s1');

    const summary = summarizePlayerProgress([
      {
        sessionId: 's1',
        playerId: 'p1',
        contentKey: 'drill:library:d1',
        completedAt: '2026-07-21T12:00:00.000Z',
        reps: 10,
        durationSeconds: 300,
      },
    ]);
    expect(summary.drillsCompleted).toBe(1);

    const app = readFileSync(APP_PATH, 'utf8');
    expect(app).toMatch(/data-testid="home-schedule-summary"/);
    expect(app).toMatch(/data-testid="home-next-session"/);
    expect(app).toMatch(/data-testid="home-progress-summary"/);
    expect(app).toMatch(/repos\.sessions\.listForUser\(playerId\)/);
    expect(app).toMatch(/repos\.sessionContent\.listPlayerProgress\(playerId\)/);
    expect(app).toMatch(/filterUpcomingSessions\(upcomingSessions\)/);
    expect(app).toMatch(/summarizePlayerProgress\(completions\)/);
    expect(app).not.toMatch(/Personal Training/);
  });
});

describe('STORY_7_4 AC2 — profile tabs for objectives and full dashboard gated per Pro tier', () => {
  it('test_STORY_7_4_AC2_objectives_and_full_dashboard_gated_pro: pro-only gates unchanged', () => {
    expect(resolvedTierForFeatureRole('objectives', 'player')).toBe('pro');
    expect(resolvedTierForFeatureRole('viewProgress', 'player')).toBe('basic');

    const app = readFileSync(APP_PATH, 'utf8');
    expect(app).toMatch(/canAccess\(user, "objectives"\)/);
    expect(app).toMatch(/homeProgressFeatures\.canViewFullDashboard/);
  });
});

describe('STORY_7_4 AC3 — partial dashboard at Basic shows limited stats per matrix', () => {
  it('test_STORY_7_4_AC3_basic_tier_partial_dashboard_on_home: readonly scope matches matrix', () => {
    const readonlyFeatures = playerProgressFeaturesForAccess('readonly');
    expect(readonlyFeatures.canViewCompletionCount).toBe(true);
    expect(readonlyFeatures.canViewFullDashboard).toBe(false);

    const fullFeatures = playerProgressFeaturesForAccess('full');
    expect(fullFeatures.canViewFullDashboard).toBe(true);

    const app = readFileSync(APP_PATH, 'utf8');
    expect(app).toMatch(/homeAccessLevel === "readonly"/);
    expect(app).toMatch(/Basic tier — upgrade to Pro for the full dashboard\./);
  });
});

describe('STORY_7_4 AC4 — scope of 6-tab profile confirmed against MVP decision', () => {
  it('test_STORY_7_4_AC4_six_tab_profile_scope_documented_out_of_mvp: prototype notes confirm scope', () => {
    const readme = readFileSync(PROTOTYPE_README_PATH, 'utf8');
    expect(readme).toMatch(/Player profile deep-dive \(6-tab\) not yet in mock/);
  });
});
