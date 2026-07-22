// STORY-8.2 — Compose and send rich messages

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DISABLED_CHAT_MESSAGE_TYPES,
  DISABLED_CHAT_MESSAGE_TOOLTIPS,
  MVP_CHAT_MESSAGE_TYPES,
  buildContentLinkAttachment,
  canSendTextOnChannelType,
  disabledChatMessageTooltip,
  isDisabledChatMessageType,
  isMvpChatMessageType,
  previewBodyForMessage,
} from '@coach360/domain';
import { REPO_ROOT } from '../helpers/supabase-test-env.js';

const RICH_SQL_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260722130000_chat_rich_messages.sql',
);
const DOMAIN_MESSAGE_PATH = path.join(
  REPO_ROOT,
  'packages',
  'domain',
  'src',
  'chat',
  'message.ts',
);
const MESSAGING_PORT_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'ports',
  'messaging-repository.ts',
);
const MESSAGING_REPO_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'adapters',
  'supabase',
  'supabase-messaging-repository.ts',
);
const REST_MESSAGING_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'adapters',
  'rest',
  'rest-messaging-repository.ts',
);
const CHAT_SCREEN_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'chat',
  'ui',
  'ChatScreen.jsx',
);
const BUBBLE_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'chat',
  'ui',
  'ChatMessageBubble.jsx',
);
const ATTACH_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'chat',
  'ui',
  'ChatAttachMenu.jsx',
);

describe('STORY_8_2 AC1 — text messages all channel types at Advanced+', () => {
  it('test_STORY_8_2_AC1_text_messages_all_channel_types_advanced_plus: domain gate + composer send paths', () => {
    expect(canSendTextOnChannelType('team', true)).toBe(true);
    expect(canSendTextOnChannelType('dm', true)).toBe(true);
    expect(canSendTextOnChannelType('p2p', true)).toBe(true);
    expect(canSendTextOnChannelType('team', false)).toBe(false);
    expect(isMvpChatMessageType('text')).toBe(true);
    expect(MVP_CHAT_MESSAGE_TYPES).toContain('text');

    const screen = readFileSync(CHAT_SCREEN_PATH, 'utf8');
    expect(screen).toMatch(/canSendTextOnChannelType/);
    expect(screen).toMatch(/messageType: 'text'/);
    expect(screen).toMatch(/sendChannelMessage/);
    expect(screen).toMatch(/sendDirectMessage/);
    expect(screen).toMatch(/canAccess\(user, 'chat'\)/);
    expect(screen).toMatch(/data-channel-type=\{activeType/);
  });
});

describe('STORY_8_2 AC2 — drill/content links as tappable cards', () => {
  it('test_STORY_8_2_AC2_drill_content_links_tappable_cards: schema, port, and card UI', () => {
    expect(existsSync(RICH_SQL_PATH)).toBe(true);
    const sql = readFileSync(RICH_SQL_PATH, 'utf8');
    expect(sql).toMatch(/message_type/);
    expect(sql).toMatch(/content_link/);
    expect(sql).toMatch(/attachment jsonb/);

    const link = buildContentLinkAttachment({
      kind: 'drill',
      source: 'library',
      id: 'drill-1',
      title: 'Form shooting',
    });
    expect(link.title).toBe('Form shooting');
    expect(previewBodyForMessage('content_link', '', link)).toBe('Form shooting');

    const port = readFileSync(MESSAGING_PORT_PATH, 'utf8');
    expect(port).toMatch(/messageType/);
    expect(port).toMatch(/content_link|ChatContentLinkAttachment|ChatMessageAttachment/);

    const repo = readFileSync(MESSAGING_REPO_PATH, 'utf8');
    expect(repo).toMatch(/message_type/);
    expect(repo).toMatch(/content_link/);

    expect(existsSync(BUBBLE_PATH)).toBe(true);
    const bubble = readFileSync(BUBBLE_PATH, 'utf8');
    expect(bubble).toMatch(/data-testid="chat-content-link-card"/);
    expect(bubble).toMatch(/onContentLinkClick/);

    const attach = readFileSync(ATTACH_PATH, 'utf8');
    expect(attach).toMatch(/chat-attach-content-link/);
    expect(attach).toMatch(/data-testid="chat-content-picker"/);

    const screen = readFileSync(CHAT_SCREEN_PATH, 'utf8');
    expect(screen).toMatch(/handleSendContentLink/);
    expect(screen).toMatch(/messageType: 'content_link'/);
  });
});

describe('STORY_8_2 AC3 — video attachment upload and playback', () => {
  it('test_STORY_8_2_AC3_video_attachment_upload_and_playback: storage, upload, player', () => {
    const sql = readFileSync(RICH_SQL_PATH, 'utf8');
    expect(sql).toMatch(/chat-media/);
    expect(sql).toMatch(/message_type in \('text', 'content_link', 'video'\)/);
    expect(sql).toMatch(/storagePath/);

    const repo = readFileSync(MESSAGING_REPO_PATH, 'utf8');
    expect(repo).toMatch(/uploadChatVideo/);
    expect(repo).toMatch(/chat-media/);
    expect(repo).toMatch(/messageType === 'video'|message_type: messageType/);

    const rest = readFileSync(REST_MESSAGING_PATH, 'utf8');
    expect(rest).toMatch(/uploadChatVideo/);

    const bubble = readFileSync(BUBBLE_PATH, 'utf8');
    expect(bubble).toMatch(/data-testid="chat-video-attachment"/);
    expect(bubble).toMatch(/SessionVideoPlayer/);

    const attach = readFileSync(ATTACH_PATH, 'utf8');
    expect(attach).toMatch(/chat-attach-video/);
    expect(attach).toMatch(/data-testid="chat-video-file-input"/);

    const screen = readFileSync(CHAT_SCREEN_PATH, 'utf8');
    expect(screen).toMatch(/handleSendVideoFile/);
    expect(screen).toMatch(/messageType: 'video'/);

    expect(existsSync(DOMAIN_MESSAGE_PATH)).toBe(true);
    expect(MVP_CHAT_MESSAGE_TYPES).toContain('video');
  });
});

describe('STORY_8_2 AC4 — out-of-scope types disabled with tooltip', () => {
  it('test_STORY_8_2_AC4_out_of_scope_types_disabled_with_tooltip: image/voice disabled UI', () => {
    expect(DISABLED_CHAT_MESSAGE_TYPES).toEqual(['image', 'voice']);
    expect(isDisabledChatMessageType('image')).toBe(true);
    expect(isDisabledChatMessageType('voice')).toBe(true);
    expect(isMvpChatMessageType('image')).toBe(false);
    expect(disabledChatMessageTooltip('image')).toBe(DISABLED_CHAT_MESSAGE_TOOLTIPS.image);
    expect(disabledChatMessageTooltip('voice')).toBe(DISABLED_CHAT_MESSAGE_TOOLTIPS.voice);

    const attach = readFileSync(ATTACH_PATH, 'utf8');
    expect(attach).toMatch(/DISABLED_CHAT_MESSAGE_TYPES/);
    expect(attach).toMatch(/disabledChatMessageTooltip/);
    expect(attach).toMatch(/chat-attach-\$\{type\}-disabled/);
    expect(attach).toMatch(/title=\{tooltip\}/);
    expect(attach).toMatch(/disabled/);
  });
});
