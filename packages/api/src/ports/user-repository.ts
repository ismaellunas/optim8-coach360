import type { AppRole, User } from '@coach360/domain';
import type { PaginatedResult } from '../client/types.js';

export type UserListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export type UpdateUserInput = {
  displayName?: string;
  role?: AppRole;
  isSuspended?: boolean;
};

export interface UserRepository {
  list(params?: UserListParams): Promise<PaginatedResult<User>>;
  getById(id: string): Promise<User | null>;
  updateUser(id: string, input: UpdateUserInput): Promise<User>;
}
