// STORY-9.4 — Private content distribution (Path A), roster-only (Q 12.6).

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  ALLOW_NON_ROSTER_CONTENT_DISTRIBUTION,
  assertPlayerOnRosterForDistribution,
  assignContentInputSchema,
  canDistributeToNonRosterPlayer,
} from '@coach360/domain';
import { ConsoleNotificationRepository } from '../../packages/api/src/adapters/console/console-notification-repository.ts';
import { REPO_ROOT } from '../helpers/supabase-test-env.js';

const DISTRIBUTE_UI = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'content',
  'ui',
  'DistributeContentScreen.jsx',
);
const LIBRARY_UI = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'content',
  'ui',
  'CoachLibraryScreen.jsx',
);
const PLAYER_CONTENT_UI = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'content',
  'ui',
  'PlayerContentScreen.jsx',
);
const APP_PATH = path.join(REPO_ROOT, 'apps', 'mobile', 'src', 'App.jsx');
const NOTIFICATION_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'ports',
  'notification-repository.ts',
);
const ASSIGNMENT_PORT = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'ports',
  'content-assignment-repository.ts',
);
const ASSIGNMENT_REPO = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'adapters',
  'supabase',
  'supabase-content-assignment-repository.ts',
);
const CREATE_REPOS = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'di',
  'create-repositories.ts',
);
const SQL_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260722200000_content_assignments_path_a.sql',
);
const DISTRIBUTION_PATH = path.join(
  REPO_ROOT,
  'packages',
  'domain',
  'src',
  'content',
  'distribution.ts',
);
const STAKEHOLDER_PATH = path.join(REPO_ROOT, 'docs', 'product', 'stakeholder-questions.md');

describe('STORY_9_4 AC1 — coach selects full team or individual roster player', () => {
  it('test_STORY_9_4_AC1_select_team_or_individual_recipient', () => {
    const team = assignContentInputSchema.parse({
      libraryItemId: '11111111-1111-4111-8111-111111111111',
      teamId: '22222222-2222-4222-8222-222222222222',
      playerId: null,
    });
    expect(team.teamId).toBeTruthy();
    expect(team.playerId).toBeNull();

    const individual = assignContentInputSchema.parse({
      libraryItemId: '11111111-1111-4111-8111-111111111111',
      teamId: null,
      playerId: '33333333-3333-4333-8333-333333333333',
    });
    expect(individual.playerId).toBeTruthy();
    expect(individual.teamId).toBeNull();

    expect(
      assignContentInputSchema.safeParse({
        libraryItemId: '11111111-1111-4111-8111-111111111111',
        teamId: null,
        playerId: null,
      }).success,
    ).toBe(false);

    const ui = readFileSync(DISTRIBUTE_UI, 'utf8');
    expect(ui).toMatch(/Share with/);
    expect(ui).toMatch(/Team \(full roster\)/);
    expect(ui).toMatch(/Individual player/);
    expect(ui).toMatch(/data-testid="share-recipient-team"/);
    expect(ui).toMatch(/data-testid="share-recipient-player"/);

    const library = readFileSync(LIBRARY_UI, 'utf8');
    expect(library).toMatch(/onDistribute/);
    expect(library).toMatch(/coach-library-distribute-/);
  });
});

describe('STORY_9_4 AC2 — recipients notified when content assigned', () => {
  it('test_STORY_9_4_AC2_notification_enqueued_on_assign', () => {
    const notifications = readFileSync(NOTIFICATION_PATH, 'utf8');
    expect(notifications).toMatch(/content_assigned/);
    expect(notifications).toMatch(/enqueueContentAssigned/);

    const ui = readFileSync(DISTRIBUTE_UI, 'utf8');
    expect(ui).toMatch(/event: 'content_assigned'/);
    expect(ui).toMatch(/repos\.notifications\.enqueueContentAssigned/);

    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const repo = new ConsoleNotificationRepository();
    repo.enqueueContentAssigned({
      assignmentId: '00000000-0000-4000-8000-000000000001',
      libraryItemId: '00000000-0000-4000-8000-000000000002',
      coachId: '00000000-0000-4000-8000-000000000003',
      teamId: '00000000-0000-4000-8000-000000000004',
      playerId: null,
      triggeredBy: '00000000-0000-4000-8000-000000000003',
      event: 'content_assigned',
    });
    expect(debug).toHaveBeenCalledWith(
      '[notifications]',
      'content_assigned',
      expect.objectContaining({ event: 'content_assigned' }),
    );
    debug.mockRestore();
  });
});

describe('STORY_9_4 AC3 — assigned content appears in player content tab', () => {
  it('test_STORY_9_4_AC3_assigned_appears_in_player_content_tab', () => {
    const port = readFileSync(ASSIGNMENT_PORT, 'utf8');
    expect(port).toMatch(/listAssignedForPlayer/);

    const repo = readFileSync(ASSIGNMENT_REPO, 'utf8');
    expect(repo).toMatch(/content_assignments/);
    expect(repo).toMatch(/listAssignedForPlayer/);

    const di = readFileSync(CREATE_REPOS, 'utf8');
    expect(di).toMatch(/contentAssignments/);

    const sql = readFileSync(SQL_PATH, 'utf8');
    expect(sql).toMatch(/create table if not exists public\.content_assignments/);

    const playerUi = readFileSync(PLAYER_CONTENT_UI, 'utf8');
    expect(playerUi).toMatch(/data-testid="player-content-tab"/);
    expect(playerUi).toMatch(/data-testid="player-content-assigned"/);
    expect(playerUi).toMatch(/Assigned to you/);
    expect(playerUi).toMatch(/listAssignedForPlayer/);

    const app = readFileSync(APP_PATH, 'utf8');
    expect(app).toMatch(/PlayerContentScreen/);
    expect(app).toMatch(/label: "Content"/);
  });
});

describe('STORY_9_4 AC4 — non-roster distribution forbidden (Q 12.6 roster-only)', () => {
  it('test_STORY_9_4_AC4_non_roster_distribution_forbidden', () => {
    expect(ALLOW_NON_ROSTER_CONTENT_DISTRIBUTION).toBe(false);
    expect(canDistributeToNonRosterPlayer()).toBe(false);

    const rosterPlayer = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    expect(() =>
      assertPlayerOnRosterForDistribution(rosterPlayer, [rosterPlayer]),
    ).not.toThrow();

    expect(() =>
      assertPlayerOnRosterForDistribution('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', [rosterPlayer]),
    ).toThrow(/non_roster_distribution_forbidden/);

    const distribution = readFileSync(DISTRIBUTION_PATH, 'utf8');
    expect(distribution).toMatch(/ALLOW_NON_ROSTER_CONTENT_DISTRIBUTION = false/);
    expect(distribution).toMatch(/assertPlayerOnRosterForDistribution/);

    const repo = readFileSync(ASSIGNMENT_REPO, 'utf8');
    expect(repo).toMatch(/assertPlayerOnRosterForDistribution/);

    const sql = readFileSync(SQL_PATH, 'utf8');
    expect(sql).toMatch(/is_team_coach/);
    expect(sql).toMatch(/roster_role = 'player'/);

    const stakeholder = readFileSync(STAKEHOLDER_PATH, 'utf8');
    expect(stakeholder).toMatch(/12\.6/);
    expect(stakeholder).toMatch(/roster only/i);

    const ui = readFileSync(DISTRIBUTE_UI, 'utf8');
    expect(ui).toMatch(/Add the client to a team/);
    expect(ui).not.toMatch(/non-roster email/i);
  });
});
