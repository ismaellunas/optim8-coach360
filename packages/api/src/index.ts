export { ApiError, NotImplementedAdapterError } from './client/types.js';
export type { PaginatedResult, ApiAdapterMode } from './client/types.js';
export { HttpClient } from './client/http-client.js';
export type { AuthRepository, SignInInput } from './ports/auth-repository.js';
export type { UserRepository } from './ports/user-repository.js';
export type { SubscriptionRepository, SubscriptionSummary } from './ports/subscription-repository.js';
export type { ContentRepository, ContentItem } from './ports/content-repository.js';
export {
  createRepositories,
  resolveAdapterMode,
  type RepositoryBundle,
  type CreateRepositoriesOptions,
} from './di/create-repositories.js';
export { RepositoryProvider, useRepositories } from './di/repository-context.js';
