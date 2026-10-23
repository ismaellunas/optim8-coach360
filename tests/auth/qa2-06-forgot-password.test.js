// BUG-QA2-06 — forgot password (in-app OTP reset, no deep-link infra).

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  confirmPasswordResetInputSchema,
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
const AUTH_SCREENS_PATH = 'apps/mobile/src/features/auth/ui/AuthScreens.jsx';
const FORGOT_PASSWORD_SCREEN_PATH = 'apps/mobile/src/features/auth/ui/ForgotPasswordScreen.jsx';
const AUTH_FLOW_PATH = 'apps/mobile/src/features/auth/ui/AuthFlow.jsx';

describe('QA2_06 — domain input schemas', () => {
  it('test_QA2_06_request_and_confirm_schemas_validate_expected_shape', () => {
    expect(requestPasswordResetInputSchema.safeParse({ email: 'coach@coach360.test' }).success).toBe(
      true,
    );
    expect(requestPasswordResetInputSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);

    expect(
      confirmPasswordResetInputSchema.safeParse({
        email: 'coach@coach360.test',
        token: '123456',
        newPassword: 'new-password-123',
      }).success,
    ).toBe(true);
    expect(
      confirmPasswordResetInputSchema.safeParse({
        email: 'coach@coach360.test',
        token: '123456',
        newPassword: 'short',
      }).success,
    ).toBe(false);
  });
});

describe('QA2_06 AC1 — API port and adapters declare reset methods', () => {
  it('test_QA2_06_AC1_port_and_adapters_declare_password_reset', () => {
    const port = read(PORT_PATH);
    expect(port).toMatch(/requestPasswordReset\(input: RequestPasswordResetInput\): Promise<void>/);
    expect(port).toMatch(/confirmPasswordReset\(input: ConfirmPasswordResetInput\): Promise<AppSession>/);

    const supabaseRepo = read(SUPABASE_REPO_PATH);
    expect(supabaseRepo).toMatch(/resetPasswordForEmail\(input\.email\)/);
    expect(supabaseRepo).toMatch(/verifyOtp\(\{/);
    expect(supabaseRepo).toMatch(/type:\s*'recovery'/);
    expect(supabaseRepo).toMatch(/updateUser\(\{\s*password:\s*input\.newPassword/);

    const restRepo = read(REST_REPO_PATH);
    expect(restRepo).toMatch(/requestPasswordReset/);
    expect(restRepo).toMatch(/confirmPasswordReset/);
    expect(restRepo).toMatch(/NotImplementedAdapterError\('rest', 'requestPasswordReset'\)/);
    expect(restRepo).toMatch(/NotImplementedAdapterError\('rest', 'confirmPasswordReset'\)/);
  });
});

describe('QA2_06 AC2 — AuthProvider exposes reset methods', () => {
  it('test_QA2_06_AC2_auth_context_exposes_request_and_confirm', () => {
    const context = read(AUTH_CONTEXT_PATH);
    expect(context).toMatch(/requestPasswordReset: async function/);
    expect(context).toMatch(/repos\.appAuth\.requestPasswordReset\(input\)/);
    expect(context).toMatch(/confirmPasswordReset: async function/);
    expect(context).toMatch(/repos\.appAuth\.confirmPasswordReset\(input\)/);
    expect(context).toMatch(/setSession\(nextSession\)/);
  });
});

describe('QA2_06 AC3 — sign-in screen links to forgot password', () => {
  it('test_QA2_06_AC3_sign_in_screen_has_forgot_password_link', () => {
    const screens = read(AUTH_SCREENS_PATH);
    expect(screens).toMatch(/onForgotPassword/);
    expect(screens).toMatch(/Forgot password\?/);
  });
});

describe('QA2_06 AC4 — forgot password screen has request and confirm steps', () => {
  it('test_QA2_06_AC4_forgot_password_screen_has_both_steps', () => {
    const screen = read(FORGOT_PASSWORD_SCREEN_PATH);
    expect(screen).toMatch(/FORGOT PASSWORD/);
    expect(screen).toMatch(/ENTER CODE/);
    expect(screen).toMatch(/onRequestCode/);
    expect(screen).toMatch(/onConfirmReset/);
    expect(screen).toMatch(/maxLength=\{6\}/);
  });
});

describe('QA2_06 AC5 — AuthFlow wires the forgot-password mode', () => {
  it('test_QA2_06_AC5_auth_flow_wires_forgot_password_mode', () => {
    const flow = read(AUTH_FLOW_PATH);
    expect(flow).toMatch(/mode === 'forgot-password'/);
    expect(flow).toMatch(/requestPasswordReset\(\{ email: requestedEmail \}\)/);
    expect(flow).toMatch(/confirmPasswordReset\(\{ email: resetEmail, token, newPassword \}\)/);
  });
});
