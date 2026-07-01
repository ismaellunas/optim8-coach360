import type { ApiAdapterMode } from '../client/types.js';
import type { AuthRepository } from '../ports/auth-repository.js';
import type { UserRepository } from '../ports/user-repository.js';
import type { SubscriptionRepository } from '../ports/subscription-repository.js';
import type { ContentRepository } from '../ports/content-repository.js';
import { RestAuthRepository } from '../adapters/rest/rest-auth-repository.js';
import { RestUserRepository } from '../adapters/rest/rest-user-repository.js';
import { RestSubscriptionRepository } from '../adapters/rest/rest-subscription-repository.js';
import { RestContentRepository } from '../adapters/rest/rest-content-repository.js';
import {
  createSupabaseClient,
  SupabaseAuthRepository,
  type SupabaseEnv,
} from '../adapters/supabase/supabase-auth-repository.js';
import { SupabaseUserRepository } from '../adapters/supabase/supabase-user-repository.js';
import { SupabaseSubscriptionRepository } from '../adapters/supabase/supabase-subscription-repository.js';
import { SupabaseContentRepository } from '../adapters/supabase/supabase-content-repository.js';

export type RepositoryBundle = {
  auth: AuthRepository;
  users: UserRepository;
  subscriptions: SubscriptionRepository;
  content: ContentRepository;
};

export type CreateRepositoriesOptions = {
  adapter: ApiAdapterMode;
  supabase?: SupabaseEnv;
  restBaseUrl?: string;
};

export function createRepositories(options: CreateRepositoriesOptions): RepositoryBundle {
  if (options.adapter === 'rest') {
    void options.restBaseUrl;
    return {
      auth: new RestAuthRepository(),
      users: new RestUserRepository(),
      subscriptions: new RestSubscriptionRepository(),
      content: new RestContentRepository(),
    };
  }

  if (!options.supabase?.url || !options.supabase.anonKey) {
    throw new Error('supabase_env_required');
  }

  const client = createSupabaseClient(options.supabase);

  return {
    auth: new SupabaseAuthRepository(client),
    users: new SupabaseUserRepository(client),
    subscriptions: new SupabaseSubscriptionRepository(client),
    content: new SupabaseContentRepository(),
  };
}

export function resolveAdapterMode(raw: string | undefined): ApiAdapterMode {
  return raw === 'rest' ? 'rest' : 'supabase';
}
