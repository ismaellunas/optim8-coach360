import type { OnboardingConfig } from '@coach360/domain';
import { NotImplementedAdapterError } from '../../client/types.js';
import type { OnboardingConfigRepository } from '../../ports/onboarding-config-repository.js';

export class RestOnboardingConfigRepository implements OnboardingConfigRepository {
  async getConfig(): Promise<OnboardingConfig> {
    throw new NotImplementedAdapterError('rest', 'getOnboardingConfig');
  }

  async setConfig(config: OnboardingConfig): Promise<OnboardingConfig> {
    void config;
    throw new NotImplementedAdapterError('rest', 'setOnboardingConfig');
  }
}
