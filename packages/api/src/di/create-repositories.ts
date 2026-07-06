import type { SupportedStorage } from '@supabase/supabase-js';
import type { ApiAdapterMode } from '../client/types.js';
import type { AppAuthRepository } from '../ports/app-auth-repository.js';
import type { AuthRepository } from '../ports/auth-repository.js';
import type { UserRepository } from '../ports/user-repository.js';
import type { SubscriptionRepository } from '../ports/subscription-repository.js';
import type { ContentRepository } from '../ports/content-repository.js';
import type { ProfileRepository } from '../ports/profile-repository.js';
import { RestAppAuthRepository } from '../adapters/rest/rest-app-auth-repository.js';
import { RestAuthRepository } from '../adapters/rest/rest-auth-repository.js';
import { RestUserRepository } from '../adapters/rest/rest-user-repository.js';
import { RestSubscriptionRepository } from '../adapters/rest/rest-subscription-repository.js';
import { RestContentRepository } from '../adapters/rest/rest-content-repository.js';
import { RestProfileRepository } from '../adapters/rest/rest-profile-repository.js';
import {
  createSupabaseClient,
  SupabaseAppAuthRepository,
  SupabaseAuthRepository,
  type SupabaseEnv,
  type CreateSupabaseClientOptions,
} from '../adapters/supabase/index.js';
import { SupabaseUserRepository } from '../adapters/supabase/supabase-user-repository.js';
import { SupabaseSubscriptionRepository } from '../adapters/supabase/supabase-subscription-repository.js';
import { SupabaseContentRepository } from '../adapters/supabase/supabase-content-repository.js';
import { SupabaseProfileRepository } from '../adapters/supabase/supabase-profile-repository.js';

export type RepositoryBundle = {
  auth: AuthRepository;
  appAuth: AppAuthRepository;
  users: UserRepository;
  profiles: ProfileRepository;
  subscriptions: SubscriptionRepository;
  content: ContentRepository;
};

export type SupabaseClientAuthOptions = {
  storage?: SupportedStorage;
  detectSessionInUrl?: boolean;
};

export type CreateRepositoriesOptions = {
  adapter: ApiAdapterMode;
  supabase?: SupabaseEnv;
  supabaseClientAuth?: SupabaseClientAuthOptions;
  restBaseUrl?: string;
};

export function createRepositories(options: CreateRepositoriesOptions): RepositoryBundle {
  if (options.adapter === 'rest') {
    void options.restBaseUrl;
    return {
      auth: new RestAuthRepository(),
      appAuth: new RestAppAuthRepository(),
      users: new RestUserRepository(),
      profiles: new RestProfileRepository(),
      subscriptions: new RestSubscriptionRepository(),
      content: new RestContentRepository(),
    };
  }

  if (!options.supabase?.url || !options.supabase.anonKey) {
    throw new Error('supabase_env_required');
  }

  const clientAuthOptions: CreateSupabaseClientOptions = {
    detectSessionInUrl: options.supabaseClientAuth?.detectSessionInUrl ?? true,
  };
  if (options.supabaseClientAuth?.storage) {
    clientAuthOptions.storage = options.supabaseClientAuth.storage;
  }

  const adminClient = createSupabaseClient(options.supabase, clientAuthOptions);
  const appClient = createSupabaseClient(options.supabase, clientAuthOptions);

  return {
    auth: new SupabaseAuthRepository(adminClient),
    appAuth: new SupabaseAppAuthRepository(appClient),
    users: new SupabaseUserRepository(appClient),
    profiles: new SupabaseProfileRepository(appClient),
    subscriptions: new SupabaseSubscriptionRepository(appClient),
    content: new SupabaseContentRepository(),
  };
}

export function resolveAdapterMode(raw: string | undefined): ApiAdapterMode {
  return raw === 'rest' ? 'rest' : 'supabase';
}
