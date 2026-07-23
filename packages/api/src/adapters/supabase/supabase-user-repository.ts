import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@coach360/domain';
import type { PaginatedResult } from '../../client/types.js';
import type { UpdateUserInput, UserListParams, UserRepository } from '../../ports/user-repository.js';
import { mapProfileToUser } from './mappers/user-mapper.js';

export class SupabaseUserRepository implements UserRepository {
  constructor(private readonly client: SupabaseClient) {}

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

    const items = (data ?? []).map((row) =>
      mapProfileToUser(row, 'unknown@coach360.local'),
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

    return mapProfileToUser(data, 'unknown@coach360.local');
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
