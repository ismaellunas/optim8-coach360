export { normalizeSupabaseUrl } from './client/normalize-supabase-url.js';
export {
  createSupabaseClient,
  type SupabaseEnv,
  type CreateSupabaseClientOptions,
} from './adapters/supabase/create-supabase-client.js';
export { createMemoryAuthStorage } from './adapters/supabase/memory-auth-storage.js';
export { SupabaseAppAuthRepository } from './adapters/supabase/supabase-app-auth-repository.js';
export { SupabaseProfileRepository } from './adapters/supabase/supabase-profile-repository.js';
export { SupabaseTeamRepository } from './adapters/supabase/supabase-team-repository.js';
export { SupabaseSubscriptionRepository } from './adapters/supabase/supabase-subscription-repository.js';
export { ApiError, NotImplementedAdapterError } from './client/types.js';
export type { PaginatedResult, ApiAdapterMode } from './client/types.js';
export { HttpClient } from './client/http-client.js';
export type { AuthRepository, SignInInput } from './ports/auth-repository.js';
export type { AppAuthRepository } from './ports/app-auth-repository.js';
export type { UserRepository } from './ports/user-repository.js';
export type { ProfileRepository } from './ports/profile-repository.js';
export type { TeamRepository, TeamLogoFile } from './ports/team-repository.js';
export type { AnalyticsRepository } from './ports/analytics-repository.js';
export type { SubscriptionRepository, SubscriptionSummary } from './ports/subscription-repository.js';
export type { ContentRepository, ContentItem } from './ports/content-repository.js';
export {
  createRepositories,
  resolveAdapterMode,
  type RepositoryBundle,
  type CreateRepositoriesOptions,
} from './di/create-repositories.js';
export { RepositoryProvider, useRepositories } from './di/repository-context.js';
