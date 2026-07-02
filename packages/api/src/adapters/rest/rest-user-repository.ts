import type { User } from '@coach360/domain';
import { NotImplementedAdapterError } from '../../client/types.js';
import type { PaginatedResult } from '../../client/types.js';
import type { UserRepository } from '../../ports/user-repository.js';

export class RestUserRepository implements UserRepository {
  async list(page?: number, pageSize?: number): Promise<PaginatedResult<User>> {
    void page;
    void pageSize;
    throw new NotImplementedAdapterError('rest', 'listUsers');
  }

  async getById(id: string): Promise<User | null> {
    void id;
    throw new NotImplementedAdapterError('rest', 'getUserById');
  }
}
