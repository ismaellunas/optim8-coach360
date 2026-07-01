import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@coach360/domain';
import type { PaginatedResult } from '../../client/types.js';
import type { UserRepository } from '../../ports/user-repository.js';
import { mapProfileToUser } from './mappers/user-mapper.js';

export class SupabaseUserRepository implements UserRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(page = 1, pageSize = 20): Promise<PaginatedResult<User>> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await this.client
      .from('profiles')
      .select('id, role, display_name, is_suspended', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

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
}
