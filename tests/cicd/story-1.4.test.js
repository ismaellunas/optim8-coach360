// STORY-1.4 — CI/CD and app store deployment prep.

import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const CI_WORKFLOW = path.join(REPO_ROOT, '.github', 'workflows', 'ci.yml');
const ADMIN_VERCEL_JSON = path.join(REPO_ROOT, 'apps', 'admin', 'vercel.json');
const ADMIN_DEPLOY_DOC = path.join(REPO_ROOT, 'docs', 'architecture', 'admin-deploy.md');
const ANDROID_BUILD_GRADLE = path.join(REPO_ROOT, 'android', 'app', 'build.gradle');
const RUNBOOK = path.join(REPO_ROOT, 'docs', 'delivery', 'environment-promotion.md');
const RELEASE_APK = path.join(
  REPO_ROOT,
  'android',
  'app',
  'build',
  'outputs',
  'apk',
  'release',
  'app-release.apk',
);

function javaAvailable() {
  try {
    execSync('java -version', { stdio: ['ignore', 'pipe', 'ignore'], timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

function androidSdkAvailable() {
  return Boolean(process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT);
}

const describeAndroidRelease =
  !process.env.GITHUB_ACTIONS && javaAvailable() && androidSdkAvailable()
    ? describe
    : describe.skip;

describe('STORY_1_4 AC1 — GitHub Actions on PR and main', () => {
  it('test_STORY_1_4_AC1_github_actions_pr_and_main: ci workflow triggers on pull_request and main push', () => {
    expect(existsSync(CI_WORKFLOW)).toBe(true);
    const workflow = readFileSync(CI_WORKFLOW, 'utf8');

    expect(workflow).toMatch(/pull_request:/);
    expect(workflow).toMatch(/push:/);
    expect(workflow).toMatch(/branches:\s*\n\s*-\s*main/);
    expect(workflow).toMatch(/npm run lint/);
    expect(workflow).toMatch(/npm run typecheck/);
    expect(workflow).toMatch(/test:story-1\.2/);
    expect(workflow).toMatch(/test:story-1\.3/);
    expect(workflow).toMatch(/test:story-1\.4/);
  });
});

describe('STORY_1_4 AC2 — Android release build in CI', () => {
  it('test_STORY_1_4_AC2_android_release_ci_configured: workflow and gradle support assembleRelease in CI', () => {
    expect(existsSync(CI_WORKFLOW)).toBe(true);
    const workflow = readFileSync(CI_WORKFLOW, 'utf8');
    const gradle = readFileSync(ANDROID_BUILD_GRADLE, 'utf8');

    expect(workflow).toMatch(/android-release:/);
    expect(workflow).toMatch(/setup-java/);
    expect(workflow).toMatch(/setup-android/);
    expect(workflow).toMatch(/assembleRelease/);
    expect(workflow).toMatch(/app-release\.apk/);

    expect(gradle).toMatch(/GITHUB_ACTIONS/);
    expect(gradle).toMatch(/signingConfig signingConfigs\.debug/);
  });

  describeAndroidRelease('local Android release integration', () => {
    it('test_STORY_1_4_AC2_android_release_build_succeeds: cap sync android and assembleRelease produce APK', () => {
      execSync('npm run build:mobile', {
        cwd: REPO_ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 120_000,
        env: { ...process.env, GITHUB_ACTIONS: 'true' },
      });
      execSync('npx cap sync android', {
        cwd: REPO_ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 120_000,
      });
      execSync('./gradlew assembleRelease --no-daemon', {
        cwd: path.join(REPO_ROOT, 'android'),
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 300_000,
        env: { ...process.env, GITHUB_ACTIONS: 'true' },
      });

      expect(existsSync(RELEASE_APK)).toBe(true);
    }, 420_000);
  });
});

describe('STORY_1_4 AC3 — admin deploy on merge to main', () => {
  it('test_STORY_1_4_AC3_admin_deploy_on_main_merge: vercel config deploys admin on merge to main', () => {
    expect(existsSync(ADMIN_VERCEL_JSON)).toBe(true);
    expect(existsSync(ADMIN_DEPLOY_DOC)).toBe(true);

    const vercelJson = readFileSync(ADMIN_VERCEL_JSON, 'utf8');
    const adminDeploy = readFileSync(ADMIN_DEPLOY_DOC, 'utf8');

    expect(vercelJson).toMatch(/buildCommand/);
    expect(vercelJson).toMatch(/npm run build:admin/);
    expect(adminDeploy).toMatch(/merge to `main`/i);
    expect(adminDeploy).toMatch(/Vercel/i);
    expect(adminDeploy).toMatch(/vercel\.json/);
  });
});

describe('STORY_1_4 AC4 — environment promotion runbook', () => {
  it('test_STORY_1_4_AC4_environment_promotion_runbook: runbook covers promotion, secrets, and rollback', () => {
    expect(existsSync(RUNBOOK)).toBe(true);
    const doc = readFileSync(RUNBOOK, 'utf8');

    expect(doc).toMatch(/Supabase/i);
    expect(doc).toMatch(/staging/i);
    expect(doc).toMatch(/production/i);
    expect(doc).toMatch(/admin/i);
    expect(doc).toMatch(/Capacitor|mobile|Android/i);
    expect(doc).toMatch(/secrets/i);
    expect(doc).toMatch(/rollback/i);
    expect(doc).toMatch(/ci\.yml/);
    expect(doc).toMatch(/Vercel Git integration/i);
    expect(doc).toMatch(/admin-deploy\.md/);
    expect(doc).toMatch(/native-release\.md/);
  });
});
