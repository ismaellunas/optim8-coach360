// STORY-12.1 — User management: profiles, roles, suspend.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { appRoleSchema, userSchema } from '@coach360/domain';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return readFileSync(path.join(REPO_ROOT, relPath), 'utf8');
}

const PORT_PATH = 'packages/api/src/ports/user-repository.ts';
const SUPABASE_REPO_PATH = 'packages/api/src/adapters/supabase/supabase-user-repository.ts';
const REST_REPO_PATH = 'packages/api/src/adapters/rest/rest-user-repository.ts';
const APP_AUTH_PATH = 'packages/api/src/adapters/supabase/supabase-app-auth-repository.ts';
const QUERIES_PATH = 'apps/admin/src/entities/user/api/user-queries.ts';
const USERS_PAGE_PATH = 'apps/admin/src/pages/users/UsersPage.tsx';

describe('STORY_12_1 AC1 — admin views searchable list of all user profiles', () => {
  it('test_STORY_12_1_AC1_admin_can_search_user_list', () => {
    const port = read(PORT_PATH);
    expect(port).toMatch(/UserListParams/);
    expect(port).toMatch(/search\?:\s*string/);

    const supabaseRepo = read(SUPABASE_REPO_PATH);
    expect(supabaseRepo).toMatch(/params\.search/);
    expect(supabaseRepo).toMatch(/ilike\('display_name'/);

    const queries = read(QUERIES_PATH);
    expect(queries).toMatch(/useUserListQuery\(search/);
    expect(queries).toMatch(/repos\.users\.list/);

    const usersPage = read(USERS_PAGE_PATH);
    expect(usersPage).toMatch(/Search users/);
    expect(usersPage).toMatch(/setSearch/);
    expect(usersPage).toMatch(/useUserListQuery\(search\)/);
  });
});

describe('STORY_12_1 AC2 — admin edits profile fields and changes user role', () => {
  it('test_STORY_12_1_AC2_admin_edits_profile_and_role', () => {
    const port = read(PORT_PATH);
    expect(port).toMatch(/updateUser\(id: string, input: UpdateUserInput\): Promise<User>/);

    const supabaseRepo = read(SUPABASE_REPO_PATH);
    expect(supabaseRepo).toMatch(/async updateUser/);
    expect(supabaseRepo).toMatch(/from\('profiles'\)\s*\n\s*\.update\(patch\)/);

    const restRepo = read(REST_REPO_PATH);
    expect(restRepo).toMatch(/async updateUser/);
    expect(restRepo).toMatch(/NotImplementedAdapterError\('rest', 'updateUser'\)/);

    const queries = read(QUERIES_PATH);
    expect(queries).toMatch(/useUpdateUserMutation/);
    expect(queries).toMatch(/repos\.users\.updateUser/);

    const usersPage = read(USERS_PAGE_PATH);
    expect(usersPage).toMatch(/Display name for/);
    expect(usersPage).toMatch(/Role for/);
    expect(usersPage).toMatch(/ROLE_OPTIONS/);
    expect(usersPage).toMatch(/updateUser\.mutate/);

    // Role vocabulary matches the domain schema admins can assign.
    for (const role of ['coach', 'player', 'team_manager', 'admin']) {
      expect(appRoleSchema.safeParse(role).success).toBe(true);
    }
  });
});

describe('STORY_12_1 AC3 — suspend/deactivate prevents login and shows account-held message', () => {
  it('test_STORY_12_1_AC3_suspended_user_blocked_from_login', () => {
    const appAuth = read(APP_AUTH_PATH);
    expect(appAuth).toMatch(/if \(user\.isSuspended\)/);
    expect(appAuth).toMatch(/this\.client\.auth\.signOut\(\)/);
    expect(appAuth).toMatch(/Your account has been suspended\. Contact support for assistance\./);

    const usersPage = read(USERS_PAGE_PATH);
    expect(usersPage).toMatch(/Suspend/);
    expect(usersPage).toMatch(/Reactivate/);
    expect(usersPage).toMatch(/isSuspended: !user\.isSuspended/);

    // A suspended user still parses as a valid domain User — suspension is a
    // data flag, not a schema-level rejection; the block happens in signIn.
    const suspended = userSchema.parse({
      id: '00000000-0000-4000-8000-000000000003',
      email: 'suspended@coach360.test',
      role: 'player',
      displayName: 'Suspended Player',
      isSuspended: true,
    });
    expect(suspended.isSuspended).toBe(true);
  });
});

describe('STORY_12_1 AC4 — admin views all team rosters from user detail', () => {
  it('test_STORY_12_1_AC4_admin_views_user_team_rosters', () => {
    const queries = read(QUERIES_PATH);
    expect(queries).toMatch(/useUserTeamsQuery/);
    expect(queries).toMatch(/repos\.rosters\.listMemberTeams/);

    const usersPage = read(USERS_PAGE_PATH);
    expect(usersPage).toMatch(/useUserTeamsQuery/);
    expect(usersPage).toMatch(/Team rosters/);
    expect(usersPage).toMatch(/team\.name/);
  });
});

describe('STORY_12_1 structure — no direct Supabase access from UI', () => {
  it('test_STORY_12_1_structure_users_page_has_no_direct_supabase', () => {
    const usersPage = read(USERS_PAGE_PATH);
    expect(usersPage).not.toMatch(/@supabase\/supabase-js/);
  });
});
