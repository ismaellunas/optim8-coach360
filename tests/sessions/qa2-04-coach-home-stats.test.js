// BUG-QA2-04 (coach slice) — Home stats bar for the coach role: wired to
// real data (teams, roster, upcoming sessions, drill completions) instead
// of hardcoded "34"/"4"/"128"/"57", and made clickable/linked. Player slice
// resolved under STORY-7.4, team slice under STORY-7.3; this closes the
// remaining coach slice.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../helpers/supabase-test-env.js';

const APP_PATH = path.join(REPO_ROOT, 'apps', 'mobile', 'src', 'App.jsx');

describe('QA2_04 (coach slice) — Home stats bar wired to real data and clickable', () => {
  it('test_QA2_04_coach_home_stats_no_longer_hardcoded', () => {
    const app = readFileSync(APP_PATH, 'utf8');

    expect(app).not.toMatch(/\{ l: "Players", v: "34"/);
    expect(app).not.toMatch(/\{ l: "Teams", v: "4"/);
    expect(app).not.toMatch(/\{ l: "Sessions", v: "128"/);
    expect(app).not.toMatch(/\{ l: "Drills", v: "57"/);
  });

  it('test_QA2_04_coach_home_stats_sourced_from_real_repos', () => {
    const app = readFileSync(APP_PATH, 'utf8');

    expect(app).toMatch(/loadCoachHomeData/);
    expect(app).toMatch(/repos\.teams\.listForUser\(playerId\)/);
    expect(app).toMatch(/repos\.sessions\.listForUser\(playerId\)/);
    expect(app).toMatch(/repos\.sessionContent\.listCoachCompletions\(\)/);
    expect(app).toMatch(/repos\.rosters\.listMembers\(team\.id\)/);
  });

  it('test_QA2_04_coach_home_stats_clickable_and_linked', () => {
    const app = readFileSync(APP_PATH, 'utf8');

    expect(app).toMatch(/v: String\(coachPlayersCount\), c: COLORS\.blue, onClick: function \(\) \{ go\("teams"\); \}, testId: "home-stat-players"/);
    expect(app).toMatch(/v: String\(coachTeamsCount\), c: COLORS\.green, onClick: function \(\) \{ go\("teams"\); \}, testId: "home-stat-teams"/);
    expect(app).toMatch(/v: String\(coachUpcomingSessions\.length\), c: COLORS\.purple, onClick: function \(\) \{ go\("schedule"\); \}, testId: "home-stat-sessions"/);
    expect(app).toMatch(/v: String\(coachDrillsCompleted\), c: COLORS\.orange, onClick: function \(\) \{ go\("progress"\); \}, testId: "home-stat-drills"/);
  });
});
