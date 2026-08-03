import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@coach360/api';
import type { SubscriptionTier, TierCatalogDisplayOverride } from '@coach360/domain';

export const subscriptionSummariesQueryKey = ['admin', 'subscriptions'] as const;
export const trialWarningDaysQueryKey = ['admin', 'trial-warning-days'] as const;
export const trialDurationDaysQueryKey = ['admin', 'trial-duration-days'] as const;
export const tierCatalogOverridesQueryKey = ['admin', 'tier-catalog-overrides'] as const;
export const revenueSummaryQueryKey = ['admin', 'billing-revenue'] as const;
export const userSubscriptionQueryKey = (userId: string) =>
  ['admin', 'users', userId, 'subscription'] as const;

export function useSubscriptionSummariesQuery() {
  const repos = useRepositories();
  return useQuery({
    queryKey: subscriptionSummariesQueryKey,
    queryFn: () => repos.subscriptions.listSummaries(),
  });
}

export function useTrialWarningDaysQuery() {
  const repos = useRepositories();
  return useQuery({
    queryKey: trialWarningDaysQueryKey,
    queryFn: () => repos.subscriptions.getTrialWarningDays(),
  });
}

export function useSetTrialWarningDaysMutation() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (days: number) => repos.subscriptions.setTrialWarningDays(days),
    onSuccess: (days) => {
      queryClient.setQueryData(trialWarningDaysQueryKey, days);
    },
  });
}

export function useTrialDurationDaysQuery() {
  const repos = useRepositories();
  return useQuery({
    queryKey: trialDurationDaysQueryKey,
    queryFn: () => repos.subscriptions.getTrialDurationDays(),
  });
}

export function useSetTrialDurationDaysMutation() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (days: number) => repos.subscriptions.setTrialDurationDays(days),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: trialDurationDaysQueryKey });
    },
  });
}

export function useTierCatalogOverridesQuery() {
  const repos = useRepositories();
  return useQuery({
    queryKey: tierCatalogOverridesQueryKey,
    queryFn: () => repos.subscriptions.getTierCatalogOverrides(),
  });
}

export function useSetTierCatalogOverridesMutation() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (overrides: TierCatalogDisplayOverride[]) =>
      repos.subscriptions.setTierCatalogOverrides(overrides),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tierCatalogOverridesQueryKey });
    },
  });
}

export function useRevenueSummaryQuery() {
  const repos = useRepositories();
  return useQuery({
    queryKey: revenueSummaryQueryKey,
    queryFn: () => repos.billing.getRevenueSummary(),
  });
}

export function useUserSubscriptionQuery(userId: string | null) {
  const repos = useRepositories();
  return useQuery({
    queryKey: userSubscriptionQueryKey(userId ?? ''),
    queryFn: () => repos.subscriptions.getByProfileId(userId as string),
    enabled: userId !== null,
  });
}

export function useOverrideUserTierMutation() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { profileId: string; tier: SubscriptionTier }) =>
      repos.subscriptions.overrideUserTier(args.profileId, args.tier),
    onSuccess: async (_data, args) => {
      await queryClient.invalidateQueries({ queryKey: userSubscriptionQueryKey(args.profileId) });
      await queryClient.invalidateQueries({ queryKey: subscriptionSummariesQueryKey });
      await queryClient.invalidateQueries({ queryKey: revenueSummaryQueryKey });
    },
  });
}
