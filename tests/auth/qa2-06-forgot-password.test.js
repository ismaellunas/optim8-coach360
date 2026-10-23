// BUG-QA2-06 — forgot password via a native custom-URL-scheme deep link.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  completePasswordResetInputSchema,
  establishRecoverySessionInputSchema,
  requestPasswordResetInputSchema,
} from '@coach360/domain';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return readFileSync(path.join(REPO_ROOT, relPath), 'utf8');
}

const PORT_PATH = 'packages/api/src/ports/app-auth-repository.ts';
const SUPABASE_REPO_PATH = 'packages/api/src/adapters/supabase/supabase-app-auth-repository.ts';
const REST_REPO_PATH = 'packages/api/src/adapters/rest/rest-app-auth-repository.ts';
const AUTH_CONTEXT_PATH = 'apps/mobile/src/features/auth/model/auth-context.jsx';
const AUTH_GATE_PATH = 'apps/mobile/src/features/auth/ui/AuthGate.jsx';
const AUTH_SCREENS_PATH = 'apps/mobile/src/features/auth/ui/AuthScreens.jsx';
const FORGOT_PASSWORD_SCREEN_PATH = 'apps/mobile/src/features/auth/ui/ForgotPasswordScreen.jsx';
const SET_NEW_PASSWORD_SCREEN_PATH = 'apps/mobile/src/features/auth/ui/SetNewPasswordScreen.jsx';
const AUTH_FLOW_PATH = 'apps/mobile/src/features/auth/ui/AuthFlow.jsx';
const CAPACITOR_LIB_PATH = 'apps/mobile/src/lib/capacitor.js';
const ANDROID_MANIFEST_PATH = 'android/app/src/main/AndroidManifest.xml';
const IOS_INFO_PLIST_PATH = 'ios/App/App/Info.plist';

describe('QA2_06 — domain input schemas', () => {
  it('test_QA2_06_schemas_validate_expected_shape', () => {
    expect(requestPasswordResetInputSchema.safeParse({ email: 'coach@coach360.test' }).success).toBe(
      true,
    );
    expect(
      requestPasswordResetInputSchema.safeParse({
        email: 'coach@coach360.test',
        redirectTo: 'com.optim8.coach360.app://reset-password',
      }).success,
    ).toBe(true);

    expect(
      establishRecoverySessionInputSchema.safeParse({
        accessToken: 'a',
        refreshToken: 'b',
      }).success,
    ).toBe(true);

    expect(completePasswordResetInputSchema.safeParse({ newPassword: 'new-password-123' }).success).toBe(
      true,
    );
    expect(completePasswordResetInputSchema.safeParse({ newPassword: 'short' }).success).toBe(false);
  });
});

describe('QA2_06 AC1 — API port and adapters declare recovery methods', () => {
  it('test_QA2_06_AC1_port_and_adapters_declare_password_recovery', () => {
    const port = read(PORT_PATH);
    expect(port).toMatch(/requestPasswordReset\(input: RequestPasswordResetInput\): Promise<void>/);
    expect(port).toMatch(
      /establishRecoverySession\(input: EstablishRecoverySessionInput\): Promise<AppSession>/,
    );
    expect(port).toMatch(/completePasswordReset\(input: CompletePasswordResetInput\): Promise<AppSession>/);

    const supabaseRepo = read(SUPABASE_REPO_PATH);
    expect(supabaseRepo).toMatch(/resetPasswordForEmail\(/);
    expect(supabaseRepo).toMatch(/setSession\(\{/);
    expect(supabaseRepo).toMatch(/updateUser\(\{\s*password:\s*input\.newPassword/);

    const restRepo = read(REST_REPO_PATH);
    expect(restRepo).toMatch(/NotImplementedAdapterError\('rest', 'requestPasswordReset'\)/);
    expect(restRepo).toMatch(/NotImplementedAdapterError\('rest', 'establishRecoverySession'\)/);
    expect(restRepo).toMatch(/NotImplementedAdapterError\('rest', 'completePasswordReset'\)/);
  });
});

describe('QA2_06 AC2 — native deep-link plumbing is registered', () => {
  it('test_QA2_06_AC2_native_shell_and_manifests_declare_custom_scheme', () => {
    const capacitorLib = read(CAPACITOR_LIB_PATH);
    expect(capacitorLib).toMatch(/registerAppUrlOpenHandler/);
    expect(capacitorLib).toMatch(/appUrlOpen/);
    expect(capacitorLib).toMatch(/getLaunchUrl/);

    const manifest = read(ANDROID_MANIFEST_PATH);
    expect(manifest).toMatch(/android:scheme="com\.optim8\.coach360\.app"/);
    expect(manifest).toMatch(/android\.intent\.category\.BROWSABLE/);

    const infoPlist = read(IOS_INFO_PLIST_PATH);
    expect(infoPlist).toMatch(/CFBundleURLSchemes/);
    expect(infoPlist).toMatch(/com\.optim8\.coach360\.app/);
  });
});

describe('QA2_06 AC3 — AuthProvider establishes a recovery session from the deep link', () => {
  it('test_QA2_06_AC3_auth_context_handles_recovery_link', () => {
    const context = read(AUTH_CONTEXT_PATH);
    expect(context).toMatch(/registerAppUrlOpenHandler/);
    expect(context).toMatch(/type.*!==.*'recovery'/);
    expect(context).toMatch(/establishRecoverySession\(\{ accessToken, refreshToken \}\)/);
    expect(context).toMatch(/setRecoveryMode\(true\)/);
    expect(context).toMatch(/completePasswordReset: async function/);
    expect(context).toMatch(/recoveryMode,/);
  });
});

describe('QA2_06 AC4 — AuthGate forces the set-new-password screen during recovery', () => {
  it('test_QA2_06_AC4_auth_gate_checks_recovery_mode', () => {
    const gate = read(AUTH_GATE_PATH);
    expect(gate).toMatch(/recoveryMode/);
    expect(gate).toMatch(/SetNewPasswordScreen/);
  });
});

describe('QA2_06 AC5 — sign-in links to forgot password; screens match the flow', () => {
  it('test_QA2_06_AC5_screens_wire_the_link_based_flow', () => {
    const screens = read(AUTH_SCREENS_PATH);
    expect(screens).toMatch(/onForgotPassword/);
    expect(screens).toMatch(/Forgot password\?/);

    const forgotPassword = read(FORGOT_PASSWORD_SCREEN_PATH);
    expect(forgotPassword).toMatch(/FORGOT PASSWORD/);
    expect(forgotPassword).toMatch(/CHECK YOUR EMAIL/);
    expect(forgotPassword).not.toMatch(/maxLength=\{6\}/);

    const setNewPassword = read(SET_NEW_PASSWORD_SCREEN_PATH);
    expect(setNewPassword).toMatch(/SET NEW PASSWORD/);
    expect(setNewPassword).toMatch(/completePasswordReset/);

    const flow = read(AUTH_FLOW_PATH);
    expect(flow).toMatch(/mode === 'forgot-password'/);
    expect(flow).toMatch(/redirectTo: RECOVERY_REDIRECT_URL/);
    expect(flow).toMatch(/com\.optim8\.coach360\.app:\/\/reset-password/);
  });
});
