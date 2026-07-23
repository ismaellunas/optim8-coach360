import type { SupabaseClient } from '@supabase/supabase-js';
import {
  appSessionSchema,
  signUpResultSchema,
  type AppSession,
  type AppSignInInput,
  type SignUpInput,
  type SignUpResult,
} from '@coach360/domain';
import type { AppAuthRepository } from '../../ports/app-auth-repository.js';
import { loadProfileUser } from './load-profile-user.js';

export class SupabaseAppAuthRepository implements AppAuthRepository {
  constructor(private readonly client: SupabaseClient) {}

  async signUp(input: SignUpInput): Promise<SignUpResult> {
    const { data, error } = await this.client.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          display_name: input.displayName ?? input.email,
          role: input.role,
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.session && data.user?.email) {
      const user = await loadProfileUser(this.client, data.user.id, data.user.email);
      return signUpResultSchema.parse({
        needsEmailVerification: false,
        session: appSessionSchema.parse({
          user,
          accessToken: data.session.access_token,
        }),
      });
    }

    return signUpResultSchema.parse({
      needsEmailVerification: Boolean(data.user && !data.session),
      session: null,
    });
  }

  async signIn(input: AppSignInInput): Promise<AppSession> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error || !data.session || !data.user?.email) {
      throw new Error(error?.message ?? 'sign_in_failed');
    }

    const user = await loadProfileUser(this.client, data.user.id, data.user.email);
    if (user.isSuspended) {
      await this.client.auth.signOut();
      throw new Error('Your account has been suspended. Contact support for assistance.');
    }

    return appSessionSchema.parse({
      user,
      accessToken: data.session.access_token,
    });
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  }

  async getSession(): Promise<AppSession | null> {
    const { data, error } = await this.client.auth.getSession();
    if (error) {
      throw new Error(error.message);
    }

    const session = data.session;
    if (!session?.user.email) {
      return null;
    }

    const user = await loadProfileUser(this.client, session.user.id, session.user.email);
    if (user.isSuspended) {
      await this.client.auth.signOut();
      return null;
    }

    return appSessionSchema.parse({
      user,
      accessToken: session.access_token,
    });
  }
}
