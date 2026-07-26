import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@coach360/api';
import type { OnboardingConfig } from '@coach360/domain';

export const onboardingConfigQueryKey = ['admin', 'onboarding-config'] as const;

export function useOnboardingConfigQuery() {
  const repos = useRepositories();
  return useQuery({
    queryKey: onboardingConfigQueryKey,
    queryFn: () => repos.onboardingConfig.getConfig(),
  });
}

export function useSetOnboardingConfigMutation() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: OnboardingConfig) => repos.onboardingConfig.setConfig(config),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: onboardingConfigQueryKey });
    },
  });
}
