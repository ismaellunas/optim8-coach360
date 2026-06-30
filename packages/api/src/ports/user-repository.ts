import type { User } from '@coach360/domain';
import type { PaginatedResult } from '../client/types.js';

export interface UserRepository {
  list(page?: number, pageSize?: number): Promise<PaginatedResult<User>>;
  getById(id: string): Promise<User | null>;
}
