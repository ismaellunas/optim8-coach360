import type {
  AppSession,
  AppSignInInput,
  ConfirmPasswordResetInput,
  RequestPasswordResetInput,
  SignUpInput,
  SignUpResult,
} from '@coach360/domain';

export interface AppAuthRepository {
  signUp(input: SignUpInput): Promise<SignUpResult>;
  signIn(input: AppSignInInput): Promise<AppSession>;
  signOut(): Promise<void>;
  getSession(): Promise<AppSession | null>;
  /** Sends a 6-digit recovery code to the email (BUG-QA2-06, no deep-link infra). */
  requestPasswordReset(input: RequestPasswordResetInput): Promise<void>;
  /** Verifies the emailed code and sets the new password, returning the signed-in session. */
  confirmPasswordReset(input: ConfirmPasswordResetInput): Promise<AppSession>;
}
