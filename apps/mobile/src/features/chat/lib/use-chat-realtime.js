import { useEffect } from 'react';

/**
 * Subscribe to Supabase Realtime inserts for a chat channel.
 * Cleanup runs on channel/deps change.
 *
 * @param {import('@coach360/api').MessagingRepository | null | undefined} messaging
 * @param {string | null | undefined} channelId
 * @param {(message: import('@coach360/api').ChatMessage) => void} onMessage
 */
export function useChatRealtime(messaging, channelId, onMessage) {
  useEffect(
    function () {
      if (!messaging || !channelId) {
        return undefined;
      }

      return messaging.subscribeToChannel(channelId, onMessage);
    },
    [messaging, channelId, onMessage],
  );
}
