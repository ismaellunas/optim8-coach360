import type { AppSession, AppSignInInput, SignUpInput, SignUpResult } from '@coach360/domain';

export interface AppAuthRepository {
  signUp(input: SignUpInput): Promise<SignUpResult>;
  signIn(input: AppSignInInput): Promise<AppSession>;
  signOut(): Promise<void>;
  getSession(): Promise<AppSession | null>;
}
