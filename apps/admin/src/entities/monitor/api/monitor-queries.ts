import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@coach360/api';
import type { AiRecommendationConfig } from '@coach360/domain';

export const platformAnalyticsQueryKey = ['admin', 'monitor', 'analytics'] as const;
export const aiRecommendationConfigQueryKey = ['admin', 'monitor', 'ai-config'] as const;
export const healthSummaryQueryKey = ['admin', 'monitor', 'health'] as const;
export const chatChannelsQueryKey = ['admin', 'monitor', 'chat-channels'] as const;
export const chatMessagesQueryKey = (channelId: string) =>
  ['admin', 'monitor', 'chat-messages', channelId] as const;

export function usePlatformAnalyticsQuery(days = 14) {
  const repos = useRepositories();
  return useQuery({
    queryKey: [...platformAnalyticsQueryKey, days] as const,
    queryFn: () => repos.monitor.getPlatformAnalytics(days),
  });
}

export function useAiRecommendationConfigQuery() {
  const repos = useRepositories();
  return useQuery({
    queryKey: aiRecommendationConfigQueryKey,
    queryFn: () => repos.monitor.getAiRecommendationConfig(),
  });
}

export function useSetAiRecommendationConfigMutation() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: AiRecommendationConfig) =>
      repos.monitor.setAiRecommendationConfig(config),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: aiRecommendationConfigQueryKey });
    },
  });
}

export function useHealthSummaryQuery(hours = 24) {
  const repos = useRepositories();
  return useQuery({
    queryKey: [...healthSummaryQueryKey, hours] as const,
    queryFn: () => repos.monitor.getHealthSummary(hours),
  });
}

export function useAdminChatChannelsQuery() {
  const repos = useRepositories();
  return useQuery({
    queryKey: chatChannelsQueryKey,
    queryFn: () => repos.messaging.adminListChannels(),
  });
}

export function useAdminChatMessagesQuery(channelId: string | null) {
  const repos = useRepositories();
  return useQuery({
    queryKey: chatMessagesQueryKey(channelId ?? ''),
    queryFn: () => repos.messaging.adminListChannelMessages(channelId as string),
    enabled: channelId !== null,
  });
}

export function useAdminSetMessageHiddenMutation() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { messageId: string; hidden: boolean; reason?: string | null; channelId: string }) =>
      repos.messaging.adminSetMessageHidden(args.messageId, args.hidden, args.reason),
    onSuccess: async (_data, args) => {
      await queryClient.invalidateQueries({ queryKey: chatMessagesQueryKey(args.channelId) });
      await queryClient.invalidateQueries({ queryKey: chatChannelsQueryKey });
    },
  });
}
