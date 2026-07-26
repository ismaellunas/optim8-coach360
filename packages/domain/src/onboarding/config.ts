import { z } from 'zod';

/** platform_settings key for admin-editable onboarding configuration (STORY-12.5). */
export const ONBOARDING_CONFIG_SETTING_KEY = 'onboarding_config';

export const onboardingRoleSchema = z.enum(['coach', 'player']);
export type OnboardingRole = z.infer<typeof onboardingRoleSchema>;

export const onboardingStepConfigSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  mandatory: z.boolean(),
});
export type OnboardingStepConfig = z.infer<typeof onboardingStepConfigSchema>;

export const onboardingWelcomeCopySchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
});
export type OnboardingWelcomeCopy = z.infer<typeof onboardingWelcomeCopySchema>;

export const onboardingRoleConfigSchema = z.object({
  welcome: onboardingWelcomeCopySchema,
  steps: z.array(onboardingStepConfigSchema).min(1),
});
export type OnboardingRoleConfig = z.infer<typeof onboardingRoleConfigSchema>;

export const onboardingConfigSchema = z.object({
  coach: onboardingRoleConfigSchema,
  player: onboardingRoleConfigSchema,
});
export type OnboardingConfig = z.infer<typeof onboardingConfigSchema>;

/**
 * Code-defined default onboarding flow. Admin overrides are stored in
 * platform_settings and merged over these defaults, so welcome copy and
 * mandatory/optional step flags change without a client redeploy.
 */
export const DEFAULT_ONBOARDING_CONFIG: OnboardingConfig = {
  coach: {
    welcome: {
      title: 'Welcome!',
      body: 'Welcome to Coach360! This quick guide shows you how to browse training content, plan sessions, and share with players.',
    },
    steps: [
      {
        id: 'welcome',
        title: 'Welcome!',
        description:
          'Welcome to Coach360! This quick guide shows you how to browse training content, plan sessions, and share with players.',
        mandatory: true,
      },
      {
        id: 'profile',
        title: 'Your profile',
        description:
          'Your coach profile is ready. You can work independently with individual players — creating a team and sending invites can wait until you are ready from Roster.',
        mandatory: false,
      },
      {
        id: 'marketplace',
        title: 'Browse training packages',
        description:
          'Discover curated drills and programs in the marketplace. Browsing is free — buy only when you are ready.',
        mandatory: false,
      },
      {
        id: 'session',
        title: 'Plan your first session',
        description:
          'Create a session with drills and content. Open the schedule when you are ready to plan your first practice.',
        mandatory: false,
      },
      {
        id: 'share',
        title: 'Share with players',
        description:
          'Optionally share sessions with individual players or a team. You can skip this and invite players later from Roster.',
        mandatory: false,
      },
    ],
  },
  player: {
    welcome: {
      title: 'Welcome!',
      body: 'Welcome to Coach360! This quick guide shows you how to browse training content, complete your first drill, and track progress.',
    },
    steps: [
      {
        id: 'welcome',
        title: 'Welcome!',
        description:
          'Welcome to Coach360! This quick guide shows you how to browse training content, complete your first drill, and track progress.',
        mandatory: true,
      },
      {
        id: 'profile',
        title: 'Your profile',
        description:
          'Your player profile is ready. You can train independently — joining a team can wait until you have an invite from your coach.',
        mandatory: false,
      },
      {
        id: 'browse',
        title: 'Browse training content',
        description:
          'Explore the marketplace and any drills assigned to you by a coach. Browsing is free — buy only when you are ready.',
        mandatory: false,
      },
      {
        id: 'drill',
        title: 'Start your first drill',
        description:
          'Complete a quick drill to start tracking your progress. Log your first result when you are ready.',
        mandatory: false,
      },
      {
        id: 'progress',
        title: 'Track your progress',
        description:
          'Your completed drills appear in your profile and progress tab. Keep training to build your stats.',
        mandatory: false,
      },
      {
        id: 'team',
        title: 'Join a team',
        description:
          'Optionally join a team with an invite code from your coach. You can skip this and join later from Roster.',
        mandatory: false,
      },
    ],
  },
};

function mergeRoleConfig(
  defaults: OnboardingRoleConfig,
  override: unknown,
): OnboardingRoleConfig {
  const source = (override ?? {}) as Record<string, unknown>;
  const welcomeSource = (source.welcome ?? {}) as Record<string, unknown>;
  const overrideSteps = Array.isArray(source.steps)
    ? (source.steps as Array<Record<string, unknown>>)
    : [];
  const overrideById = new Map(
    overrideSteps
      .filter((step) => typeof step?.id === 'string')
      .map((step) => [step.id as string, step]),
  );

  return {
    welcome: {
      title:
        typeof welcomeSource.title === 'string' && welcomeSource.title.trim()
          ? welcomeSource.title
          : defaults.welcome.title,
      body:
        typeof welcomeSource.body === 'string' && welcomeSource.body.trim()
          ? welcomeSource.body
          : defaults.welcome.body,
    },
    steps: defaults.steps.map((step) => {
      const o = overrideById.get(step.id);
      return {
        id: step.id,
        title:
          o && typeof o.title === 'string' && o.title.trim() ? o.title : step.title,
        description:
          o && typeof o.description === 'string' && o.description.trim()
            ? o.description
            : step.description,
        mandatory:
          o && typeof o.mandatory === 'boolean' ? o.mandatory : step.mandatory,
      };
    }),
  };
}

/**
 * Merge stored admin overrides over the code defaults. Unknown or malformed
 * input falls back to defaults so the mobile onboarding never breaks.
 */
export function mergeOnboardingConfig(override: unknown): OnboardingConfig {
  const source = (override ?? {}) as Record<string, unknown>;
  return {
    coach: mergeRoleConfig(DEFAULT_ONBOARDING_CONFIG.coach, source.coach),
    player: mergeRoleConfig(DEFAULT_ONBOARDING_CONFIG.player, source.player),
  };
}

/** Parse stored settings JSON into a complete, valid onboarding config. */
export function parseOnboardingConfig(raw: unknown): OnboardingConfig {
  return onboardingConfigSchema.parse(mergeOnboardingConfig(raw));
}

/** Normalize an admin-submitted config before persisting it. */
export function normalizeOnboardingConfigInput(input: unknown): OnboardingConfig {
  return onboardingConfigSchema.parse(mergeOnboardingConfig(input));
}
