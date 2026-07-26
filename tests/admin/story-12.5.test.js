// STORY-12.5 — Onboarding configuration and team oversight.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ONBOARDING_CONFIG,
  mergeOnboardingConfig,
  normalizeOnboardingConfigInput,
  onboardingConfigSchema,
  parseOnboardingConfig,
  teamSchema,
} from '@coach360/domain';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return readFileSync(path.join(REPO_ROOT, relPath), 'utf8');
}

const MIGRATION_PATH =
  'supabase/migrations/20260726200000_admin_onboarding_and_team_oversight.sql';
const ONBOARDING_PORT_PATH = 'packages/api/src/ports/onboarding-config-repository.ts';
const TEAM_PORT_PATH = 'packages/api/src/ports/team-repository.ts';
const ROSTER_PORT_PATH = 'packages/api/src/ports/roster-repository.ts';
const SUPA_ONB_PATH =
  'packages/api/src/adapters/supabase/supabase-onboarding-config-repository.ts';
const REST_ONB_PATH = 'packages/api/src/adapters/rest/rest-onboarding-config-repository.ts';
const SUPA_TEAM_PATH = 'packages/api/src/adapters/supabase/supabase-team-repository.ts';
const REST_TEAM_PATH = 'packages/api/src/adapters/rest/rest-team-repository.ts';
const SUPA_ROSTER_PATH = 'packages/api/src/adapters/supabase/supabase-roster-repository.ts';
const REST_ROSTER_PATH = 'packages/api/src/adapters/rest/rest-roster-repository.ts';
const DI_PATH = 'packages/api/src/di/create-repositories.ts';
const ONB_QUERIES_PATH = 'apps/admin/src/entities/onboarding/api/onboarding-queries.ts';
const TEAM_QUERIES_PATH = 'apps/admin/src/entities/team/api/team-queries.ts';
const ONB_SECTION_PATH = 'apps/admin/src/pages/users/OnboardingConfigSection.tsx';
const TEAMS_SECTION_PATH = 'apps/admin/src/pages/users/TeamsOversightSection.tsx';
const USERS_PAGE_PATH = 'apps/admin/src/pages/users/UsersPage.tsx';
const COACH_WIZARD_PATH = 'apps/mobile/src/features/onboarding/ui/CoachOnboardingWizard.jsx';
const PLAYER_WIZARD_PATH = 'apps/mobile/src/features/onboarding/ui/PlayerOnboardingWizard.jsx';
const COACH_GATE_PATH = 'apps/mobile/src/features/onboarding/ui/CoachOnboardingGate.jsx';
const PLAYER_GATE_PATH = 'apps/mobile/src/features/onboarding/ui/PlayerOnboardingGate.jsx';

describe('STORY_12_5 AC1 — admin configures onboarding wizard steps and mandatory flags', () => {
  it('test_STORY_12_5_AC1_admin_configures_wizard_steps_and_mandatory_flags', () => {
    // Domain: default config exposes steps with mandatory flags for both roles.
    expect(onboardingConfigSchema.safeParse(DEFAULT_ONBOARDING_CONFIG).success).toBe(true);
    for (const role of ['coach', 'player']) {
      const steps = DEFAULT_ONBOARDING_CONFIG[role].steps;
      expect(steps.length).toBeGreaterThan(0);
      for (const step of steps) {
        expect(typeof step.mandatory).toBe('boolean');
      }
      expect(steps.find((step) => step.id === 'welcome')?.mandatory).toBe(true);
    }

    // An admin override of a step's mandatory flag survives the merge.
    const merged = parseOnboardingConfig({
      coach: { steps: [{ id: 'profile', mandatory: true }] },
    });
    expect(merged.coach.steps.find((step) => step.id === 'profile')?.mandatory).toBe(true);
    // Unrelated steps keep their defaults.
    expect(merged.coach.steps.find((step) => step.id === 'welcome')?.mandatory).toBe(true);

    // Malformed input falls back to a valid config (mobile never breaks).
    expect(onboardingConfigSchema.safeParse(mergeOnboardingConfig('nonsense')).success).toBe(true);
    expect(onboardingConfigSchema.safeParse(normalizeOnboardingConfigInput({})).success).toBe(true);

    // Settings-backed RPCs enforce admin.
    const sql = read(MIGRATION_PATH);
    expect(sql).toMatch(/onboarding_config/);
    expect(sql).toMatch(/get_onboarding_config/);
    expect(sql).toMatch(/set_onboarding_config/);
    expect(sql).toMatch(/admin_required/);

    const port = read(ONBOARDING_PORT_PATH);
    expect(port).toMatch(/getConfig\(\): Promise<OnboardingConfig>/);
    expect(port).toMatch(/setConfig\(config: OnboardingConfig\): Promise<OnboardingConfig>/);

    const supa = read(SUPA_ONB_PATH);
    expect(supa).toMatch(/get_onboarding_config/);
    expect(supa).toMatch(/set_onboarding_config/);

    const rest = read(REST_ONB_PATH);
    expect(rest).toMatch(/NotImplementedAdapterError\('rest', 'getOnboardingConfig'\)/);
    expect(rest).toMatch(/NotImplementedAdapterError\('rest', 'setOnboardingConfig'\)/);

    const di = read(DI_PATH);
    expect(di).toMatch(/onboardingConfig:/);

    const queries = read(ONB_QUERIES_PATH);
    expect(queries).toMatch(/useOnboardingConfigQuery/);
    expect(queries).toMatch(/useSetOnboardingConfigMutation/);
    expect(queries).toMatch(/repos\.onboardingConfig\.getConfig/);
    expect(queries).toMatch(/repos\.onboardingConfig\.setConfig/);

    const section = read(ONB_SECTION_PATH);
    expect(section).toMatch(/Onboarding configuration/);
    expect(section).toMatch(/Mandatory/);
    expect(section).toMatch(/useSetOnboardingConfigMutation/);

    const usersPage = read(USERS_PAGE_PATH);
    expect(usersPage).toMatch(/Onboarding/);
    expect(usersPage).toMatch(/OnboardingConfigSection/);
  });
});

describe('STORY_12_5 AC2 — welcome messaging editable without code deploy', () => {
  it('test_STORY_12_5_AC2_welcome_messaging_editable_without_deploy', () => {
    // Admin welcome copy override is applied over defaults.
    const merged = parseOnboardingConfig({
      coach: { welcome: { title: 'Hey coach', body: 'Custom coach welcome' } },
    });
    expect(merged.coach.welcome.title).toBe('Hey coach');
    expect(merged.coach.welcome.body).toBe('Custom coach welcome');
    // Player copy untouched keeps defaults.
    expect(merged.player.welcome.body).toBe(DEFAULT_ONBOARDING_CONFIG.player.welcome.body);

    const section = read(ONB_SECTION_PATH);
    expect(section).toMatch(/Welcome message/);
    expect(section).toMatch(/Welcome title/);
    expect(section).toMatch(/Welcome body/);

    // Mobile wizards read welcome copy from config (not only hardcoded strings).
    const coachWizard = read(COACH_WIZARD_PATH);
    expect(coachWizard).toMatch(/config\?\.welcome\?\.body/);
    const playerWizard = read(PLAYER_WIZARD_PATH);
    expect(playerWizard).toMatch(/config\?\.welcome\?\.body/);

    // Gates load the admin config and pass it into the wizards.
    const coachGate = read(COACH_GATE_PATH);
    expect(coachGate).toMatch(/repos\.onboardingConfig/);
    expect(coachGate).toMatch(/\.getConfig\(\)/);
    expect(coachGate).toMatch(/config=\{onboardingConfig\?\.coach/);
    const playerGate = read(PLAYER_GATE_PATH);
    expect(playerGate).toMatch(/repos\.onboardingConfig/);
    expect(playerGate).toMatch(/\.getConfig\(\)/);
    expect(playerGate).toMatch(/config=\{onboardingConfig\?\.player/);
  });
});

describe('STORY_12_5 AC3 — admin views all teams and edits team settings', () => {
  it('test_STORY_12_5_AC3_admin_views_and_edits_teams', () => {
    // Team schema carries the archive flag with a null default (back-compat).
    const team = teamSchema.parse({
      id: '00000000-0000-4000-8000-000000000099',
      name: 'Test Team',
      description: null,
      logoUrl: null,
      ageMin: null,
      ageMax: null,
      gradeLevel: null,
      division: null,
      seasonStart: null,
      seasonEnd: null,
      createdBy: '00000000-0000-4000-8000-000000000001',
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    });
    expect(team.archivedAt).toBe(null);

    const sql = read(MIGRATION_PATH);
    expect(sql).toMatch(/admin_list_teams/);
    expect(sql).toMatch(/admin_update_team/);

    const port = read(TEAM_PORT_PATH);
    expect(port).toMatch(/listAll\(\): Promise<Team\[\]>/);
    expect(port).toMatch(/adminUpdate\(teamId: string, input: TeamProfileInput\): Promise<Team>/);

    const supa = read(SUPA_TEAM_PATH);
    expect(supa).toMatch(/admin_list_teams/);
    expect(supa).toMatch(/admin_update_team/);

    const rest = read(REST_TEAM_PATH);
    expect(rest).toMatch(/NotImplementedAdapterError\('rest', 'listAllTeams'\)/);
    expect(rest).toMatch(/NotImplementedAdapterError\('rest', 'adminUpdateTeam'\)/);

    const queries = read(TEAM_QUERIES_PATH);
    expect(queries).toMatch(/useAllTeamsQuery/);
    expect(queries).toMatch(/useAdminUpdateTeamMutation/);
    expect(queries).toMatch(/repos\.teams\.listAll/);
    expect(queries).toMatch(/repos\.teams\.adminUpdate/);

    const section = read(TEAMS_SECTION_PATH);
    expect(section).toMatch(/Team oversight/);
    expect(section).toMatch(/useAllTeamsQuery/);
    expect(section).toMatch(/Save team settings/);

    const usersPage = read(USERS_PAGE_PATH);
    expect(usersPage).toMatch(/Teams/);
    expect(usersPage).toMatch(/TeamsOversightSection/);
  });
});

describe('STORY_12_5 AC4 — admin manages coach-team assignments and can archive teams', () => {
  it('test_STORY_12_5_AC4_admin_manages_coach_assignments_and_archives_teams', () => {
    const sql = read(MIGRATION_PATH);
    expect(sql).toMatch(/archived_at/);
    expect(sql).toMatch(/admin_set_team_archived/);
    expect(sql).toMatch(/admin_assign_coach_to_team/);
    expect(sql).toMatch(/admin_unassign_coach/);

    const teamPort = read(TEAM_PORT_PATH);
    expect(teamPort).toMatch(/setArchived\(teamId: string, archived: boolean\): Promise<Team>/);

    const rosterPort = read(ROSTER_PORT_PATH);
    expect(rosterPort).toMatch(/adminAssignCoachByEmail\(teamId: string, email: string\): Promise<RosterMember>/);
    expect(rosterPort).toMatch(/adminUnassignCoach\(teamId: string, profileId: string\): Promise<RosterMember>/);

    const supaTeam = read(SUPA_TEAM_PATH);
    expect(supaTeam).toMatch(/admin_set_team_archived/);
    const supaRoster = read(SUPA_ROSTER_PATH);
    expect(supaRoster).toMatch(/admin_assign_coach_to_team/);
    expect(supaRoster).toMatch(/admin_unassign_coach/);

    const restTeam = read(REST_TEAM_PATH);
    expect(restTeam).toMatch(/NotImplementedAdapterError\('rest', 'setTeamArchived'\)/);
    const restRoster = read(REST_ROSTER_PATH);
    expect(restRoster).toMatch(/NotImplementedAdapterError\('rest', 'adminAssignCoachByEmail'\)/);
    expect(restRoster).toMatch(/NotImplementedAdapterError\('rest', 'adminUnassignCoach'\)/);

    const queries = read(TEAM_QUERIES_PATH);
    expect(queries).toMatch(/useSetTeamArchivedMutation/);
    expect(queries).toMatch(/useAdminAssignCoachMutation/);
    expect(queries).toMatch(/useAdminUnassignCoachMutation/);
    expect(queries).toMatch(/repos\.rosters\.adminAssignCoachByEmail/);
    expect(queries).toMatch(/repos\.rosters\.adminUnassignCoach/);

    const section = read(TEAMS_SECTION_PATH);
    expect(section).toMatch(/Assign coach/);
    expect(section).toMatch(/Unassign/);
    expect(section).toMatch(/Archive/);
    expect(section).toMatch(/Restore/);
  });
});

describe('STORY_12_5 structure — no direct Supabase access from UI', () => {
  it('test_STORY_12_5_structure_admin_sections_have_no_direct_supabase', () => {
    expect(read(ONB_SECTION_PATH)).not.toMatch(/@supabase\/supabase-js/);
    expect(read(TEAMS_SECTION_PATH)).not.toMatch(/@supabase\/supabase-js/);
    expect(read(USERS_PAGE_PATH)).not.toMatch(/@supabase\/supabase-js/);
  });
});
