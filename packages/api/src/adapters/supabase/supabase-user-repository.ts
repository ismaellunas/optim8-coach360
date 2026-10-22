import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@coach360/domain';
import type { PaginatedResult } from '../../client/types.js';
import type { UpdateUserInput, UserListParams, UserRepository } from '../../ports/user-repository.js';
import { edgeFunctionErrorDetail } from './edge-function-error.js';
import { mapProfileToUser } from './mappers/user-mapper.js';

export class SupabaseUserRepository implements UserRepository {
  constructor(private readonly client: SupabaseClient) {}

  /**
   * STORY-12.1 (resolved, QA3-10) — profiles has no email column; the real
   * email lives in auth.users, exposed only via the admin-gated
   * admin_list_user_emails RPC (profiles/auth.users can't be joined in one
   * PostgREST call without a view, hence the second query).
   */
  private async resolveEmails(profileIds: string[]): Promise<Record<string, string>> {
    if (profileIds.length === 0) {
      return {};
    }
    const { data, error } = await this.client.rpc('admin_list_user_emails', {
      p_profile_ids: profileIds,
    });
    if (error) {
      return {};
    }
    return (data as Record<string, string>) ?? {};
  }

  async list(params: UserListParams = {}): Promise<PaginatedResult<User>> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.client
      .from('profiles')
      .select('id, role, display_name, is_suspended', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (params.search?.trim()) {
      query = query.ilike('display_name', `%${params.search.trim()}%`);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    const rows = data ?? [];
    const emailById = await this.resolveEmails(rows.map((row) => row.id));
    const items = rows.map((row) =>
      mapProfileToUser(row, emailById[row.id] ?? 'unknown@coach360.local'),
    );

    return {
      items,
      total: count ?? items.length,
      page,
      pageSize,
    };
  }

  async getById(id: string): Promise<User | null> {
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

    const emailById = await this.resolveEmails([data.id]);
    return mapProfileToUser(data, emailById[data.id] ?? 'unknown@coach360.local');
  }

  async sendPasswordReset(id: string): Promise<void> {
    const { data, error } = await this.client.functions.invoke('admin-reset-password', {
      body: { profileId: id },
    });

    if (error) {
      throw new Error(await edgeFunctionErrorDetail(error, data));
    }

    const payload = data as { ok?: boolean; error?: string } | null;
    if (!payload?.ok) {
      throw new Error(payload?.error || 'password_reset_failed');
    }
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<User> {
    const patch: Record<string, unknown> = {};
    if (input.displayName !== undefined) {
      patch.display_name = input.displayName;
    }
    if (input.role !== undefined) {
      patch.role = input.role;
    }
    if (input.isSuspended !== undefined) {
      patch.is_suspended = input.isSuspended;
    }

    const { data, error } = await this.client
      .from('profiles')
      .update(patch)
      .eq('id', id)
      .select('id, role, display_name, is_suspended')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapProfileToUser(data, 'unknown@coach360.local');
  }
}
