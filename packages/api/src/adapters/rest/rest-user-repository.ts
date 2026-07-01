import type { User } from '@coach360/domain';
import { NotImplementedAdapterError } from '../../client/types.js';
import type { PaginatedResult } from '../../client/types.js';
import type { UserRepository } from '../../ports/user-repository.js';

export class RestUserRepository implements UserRepository {
  async list(_page?: number, _pageSize?: number): Promise<PaginatedResult<User>> {
    throw new NotImplementedAdapterError('rest', 'listUsers');
  }

  async getById(_id: string): Promise<User | null> {
    throw new NotImplementedAdapterError('rest', 'getUserById');
  }
}
