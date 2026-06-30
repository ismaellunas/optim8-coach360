import type { AdminSession, User } from '@coach360/domain';

export type SignInInput = {
  email: string;
  password: string;
};

export interface AuthRepository {
  signIn(input: SignInInput): Promise<AdminSession>;
  signOut(): Promise<void>;
  getSession(): Promise<AdminSession | null>;
  getCurrentUser(): Promise<User | null>;
}
