import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  adminSessionSchema,
  canAccessAdmin,
  type AdminSession,
  type User,
} from '@coach360/domain';
import type { AuthRepository, SignInInput } from '../../ports/auth-repository.js';
import { mapProfileToUser } from './mappers/user-mapper.js';

export type SupabaseEnv = {
  url: string;
  anonKey: string;
};

export function createSupabaseClient(env: SupabaseEnv): SupabaseClient {
  return createClient(env.url, env.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

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

    const user = await this.loadUser(data.user.id, data.user.email);
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

    const user = await this.loadUser(session.user.id, session.user.email);
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

  private async loadUser(id: string, email: string): Promise<User | null> {
    const { data, error } = await this.client
      .from('profiles')
      .select('id, role, display_name, is_suspended')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return null;
    }

    return mapProfileToUser(data, email);
  }
}
