import type { User } from '@coach360/domain';
import { NotImplementedAdapterError } from '../../client/types.js';
import type { PaginatedResult } from '../../client/types.js';
import type { UpdateUserInput, UserListParams, UserRepository } from '../../ports/user-repository.js';

export class RestUserRepository implements UserRepository {
  async list(params?: UserListParams): Promise<PaginatedResult<User>> {
    void params;
    throw new NotImplementedAdapterError('rest', 'listUsers');
  }

  async getById(id: string): Promise<User | null> {
    void id;
    throw new NotImplementedAdapterError('rest', 'getUserById');
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<User> {
    void id;
    void input;
    throw new NotImplementedAdapterError('rest', 'updateUser');
  }
}
