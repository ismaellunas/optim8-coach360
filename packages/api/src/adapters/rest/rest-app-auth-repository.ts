import type { AppSession, AppSignInInput, SignUpInput, SignUpResult } from '@coach360/domain';
import { NotImplementedAdapterError } from '../../client/types.js';
import type { AppAuthRepository } from '../../ports/app-auth-repository.js';

export class RestAppAuthRepository implements AppAuthRepository {
  async signUp(input: SignUpInput): Promise<SignUpResult> {
    void input;
    throw new NotImplementedAdapterError('rest', 'signUp');
  }

  async signIn(input: AppSignInInput): Promise<AppSession> {
    void input;
    throw new NotImplementedAdapterError('rest', 'signIn');
  }

  async signOut(): Promise<void> {
    throw new NotImplementedAdapterError('rest', 'signOut');
  }

  async getSession(): Promise<AppSession | null> {
    throw new NotImplementedAdapterError('rest', 'getSession');
  }
}
