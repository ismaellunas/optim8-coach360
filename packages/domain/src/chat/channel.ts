export const CHAT_CHANNEL_TYPES = ['team', 'dm', 'p2p'] as const;

export type ChatChannelType = (typeof CHAT_CHANNEL_TYPES)[number];

export function isChatChannelType(value: string): value is ChatChannelType {
  return (CHAT_CHANNEL_TYPES as readonly string[]).includes(value);
}

/** Deterministic pair order for unique dm/p2p channels. */
export function sortMemberPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function computeUnreadCount(unreadMessages: number): number {
  return Math.max(0, Math.floor(unreadMessages));
}

export function conversationTypeLabel(type: ChatChannelType): string {
  if (type === 'team') {
    return 'team';
  }
  if (type === 'p2p') {
    return 'p2p';
  }
  return 'dm';
}
