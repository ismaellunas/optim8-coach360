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
import type { OnboardingConfigRepository } from '../ports/onboarding-config-repository.js';
import type { AnalyticsRepository } from '../ports/analytics-repository.js';
import type { NotificationRepository } from '../ports/notification-repository.js';
import type { BillingRepository } from '../ports/billing-repository.js';
import type { SessionRepository } from '../ports/session-repository.js';
import type { SessionContentRepository } from '../ports/session-content-repository.js';
import type { LibraryRepository } from '../ports/library-repository.js';
import type { ContentAssignmentRepository } from '../ports/content-assignment-repository.js';
import type { MessagingRepository } from '../ports/messaging-repository.js';
import type { MarketplaceCatalogRepository } from '../ports/marketplace-catalog-repository.js';
import type { MarketplacePurchaseRepository } from '../ports/marketplace-purchase-repository.js';
import type { MarketplaceDripRepository } from '../ports/marketplace-drip-repository.js';
import type { ObjectivesRepository } from '../ports/objectives-repository.js';
import type { PackageRecommendationsRepository } from '../ports/package-recommendations-repository.js';
import type { MonitorRepository } from '../ports/monitor-repository.js';
import { RestAppAuthRepository } from '../adapters/rest/rest-app-auth-repository.js';
import { RestObjectivesRepository } from '../adapters/rest/rest-objectives-repository.js';
import { RestPackageRecommendationsRepository } from '../adapters/rest/rest-package-recommendations-repository.js';
import { SupabaseObjectivesRepository } from '../adapters/supabase/supabase-objectives-repository.js';
import { SupabasePackageRecommendationsRepository } from '../adapters/supabase/supabase-package-recommendations-repository.js';
import { SupabaseMonitorRepository } from '../adapters/supabase/supabase-monitor-repository.js';
import { RestAuthRepository } from '../adapters/rest/rest-auth-repository.js';
import { RestUserRepository } from '../adapters/rest/rest-user-repository.js';
import { RestSubscriptionRepository } from '../adapters/rest/rest-subscription-repository.js';
import { RestBillingRepository } from '../adapters/rest/rest-billing-repository.js';
import { RestContentRepository } from '../adapters/rest/rest-content-repository.js';
import { RestProfileRepository } from '../adapters/rest/rest-profile-repository.js';
import { RestTeamRepository } from '../adapters/rest/rest-team-repository.js';
import { RestRosterRepository } from '../adapters/rest/rest-roster-repository.js';
import { RestOnboardingConfigRepository } from '../adapters/rest/rest-onboarding-config-repository.js';
import { RestAnalyticsRepository } from '../adapters/rest/rest-analytics-repository.js';
import { RestSessionRepository } from '../adapters/rest/rest-session-repository.js';
import { RestSessionContentRepository } from '../adapters/rest/rest-session-content-repository.js';
import { RestLibraryRepository } from '../adapters/rest/rest-library-repository.js';
import { RestContentAssignmentRepository } from '../adapters/rest/rest-content-assignment-repository.js';
import { RestMessagingRepository } from '../adapters/rest/rest-messaging-repository.js';
import { RestMarketplaceCatalogRepository } from '../adapters/rest/rest-marketplace-catalog-repository.js';
import { RestMarketplacePurchaseRepository } from '../adapters/rest/rest-marketplace-purchase-repository.js';
import { RestMarketplaceDripRepository } from '../adapters/rest/rest-marketplace-drip-repository.js';
import { RestMonitorRepository } from '../adapters/rest/rest-monitor-repository.js';
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
import { SupabaseOnboardingConfigRepository } from '../adapters/supabase/supabase-onboarding-config-repository.js';
import { SupabaseSessionRepository } from '../adapters/supabase/supabase-session-repository.js';
import { SupabaseSessionContentRepository } from '../adapters/supabase/supabase-session-content-repository.js';
import { SupabaseLibraryRepository } from '../adapters/supabase/supabase-library-repository.js';
import { SupabaseContentAssignmentRepository } from '../adapters/supabase/supabase-content-assignment-repository.js';
import { SupabaseMessagingRepository } from '../adapters/supabase/supabase-messaging-repository.js';
import { SupabaseMarketplacePurchaseRepository } from '../adapters/supabase/supabase-marketplace-purchase-repository.js';
import { SupabaseMarketplaceDripRepository } from '../adapters/supabase/supabase-marketplace-drip-repository.js';
import {
  SanityMarketplaceCatalogRepository,
  type SanityCatalogEnv,
} from '../adapters/sanity/sanity-marketplace-catalog-repository.js';
import { ConsoleAnalyticsRepository } from '../adapters/console/console-analytics-repository.js';
import { ConsoleNotificationRepository } from '../adapters/console/console-notification-repository.js';

export type RepositoryBundle = {
  auth: AuthRepository;
  appAuth: AppAuthRepository;
  users: UserRepository;
  profiles: ProfileRepository;
  teams: TeamRepository;
  rosters: RosterRepository;
  onboardingConfig: OnboardingConfigRepository;
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
  marketplaceCatalog: MarketplaceCatalogRepository;
  marketplacePurchases: MarketplacePurchaseRepository;
  marketplaceDrip: MarketplaceDripRepository;
  objectives: ObjectivesRepository;
  packageRecommendations: PackageRecommendationsRepository;
  monitor: MonitorRepository;
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
  sanity?: SanityCatalogEnv;
};

function createMarketplaceCatalog(
  sanity: SanityCatalogEnv | undefined,
): MarketplaceCatalogRepository {
  if (sanity?.projectId?.trim()) {
    return new SanityMarketplaceCatalogRepository(sanity);
  }
  return new RestMarketplaceCatalogRepository();
}

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
      onboardingConfig: new RestOnboardingConfigRepository(),
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
      marketplaceCatalog: createMarketplaceCatalog(options.sanity),
      marketplacePurchases: new RestMarketplacePurchaseRepository(),
      marketplaceDrip: new RestMarketplaceDripRepository(),
      objectives: new RestObjectivesRepository(),
      packageRecommendations: new RestPackageRecommendationsRepository(),
      monitor: new RestMonitorRepository(),
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

  // One client for auth + data so sign-in session is shared with RPCs (e.g. set_trial_warning_days).
  const client = createSupabaseClient(options.supabase, clientAuthOptions);

  return {
    auth: new SupabaseAuthRepository(client),
    appAuth: new SupabaseAppAuthRepository(client),
    users: new SupabaseUserRepository(client),
    profiles: new SupabaseProfileRepository(client),
    teams: new SupabaseTeamRepository(client),
    rosters: new SupabaseRosterRepository(client),
    onboardingConfig: new SupabaseOnboardingConfigRepository(client),
    subscriptions: new SupabaseSubscriptionRepository(client),
    billing: new SupabaseBillingRepository(client),
    content: new SupabaseContentRepository(client),
    library: new SupabaseLibraryRepository(client),
    contentAssignments: new SupabaseContentAssignmentRepository(client),
    analytics: new ConsoleAnalyticsRepository(),
    notifications: new ConsoleNotificationRepository(),
    sessions: new SupabaseSessionRepository(client),
    sessionContent: new SupabaseSessionContentRepository(client),
    messaging: new SupabaseMessagingRepository(client),
    marketplaceCatalog: createMarketplaceCatalog(options.sanity),
    marketplacePurchases: new SupabaseMarketplacePurchaseRepository(client),
    marketplaceDrip: new SupabaseMarketplaceDripRepository(client),
    objectives: new SupabaseObjectivesRepository(client),
    packageRecommendations: new SupabasePackageRecommendationsRepository(client),
    monitor: new SupabaseMonitorRepository(client),
  };
}

export function resolveAdapterMode(raw: string | undefined): ApiAdapterMode {
  return raw === 'rest' ? 'rest' : 'supabase';
}
