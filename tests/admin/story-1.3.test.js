// STORY-1.3 — Admin dashboard views in Vite app.

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { canAccessAdmin } from '@coach360/domain';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const ADMIN_ROOT = path.join(REPO_ROOT, 'apps', 'admin');
const PACKAGES_API = path.join(REPO_ROOT, 'packages', 'api', 'src');
const MIGRATION = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260630100000_prevent_profile_escalation.sql',
);

function read(relPath) {
  return readFileSync(path.join(REPO_ROOT, relPath), 'utf8');
}

describe('STORY_1_3 AC0 — profile privilege escalation blocked', () => {
  it('test_STORY_1_3_AC0_prevent_profile_escalation_migration_exists', () => {
    expect(existsSync(MIGRATION)).toBe(true);
    const sql = readFileSync(MIGRATION, 'utf8');
    expect(sql).toMatch(/prevent_profile_privilege_escalation/);
    expect(sql).toMatch(/new\.role is distinct from old\.role/);
    expect(sql).toMatch(/new\.is_suspended is distinct from old\.is_suspended/);
  });
});

describe('STORY_1_3 AC1 — admin route group protected', () => {
  it('test_STORY_1_3_AC1_admin_routes_require_admin_role', () => {
    const guard = read('apps/admin/src/app/router/AdminRouteGuard.tsx');
    const routes = read('apps/admin/src/app/router/routes.tsx');
    const rules = read('packages/domain/src/user/rules.ts');

    expect(guard).toMatch(/canAccessAdmin/);
    expect(guard).toMatch(/Navigate/);
    expect(routes).toMatch(/AdminRouteGuard/);
    expect(routes).toMatch(/adminPaths\.login/);
    expect(rules).toMatch(/canAccessAdmin/);

    const denied = canAccessAdmin({
      id: '00000000-0000-4000-8000-000000000001',
      email: 'coach@example.com',
      role: 'coach',
      displayName: 'Coach',
      isSuspended: false,
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) {
      expect(denied.reason).toBe('not_admin');
    }
  });
});

describe('STORY_1_3 AC2 — dashboard nav four pillars', () => {
  it('test_STORY_1_3_AC2_dashboard_nav_four_pillars', () => {
    const paths = read('apps/admin/src/app/router/paths.ts');
    const shell = read('apps/admin/src/widgets/admin-shell/ui/AdminShell.tsx');

    expect(paths).toMatch(/Users/);
    expect(paths).toMatch(/Subscriptions/);
    expect(paths).toMatch(/Content/);
    expect(paths).toMatch(/Monitor/);
    expect(paths).toMatch(/adminNavItems/);
    expect(shell).toMatch(/adminNavItems\.map/);
  });
});

describe('STORY_1_3 AC3 — staging deploy configured', () => {
  it('test_STORY_1_3_AC3_staging_deploy_configured', () => {
    const vercel = path.join(ADMIN_ROOT, 'vercel.json');
    const deployDoc = path.join(REPO_ROOT, 'docs', 'architecture', 'admin-deploy.md');
    const pkg = JSON.parse(read('apps/admin/package.json'));

    expect(existsSync(vercel)).toBe(true);
    expect(existsSync(deployDoc)).toBe(true);
    expect(pkg.scripts.build).toBeTruthy();

    const vercelJson = JSON.parse(readFileSync(vercel, 'utf8'));
    expect(vercelJson.rewrites).toBeTruthy();
    expect(vercelJson.headers).toBeTruthy();
  });
});

describe('STORY_1_3 AC4 — content links sanity studio', () => {
  it('test_STORY_1_3_AC4_content_links_sanity_studio', () => {
    const contentPage = read('apps/admin/src/pages/content/ContentPage.tsx');
    const env = read('apps/admin/src/shared/config/env.ts');

    expect(contentPage).toMatch(/Open Sanity Studio/);
    expect(contentPage).toMatch(/readSanityStudioUrl/);
    expect(env).toMatch(/VITE_SANITY_STUDIO_URL/);
  });
});

describe('STORY_1_3 structure — enterprise layering', () => {
  it('test_STORY_1_3_structure_repository_ports_exist', () => {
    expect(existsSync(path.join(PACKAGES_API, 'ports', 'auth-repository.ts'))).toBe(true);
    expect(existsSync(path.join(PACKAGES_API, 'adapters', 'supabase', 'supabase-auth-repository.ts'))).toBe(true);
    expect(existsSync(path.join(PACKAGES_API, 'adapters', 'rest', 'rest-auth-repository.ts'))).toBe(true);
    expect(existsSync(path.join(PACKAGES_API, 'di', 'create-repositories.ts'))).toBe(true);
  });

  it('test_STORY_1_3_structure_ui_has_no_direct_supabase', () => {
    const signInUi = read('apps/admin/src/features/auth/sign-in/ui/SignInForm.tsx');
    const usersPage = read('apps/admin/src/pages/users/UsersPage.tsx');
    const shell = read('apps/admin/src/widgets/admin-shell/ui/AdminShell.tsx');
    expect(signInUi).not.toMatch(/@supabase\/supabase-js/);
    expect(usersPage).not.toMatch(/@supabase\/supabase-js/);
    expect(shell).not.toMatch(/@supabase\/supabase-js/);
    expect(usersPage).toMatch(/useUserListQuery/);
  });

  it('test_STORY_1_3_structure_branded_domain_types', () => {
    const brand = read('packages/domain/src/brand.ts');
    expect(brand).toMatch(/type Brand</);
    expect(brand).toMatch(/UserId/);
  });
});
