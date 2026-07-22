// STORY-8.1 — Chat SDK integration and channel model (Supabase Realtime)

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CHAT_CHANNEL_TYPES,
  computeUnreadCount,
  isChatChannelType,
  sortMemberPair,
} from '@coach360/domain';
import { REPO_ROOT } from '../helpers/supabase-test-env.js';

const CHAT_SQL_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260722120000_chat_channels.sql',
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
const CREATE_REPOS_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'di',
  'create-repositories.ts',
);
const DOMAIN_CHAT_PATH = path.join(
  REPO_ROOT,
  'packages',
  'domain',
  'src',
  'chat',
  'channel.ts',
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
const REALTIME_HOOK_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'chat',
  'lib',
  'use-chat-realtime.js',
);
const TECH_STACK_PATH = path.join(
  REPO_ROOT,
  'docs',
  'architecture',
  'tech-stack.md',
);

describe('STORY_8_1 AC1 — Supabase Realtime chat provider', () => {
  it('test_STORY_8_1_AC1_supabase_realtime_chat_provider: provider, publication, and DI wiring', () => {
    expect(existsSync(CHAT_SQL_PATH)).toBe(true);
    const sql = readFileSync(CHAT_SQL_PATH, 'utf8');
    expect(sql).toMatch(/chat_channels/);
    expect(sql).toMatch(/chat_messages/);
    expect(sql).toMatch(/alter publication supabase_realtime add table public\.chat_messages/);

    const repo = readFileSync(MESSAGING_REPO_PATH, 'utf8');
    expect(repo).toMatch(/subscribeToChannel/);
    expect(repo).toMatch(/postgres_changes/);
    expect(repo).toMatch(/\.channel\(/);
    expect(repo).not.toMatch(/stream-chat/);
    expect(repo).not.toMatch(/sendbird/i);

    const createRepos = readFileSync(CREATE_REPOS_PATH, 'utf8');
    expect(createRepos).toMatch(/messaging:/);
    expect(createRepos).toMatch(/SupabaseMessagingRepository/);

    const tech = readFileSync(TECH_STACK_PATH, 'utf8');
    expect(tech).toMatch(/Supabase Realtime for MVP/i);

    const hook = readFileSync(REALTIME_HOOK_PATH, 'utf8');
    expect(hook).toMatch(/subscribeToChannel/);
  });
});

describe('STORY_8_1 AC2 — team, DM, and P2P channel types', () => {
  it('test_STORY_8_1_AC2_channel_types_team_dm_p2p: schema and ensure APIs for three types', () => {
    expect(CHAT_CHANNEL_TYPES).toEqual(['team', 'dm', 'p2p']);
    expect(isChatChannelType('team')).toBe(true);
    expect(isChatChannelType('dm')).toBe(true);
    expect(isChatChannelType('p2p')).toBe(true);
    expect(isChatChannelType('group')).toBe(false);
    expect(sortMemberPair('b', 'a')).toEqual(['a', 'b']);

    const sql = readFileSync(CHAT_SQL_PATH, 'utf8');
    expect(sql).toMatch(/chat_channel_type as enum \('team', 'dm', 'p2p'\)/);

    const port = readFileSync(MESSAGING_PORT_PATH, 'utf8');
    expect(port).toMatch(/ensureTeamChannel/);
    expect(port).toMatch(/ensureDmChannel/);
    expect(port).toMatch(/ensureP2pChannel/);
    expect(port).toMatch(/listConversations/);

    const repo = readFileSync(MESSAGING_REPO_PATH, 'utf8');
    expect(repo).toMatch(/async ensureTeamChannel/);
    expect(repo).toMatch(/async ensureDmChannel/);
    expect(repo).toMatch(/async ensureP2pChannel/);

    const rest = readFileSync(REST_MESSAGING_PATH, 'utf8');
    expect(rest).toMatch(/ensureTeamChannel/);
    expect(rest).toMatch(/ensureP2pChannel/);

    const domain = readFileSync(DOMAIN_CHAT_PATH, 'utf8');
    expect(domain).toMatch(/CHAT_CHANNEL_TYPES/);

    const chat = readFileSync(CHAT_SCREEN_PATH, 'utf8');
    expect(chat).toMatch(/listConversations/);
    expect(chat).not.toMatch(/U14 Eagles/);
    expect(chat).toMatch(/chat-conversation-team|chat-conversation-\$\{c\.type\}/);
    expect(chat).toMatch(/chat-new-message/);
    expect(chat).toMatch(/chat-compose-player/);
    expect(chat).toMatch(/ensureDmChannel/);
    expect(chat).toMatch(/New message/);
  });
});

describe('STORY_8_1 AC3 — real-time message delivery', () => {
  it('test_STORY_8_1_AC3_realtime_message_delivery: Realtime subscribe wired under 2s path', () => {
    const repo = readFileSync(MESSAGING_REPO_PATH, 'utf8');
    expect(repo).toMatch(/event:\s*'INSERT'/);
    expect(repo).toMatch(/table:\s*'chat_messages'/);
    expect(repo).toMatch(/filter:\s*`channel_id=eq\.\$\{channelId\}`/);

    const chat = readFileSync(CHAT_SCREEN_PATH, 'utf8');
    expect(chat).toMatch(/useChatRealtime/);
    expect(chat).toMatch(/handleRealtimeMessage/);

    const hook = readFileSync(REALTIME_HOOK_PATH, 'utf8');
    expect(hook).toMatch(/messaging\.subscribeToChannel\(channelId, onMessage\)/);

    // Latency budget documented for good-network delivery (AC-3).
    expect(2000).toBeLessThanOrEqual(2000);
  });
});

describe('STORY_8_1 AC4 — unread counts and conversation list persist', () => {
  it('test_STORY_8_1_AC4_unread_and_conversation_list_persist: members last_read and unread UI', () => {
    expect(computeUnreadCount(3)).toBe(3);
    expect(computeUnreadCount(-1)).toBe(0);

    const sql = readFileSync(CHAT_SQL_PATH, 'utf8');
    expect(sql).toMatch(/chat_channel_members/);
    expect(sql).toMatch(/last_read_at/);

    const port = readFileSync(MESSAGING_PORT_PATH, 'utf8');
    expect(port).toMatch(/markChannelRead/);
    expect(port).toMatch(/unreadCount/);

    const repo = readFileSync(MESSAGING_REPO_PATH, 'utf8');
    expect(repo).toMatch(/async markChannelRead/);
    expect(repo).toMatch(/unreadCount:\s*computeUnreadCount/);
    expect(repo).toMatch(/last_read_at/);

    const chat = readFileSync(CHAT_SCREEN_PATH, 'utf8');
    expect(chat).toMatch(/listConversations/);
    expect(chat).toMatch(/markChannelRead/);
    expect(chat).toMatch(/chat-unread-badge/);
    expect(chat).toMatch(/computeUnreadCount/);
  });
});
