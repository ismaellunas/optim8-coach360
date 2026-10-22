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
const PROFILE_SCREEN_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'profile',
  'ui',
  'ProfileScreen.jsx',
);
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

  it('test_STORY_7_4_AC1_player_home_stats_goals_wired_rank_removed: Goals tile reads real objectives, Rank tile removed (QA3-01/QA3-03)', () => {
    const app = readFileSync(APP_PATH, 'utf8');
    expect(app).toMatch(/repos\.objectives\.listForUser\(playerId, user\.role\)/);
    expect(app).toMatch(/activeObjectivesCount/);
    expect(app).toMatch(/testId: "home-stat-goals"/);
    expect(app).toMatch(/data-testid=\{s\.testId\}/);
    expect(app).not.toMatch(/"Goals", v: "3\/5"/);
    expect(app).not.toMatch(/\{ l: "Rank", v: "#4"/);
  });

  it('test_STORY_7_4_AC1_player_home_stats_drills_wired_to_real_progress: Drills tile reads homeProgressSummary, not a literal', () => {
    const app = readFileSync(APP_PATH, 'utf8');
    expect(app).toMatch(/testId: "home-stat-drills"/);
    expect(app).toMatch(/String\(homeProgressSummary\.drillsCompleted\)/);
    expect(app).not.toMatch(/"Drills", v: "24"/);
  });

  it('test_STORY_7_4_AC1_player_home_ai_insights_copy_not_fabricated: player AI Insights copy is generic, not a specific fake stat', () => {
    const app = readFileSync(APP_PATH, 'utf8');
    expect(app).not.toMatch(/Your shooting accuracy improved 12% this week\./);
    expect(app).toMatch(/isPlayer \? "Insights based on your recent activity\." : /);
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

describe('STORY_7_4 Profile dead buttons — Edit Profile wired, Notifications marked coming soon (QA3-01/QA3-03)', () => {
  it('test_STORY_7_4_AC1_profile_edit_profile_wired_to_repository: Edit Profile toggles a real form wired to repos.profiles', () => {
    const profileScreen = readFileSync(PROFILE_SCREEN_PATH, 'utf8');
    expect(profileScreen).toMatch(/data-testid="profile-edit-trigger"/);
    expect(profileScreen).toMatch(/data-testid="profile-edit-form"/);
    expect(profileScreen).toMatch(/repos\.profiles\.getById\(userId\)/);
    expect(profileScreen).toMatch(/repos\.profiles\.updatePlayerProfile\(userId, \{/);
    expect(profileScreen).toMatch(/repos\.profiles\.updateCoachProfile\(userId, \{/);
    expect(profileScreen).toMatch(/repos\.profiles\.updateTeamManagerProfile\(userId, \{/);
    expect(profileScreen).not.toMatch(/<Card>\s*<span className="font-body text-sm text-coach-t1">Edit Profile<\/span>\s*<\/Card>/);
  });

  it('test_STORY_7_4_AC1_profile_notifications_coming_soon: Notifications is explicitly disabled, not a silent dead button', () => {
    const profileScreen = readFileSync(PROFILE_SCREEN_PATH, 'utf8');
    expect(profileScreen).toMatch(/data-testid="profile-notifications"/);
    expect(profileScreen).toMatch(/Coming soon/);
    expect(profileScreen).not.toMatch(/<Card>\s*<span className="font-body text-sm text-coach-t1">Notifications<\/span>\s*<\/Card>/);
  });
});
