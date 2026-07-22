import type { ChatChannelType } from './channel.js';
import {
  sessionContentKindSchema,
  sessionContentSourceSchema,
  type SessionContentKind,
  type SessionContentSource,
} from '../session/content-refs.js';
import { z } from 'zod';

/** Message kinds that can be composed and persisted in MVP (Q 5.2 interim). */
export const MVP_CHAT_MESSAGE_TYPES = ['text', 'content_link', 'video'] as const;

export type MvpChatMessageType = (typeof MVP_CHAT_MESSAGE_TYPES)[number];

/** Compose options shown disabled with tooltip until post-MVP. */
export const DISABLED_CHAT_MESSAGE_TYPES = ['image', 'voice'] as const;

export type DisabledChatMessageType = (typeof DISABLED_CHAT_MESSAGE_TYPES)[number];

export const DISABLED_CHAT_MESSAGE_TOOLTIPS: Record<DisabledChatMessageType, string> = {
  image: 'Image attachments are not available in MVP.',
  voice: 'Voice notes are not available in MVP.',
};

export const chatContentLinkAttachmentSchema = z.object({
  kind: sessionContentKindSchema,
  source: sessionContentSourceSchema,
  id: z.string().min(1),
  title: z.string().trim().min(1),
});

export type ChatContentLinkAttachment = z.infer<typeof chatContentLinkAttachmentSchema>;

export const chatVideoAttachmentSchema = z.object({
  url: z.string().url(),
  storagePath: z.string().min(1),
  mimeType: z.string().min(1).optional(),
  fileName: z.string().min(1).optional(),
});

export type ChatVideoAttachment = z.infer<typeof chatVideoAttachmentSchema>;

export type ChatMessageAttachment = ChatContentLinkAttachment | ChatVideoAttachment;

export function isMvpChatMessageType(value: string): value is MvpChatMessageType {
  return (MVP_CHAT_MESSAGE_TYPES as readonly string[]).includes(value);
}

export function isDisabledChatMessageType(value: string): value is DisabledChatMessageType {
  return (DISABLED_CHAT_MESSAGE_TYPES as readonly string[]).includes(value);
}

export function disabledChatMessageTooltip(type: DisabledChatMessageType): string {
  return DISABLED_CHAT_MESSAGE_TOOLTIPS[type];
}

/** Advanced+ text compose is allowed on every channel type once chat is unlocked. */
export function canSendTextOnChannelType(
  channelType: ChatChannelType,
  chatAllowed: boolean,
): boolean {
  if (!chatAllowed) {
    return false;
  }
  return channelType === 'team' || channelType === 'dm' || channelType === 'p2p';
}

export function previewBodyForMessage(
  messageType: MvpChatMessageType,
  body: string,
  attachment: ChatMessageAttachment | null | undefined,
): string {
  const trimmed = body.trim();
  if (trimmed) {
    return trimmed;
  }
  if (messageType === 'content_link' && attachment && 'title' in attachment) {
    return attachment.title;
  }
  if (messageType === 'video') {
    return 'Video';
  }
  return '';
}

export function buildContentLinkAttachment(input: {
  kind: SessionContentKind;
  source: SessionContentSource;
  id: string;
  title: string;
}): ChatContentLinkAttachment {
  return chatContentLinkAttachmentSchema.parse(input);
}

export function isContentLinkAttachment(
  attachment: ChatMessageAttachment | null | undefined,
): attachment is ChatContentLinkAttachment {
  return Boolean(attachment && 'kind' in attachment && 'title' in attachment && !('url' in attachment));
}

export function isVideoAttachment(
  attachment: ChatMessageAttachment | null | undefined,
): attachment is ChatVideoAttachment {
  return Boolean(attachment && 'url' in attachment && 'storagePath' in attachment);
}
