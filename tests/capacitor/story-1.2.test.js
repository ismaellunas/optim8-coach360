// STORY-1.2 — Capacitor production hardening acceptance tests.
//
// AC-1: automated build + cap sync (simulator launch is manual).
// AC-2: typed Supabase client module.
// AC-3: native release documentation.
// AC-4: plugin wiring (device verification is manual).

import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const PACKAGE_JSON = path.join(REPO_ROOT, 'package.json');
const CAPACITOR_CONFIG = path.join(REPO_ROOT, 'capacitor.config.json');
const SUPABASE_CLIENT = path.join(REPO_ROOT, 'src', 'lib', 'supabase.js');
const CAPACITOR_INIT = path.join(REPO_ROOT, 'src', 'lib', 'capacitor.js');
const MAIN_ENTRY = path.join(REPO_ROOT, 'src', 'main.jsx');
const NATIVE_RELEASE_DOC = path.join(
  REPO_ROOT,
  'docs',
  'architecture',
  'native-release.md',
);
const DATABASE_TYPES = path.join(REPO_ROOT, 'src', 'types', 'database.ts');
const IOS_PUBLIC = path.join(REPO_ROOT, 'ios', 'App', 'App', 'public', 'index.html');
const ANDROID_PUBLIC = path.join(
  REPO_ROOT,
  'android',
  'app',
  'src',
  'main',
  'assets',
  'public',
  'index.html',
);

function capCliAvailable() {
  try {
    execSync('npx cap --version', {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 15_000,
    });
    return true;
  } catch {
    return false;
  }
}

const describeCapSync = capCliAvailable() ? describe : describe.skip;

describe('STORY_1_2 AC1 — cap sync after vite build', () => {
  it('test_STORY_1_2_AC1_cap_sync_scripts_configured: package.json exposes build:cap and cap:sync', () => {
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8'));
    expect(pkg.scripts['build:cap'], 'build:cap script').toBeTruthy();
    expect(pkg.scripts['cap:sync'], 'cap:sync script').toBeTruthy();
    expect(pkg.scripts['cap:ios'], 'cap:ios script').toBeTruthy();
    expect(pkg.scripts['cap:android'], 'cap:android script').toBeTruthy();
  });

  it('test_STORY_1_2_AC1_capacitor_web_dir_matches_vite_output: webDir is dist', () => {
    const config = JSON.parse(readFileSync(CAPACITOR_CONFIG, 'utf8'));
    expect(config.webDir).toBe('dist');
  });

  describeCapSync('cap sync integration', () => {
    it('test_STORY_1_2_AC1_cap_sync_after_vite_build: build and copy web assets to native projects', () => {
      execSync('npm run build', {
        cwd: REPO_ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 120_000,
      });
      // cap copy — web assets only; full `cap sync` also runs pod install (needs Xcode).
      execSync('npx cap copy', {
        cwd: REPO_ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 120_000,
      });

      expect(existsSync(path.join(REPO_ROOT, 'dist', 'index.html'))).toBe(true);
      expect(existsSync(IOS_PUBLIC), 'iOS public/index.html').toBe(true);
      expect(existsSync(ANDROID_PUBLIC), 'Android public/index.html').toBe(true);
    }, 180_000);
  });
});

describe('STORY_1_2 AC2 — Supabase client typed', () => {
  it('test_STORY_1_2_AC2_supabase_client_typed: client uses Database types and VITE env vars', () => {
    expect(existsSync(SUPABASE_CLIENT)).toBe(true);
    expect(existsSync(DATABASE_TYPES)).toBe(true);

    const source = readFileSync(SUPABASE_CLIENT, 'utf8');
    expect(source).toMatch(/import\s+\{\s*createClient\s*\}\s+from\s+'@supabase\/supabase-js'/);
    expect(source).toMatch(/@typedef\s+\{import\('\.\.\/types\/database'\)\.Database\}/);
    expect(source).toMatch(/SupabaseClient<Database>/);
    expect(source).toMatch(/import\.meta\.env\.VITE_SUPABASE_URL/);
    expect(source).toMatch(/import\.meta\.env\.VITE_SUPABASE_ANON_KEY/);
    expect(source).toMatch(/export const supabase/);

    const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8'));
    expect(pkg.dependencies['@supabase/supabase-js']).toBeTruthy();
  });
});

describe('STORY_1_2 AC3 — release signing documented', () => {
  it('test_STORY_1_2_AC3_release_signing_documented: native-release.md covers signing and versioning', () => {
    expect(existsSync(NATIVE_RELEASE_DOC)).toBe(true);
    const doc = readFileSync(NATIVE_RELEASE_DOC, 'utf8');

    expect(doc).toMatch(/version/i);
    expect(doc).toMatch(/MARKETING_VERSION|versionName/);
    expect(doc).toMatch(/signing/i);
    expect(doc).toMatch(/App Store/i);
    expect(doc).toMatch(/Play Store|Play Console/i);
    expect(doc).toMatch(/build:cap|cap sync/i);
  });
});

describe('STORY_1_2 AC4 — native plugins configured', () => {
  it('test_STORY_1_2_AC4_native_plugins_configured: StatusBar and Keyboard wired in config, init, and main', () => {
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8'));
    expect(pkg.dependencies['@capacitor/status-bar']).toBeTruthy();
    expect(pkg.dependencies['@capacitor/keyboard']).toBeTruthy();

    const config = JSON.parse(readFileSync(CAPACITOR_CONFIG, 'utf8'));
    expect(config.plugins?.StatusBar).toBeTruthy();
    expect(config.plugins?.Keyboard).toBeTruthy();

    const initSource = readFileSync(CAPACITOR_INIT, 'utf8');
    expect(initSource).toMatch(/@capacitor\/status-bar/);
    expect(initSource).toMatch(/@capacitor\/keyboard/);
    expect(initSource).toMatch(/export async function initNativeShell/);
    expect(initSource).toMatch(/Capacitor\.isNativePlatform/);

    const mainSource = readFileSync(MAIN_ENTRY, 'utf8');
    expect(mainSource).toMatch(/initNativeShell/);
    expect(mainSource).toMatch(/\.\/lib\/capacitor\.js/);
  });
});
