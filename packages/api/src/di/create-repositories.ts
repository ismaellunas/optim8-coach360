import type { SupportedStorage } from '@supabase/supabase-js';
import type { ApiAdapterMode } from '../client/types.js';
import type { AppAuthRepository } from '../ports/app-auth-repository.js';
import type { AuthRepository } from '../ports/auth-repository.js';
import type { UserRepository } from '../ports/user-repository.js';
import type { SubscriptionRepository } from '../ports/subscription-repository.js';
import type { ContentRepository } from '../ports/content-repository.js';
import type { ProfileRepository } from '../ports/profile-repository.js';
import type { TeamRepository } from '../ports/team-repository.js';
import type { RosterRepository } from '../ports/roster-repository.js';
import type { AnalyticsRepository } from '../ports/analytics-repository.js';
import type { NotificationRepository } from '../ports/notification-repository.js';
import type { BillingRepository } from '../ports/billing-repository.js';
import type { SessionRepository } from '../ports/session-repository.js';
import type { SessionContentRepository } from '../ports/session-content-repository.js';
import type { LibraryRepository } from '../ports/library-repository.js';
import type { ContentAssignmentRepository } from '../ports/content-assignment-repository.js';
import type { MessagingRepository } from '../ports/messaging-repository.js';
import { RestAppAuthRepository } from '../adapters/rest/rest-app-auth-repository.js';
import { RestAuthRepository } from '../adapters/rest/rest-auth-repository.js';
import { RestUserRepository } from '../adapters/rest/rest-user-repository.js';
import { RestSubscriptionRepository } from '../adapters/rest/rest-subscription-repository.js';
import { RestBillingRepository } from '../adapters/rest/rest-billing-repository.js';
import { RestContentRepository } from '../adapters/rest/rest-content-repository.js';
import { RestProfileRepository } from '../adapters/rest/rest-profile-repository.js';
import { RestTeamRepository } from '../adapters/rest/rest-team-repository.js';
import { RestRosterRepository } from '../adapters/rest/rest-roster-repository.js';
import { RestAnalyticsRepository } from '../adapters/rest/rest-analytics-repository.js';
import { RestSessionRepository } from '../adapters/rest/rest-session-repository.js';
import { RestSessionContentRepository } from '../adapters/rest/rest-session-content-repository.js';
import { RestLibraryRepository } from '../adapters/rest/rest-library-repository.js';
import { RestContentAssignmentRepository } from '../adapters/rest/rest-content-assignment-repository.js';
import { RestMessagingRepository } from '../adapters/rest/rest-messaging-repository.js';
import {
  createSupabaseClient,
  SupabaseAppAuthRepository,
  SupabaseAuthRepository,
  type SupabaseEnv,
  type CreateSupabaseClientOptions,
} from '../adapters/supabase/index.js';
import { SupabaseUserRepository } from '../adapters/supabase/supabase-user-repository.js';
import { SupabaseSubscriptionRepository } from '../adapters/supabase/supabase-subscription-repository.js';
import { SupabaseBillingRepository } from '../adapters/supabase/supabase-billing-repository.js';
import { SupabaseContentRepository } from '../adapters/supabase/supabase-content-repository.js';
import { SupabaseProfileRepository } from '../adapters/supabase/supabase-profile-repository.js';
import { SupabaseTeamRepository } from '../adapters/supabase/supabase-team-repository.js';
import { SupabaseRosterRepository } from '../adapters/supabase/supabase-roster-repository.js';
import { SupabaseSessionRepository } from '../adapters/supabase/supabase-session-repository.js';
import { SupabaseSessionContentRepository } from '../adapters/supabase/supabase-session-content-repository.js';
import { SupabaseLibraryRepository } from '../adapters/supabase/supabase-library-repository.js';
import { SupabaseContentAssignmentRepository } from '../adapters/supabase/supabase-content-assignment-repository.js';
import { SupabaseMessagingRepository } from '../adapters/supabase/supabase-messaging-repository.js';
import { ConsoleAnalyticsRepository } from '../adapters/console/console-analytics-repository.js';
import { ConsoleNotificationRepository } from '../adapters/console/console-notification-repository.js';

export type RepositoryBundle = {
  auth: AuthRepository;
  appAuth: AppAuthRepository;
  users: UserRepository;
  profiles: ProfileRepository;
  teams: TeamRepository;
  rosters: RosterRepository;
  subscriptions: SubscriptionRepository;
  billing: BillingRepository;
  content: ContentRepository;
  library: LibraryRepository;
  contentAssignments: ContentAssignmentRepository;
  analytics: AnalyticsRepository;
  notifications: NotificationRepository;
  sessions: SessionRepository;
  sessionContent: SessionContentRepository;
  messaging: MessagingRepository;
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
      teams: new RestTeamRepository(),
      rosters: new RestRosterRepository(),
      subscriptions: new RestSubscriptionRepository(),
      billing: new RestBillingRepository(),
      content: new RestContentRepository(),
      library: new RestLibraryRepository(),
      contentAssignments: new RestContentAssignmentRepository(),
      analytics: new RestAnalyticsRepository(),
      notifications: new ConsoleNotificationRepository(),
      sessions: new RestSessionRepository(),
      sessionContent: new RestSessionContentRepository(),
      messaging: new RestMessagingRepository(),
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
    teams: new SupabaseTeamRepository(appClient),
    rosters: new SupabaseRosterRepository(appClient),
    subscriptions: new SupabaseSubscriptionRepository(appClient),
    billing: new SupabaseBillingRepository(appClient),
    content: new SupabaseContentRepository(appClient),
    library: new SupabaseLibraryRepository(appClient),
    contentAssignments: new SupabaseContentAssignmentRepository(appClient),
    analytics: new ConsoleAnalyticsRepository(),
    notifications: new ConsoleNotificationRepository(),
    sessions: new SupabaseSessionRepository(appClient),
    sessionContent: new SupabaseSessionContentRepository(appClient),
    messaging: new SupabaseMessagingRepository(appClient),
  };
}

export function resolveAdapterMode(raw: string | undefined): ApiAdapterMode {
  return raw === 'rest' ? 'rest' : 'supabase';
}
