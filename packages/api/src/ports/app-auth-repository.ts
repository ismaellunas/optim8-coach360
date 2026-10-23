import type {
  AppSession,
  AppSignInInput,
  CompletePasswordResetInput,
  EstablishRecoverySessionInput,
  RequestPasswordResetInput,
  SignUpInput,
  SignUpResult,
} from '@coach360/domain';

export interface AppAuthRepository {
  signUp(input: SignUpInput): Promise<SignUpResult>;
  signIn(input: AppSignInInput): Promise<AppSession>;
  signOut(): Promise<void>;
  getSession(): Promise<AppSession | null>;
  /** Emails the default Supabase recovery link (BUG-QA2-06, native deep-link completion). */
  requestPasswordReset(input: RequestPasswordResetInput): Promise<void>;
  /** Establishes a session from the tokens in a tapped recovery deep link. */
  establishRecoverySession(input: EstablishRecoverySessionInput): Promise<AppSession>;
  /** Sets the new password on an already-established recovery session. */
  completePasswordReset(input: CompletePasswordResetInput): Promise<AppSession>;
}
