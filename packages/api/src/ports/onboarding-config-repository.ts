import type { OnboardingConfig } from '@coach360/domain';

export type OnboardingConfigRepository = {
  getConfig(): Promise<OnboardingConfig>;
  setConfig(config: OnboardingConfig): Promise<OnboardingConfig>;
};
