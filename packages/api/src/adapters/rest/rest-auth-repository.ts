import type { AdminSession, User } from '@coach360/domain';
import { NotImplementedAdapterError } from '../../client/types.js';
import type { AuthRepository, SignInInput } from '../../ports/auth-repository.js';

export class RestAuthRepository implements AuthRepository {
  async signIn(input: SignInInput): Promise<AdminSession> {
    void input;
    throw new NotImplementedAdapterError('rest', 'signIn');
  }

  async signOut(): Promise<void> {
    throw new NotImplementedAdapterError('rest', 'signOut');
  }

  async getSession(): Promise<AdminSession | null> {
    throw new NotImplementedAdapterError('rest', 'getSession');
  }

  async getCurrentUser(): Promise<User | null> {
    throw new NotImplementedAdapterError('rest', 'getCurrentUser');
  }
}
