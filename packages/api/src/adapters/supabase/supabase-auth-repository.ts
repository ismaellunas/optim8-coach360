import {
  adminSessionSchema,
  canAccessAdmin,
  type AdminSession,
  type User,
} from '@coach360/domain';
import type { AuthRepository, SignInInput } from '../../ports/auth-repository.js';
import { loadProfileUser } from './load-profile-user.js';
import type { SupabaseClient } from '@supabase/supabase-js';

export class SupabaseAuthRepository implements AuthRepository {
  constructor(private readonly client: SupabaseClient) {}

  async signIn(input: SignInInput): Promise<AdminSession> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error || !data.session || !data.user?.email) {
      throw new Error(error?.message ?? 'sign_in_failed');
    }

    const user = await loadProfileUser(this.client, data.user.id, data.user.email);
    const access = canAccessAdmin(user);
    if (!access.ok) {
      await this.client.auth.signOut();
      throw new Error(`admin_access_denied:${access.reason}`);
    }

    return adminSessionSchema.parse({
      user: access.user,
      accessToken: data.session.access_token,
    });
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  }

  async getSession(): Promise<AdminSession | null> {
    const { data, error } = await this.client.auth.getSession();
    if (error) {
      throw new Error(error.message);
    }

    const session = data.session;
    if (!session?.user.email) {
      return null;
    }

    const user = await loadProfileUser(this.client, session.user.id, session.user.email);
    const access = canAccessAdmin(user);
    if (!access.ok) {
      return null;
    }

    return adminSessionSchema.parse({
      user: access.user,
      accessToken: session.access_token,
    });
  }

  async getCurrentUser(): Promise<User | null> {
    const session = await this.getSession();
    return session?.user ?? null;
  }
}
