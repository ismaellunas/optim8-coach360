import type { SupabaseClient } from '@supabase/supabase-js';
import {
  normalizeOnboardingConfigInput,
  parseOnboardingConfig,
  type OnboardingConfig,
} from '@coach360/domain';
import type { OnboardingConfigRepository } from '../../ports/onboarding-config-repository.js';

export class SupabaseOnboardingConfigRepository implements OnboardingConfigRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getConfig(): Promise<OnboardingConfig> {
    const { data, error } = await this.client.rpc('get_onboarding_config');
    if (error) {
      throw new Error(error.message);
    }
    return parseOnboardingConfig(data);
  }

  async setConfig(config: OnboardingConfig): Promise<OnboardingConfig> {
    const normalized = normalizeOnboardingConfigInput(config);
    const { data, error } = await this.client.rpc('set_onboarding_config', {
      p_config: normalized,
    });
    if (error) {
      throw new Error(error.message);
    }
    return parseOnboardingConfig(data);
  }
}
