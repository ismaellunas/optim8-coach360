import { useCallback, useEffect, useState } from 'react';
import {
  buildContentLinkAttachment,
  canSendTextOnChannelType,
  computeUnreadCount,
} from '@coach360/domain';
import { useRepositories } from '@coach360/api';
import { useAuth } from '@/features/auth/model/use-auth.js';
import {
  chatPeerDisplayLabel,
  resolvePlayerDisplayNames,
} from '@/features/progress/lib/resolve-player-display-names.js';
import { useChatRealtime } from '@/features/chat/lib/use-chat-realtime.js';
import { ChatAttachMenu } from '@/features/chat/ui/ChatAttachMenu.jsx';
import { ChatMessageBubble } from '@/features/chat/ui/ChatMessageBubble.jsx';
import {
  Button as Btn,
  IconBack,
  PageHeader,
  ScreenContainer,
} from '@/shared/ui/primitives.jsx';

function IconLock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function formatMessageTime(iso) {
  if (!iso) {
    return '';
  }
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function ChatScreen({
  user,
  tryA,
  canAccess,
  initialDm,
  onInitialDmConsumed,
}) {
  const { session } = useAuth();
  const repos = useRepositories();
  const userId = session?.user.id;
  const isCoach = user?.role === 'coach';
  const isPlayerRole = user?.role === 'player';
  const canComposeDm = user?.role === 'coach' || user?.role === 'team_manager';

  const [conversations, setConversations] = useState([]);
  const [activeChannelId, setActiveChannelId] = useState(null);
  const [activeTitle, setActiveTitle] = useState('');
  const [activePeerId, setActivePeerId] = useState(null);
  const [activeType, setActiveType] = useState(null);
  const [messages, setMessages] = useState([]);
  const [playerNames, setPlayerNames] = useState({});
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [pickingPlayer, setPickingPlayer] = useState(false);
  const [rosterPlayers, setRosterPlayers] = useState([]);
  const [pendingRosterCount, setPendingRosterCount] = useState(0);
  const [rosterCoaches, setRosterCoaches] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [startingDm, setStartingDm] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [linkDetail, setLinkDetail] = useState(null);

  const chatAllowed = canAccess(user, 'chat');

  const loadConversations = useCallback(
    async function () {
      // STORY-8.1 (resolved): coach<->player DM is free at every tier, so the
      // conversation list (which may contain DM threads) must load regardless
      // of chatAllowed — RLS still governs which rows are actually visible.
      if (!userId) {
        setConversations([]);
        return;
      }
      try {
        const rows = await repos.messaging.listConversations(userId);
        setConversations(rows);
        setError(null);

        const peerIds = rows
          .filter(function (row) {
            return row.peerId;
          })
          .map(function (row) {
            return row.peerId;
          });
        if (peerIds.length > 0) {
          const teamList = await repos.teams.listForUser(userId);
          const nameMap = await resolvePlayerDisplayNames(repos, teamList, peerIds);
          setPlayerNames(function (prev) {
            return { ...prev, ...nameMap };
          });
        }
      } catch (cause) {
        setConversations([]);
        setError(cause instanceof Error ? cause.message : 'chat_conversations_load_failed');
      }
    },
    [repos, userId],
  );

  const loadRosterPlayers = useCallback(
    async function () {
      if (!userId || !canComposeDm) {
        setRosterPlayers([]);
        setPendingRosterCount(0);
        return;
      }
      setLoadingPlayers(true);
      try {
        const teamList = await repos.teams.listForUser(userId);
        const memberLists = await Promise.all(
          teamList.map(function (team) {
            return repos.rosters.listMembers(team.id);
          }),
        );
        const byId = new Map();
        // STORY-8.1 (resolved, coach "have one setup but cannot initiate chat.
        // Not visible" complaint): can't resolve from code alone whether a
        // specific roster entry was actually active at test time — that needs
        // a live repro. What's safe to fix regardless: surface a count of
        // invited-but-not-joined entries instead of letting them vanish with
        // no explanation (same filter as the picker list itself).
        let pending = 0;
        for (const members of memberLists) {
          for (const member of members) {
            if (member.rosterRole !== 'player') {
              continue;
            }
            if (member.status === 'active' && member.profileId && member.profileId !== userId) {
              byId.set(member.profileId, {
                profileId: member.profileId,
                displayName: member.displayName?.trim() || 'Player',
              });
            } else if (member.status !== 'active' || !member.profileId) {
              pending += 1;
            }
          }
        }
        const players = [...byId.values()].sort(function (a, b) {
          return a.displayName.localeCompare(b.displayName);
        });
        setRosterPlayers(players);
        setPendingRosterCount(pending);
        setPlayerNames(function (prev) {
          const next = { ...prev };
          for (const player of players) {
            next[player.profileId] = player.displayName;
          }
          return next;
        });
      } catch (cause) {
        setRosterPlayers([]);
        setPendingRosterCount(0);
        setError(cause instanceof Error ? cause.message : 'roster_players_load_failed');
      } finally {
        setLoadingPlayers(false);
      }
    },
    [canComposeDm, repos.rosters, repos.teams, userId],
  );

  const loadRosterCoaches = useCallback(
    async function () {
      if (!userId || !isPlayerRole) {
        setRosterCoaches([]);
        return;
      }
      setLoadingPlayers(true);
      try {
        // Players aren't team creators, so repos.teams.listForUser (created_by)
        // doesn't apply here — use the roster-membership lookup instead.
        const teamList = await repos.rosters.listMemberTeams(userId);
        const byId = new Map();
        for (const team of teamList) {
          if (team.createdBy && team.createdBy !== userId && !byId.has(team.createdBy)) {
            byId.set(team.createdBy, {
              profileId: team.createdBy,
              displayName: null,
              teamName: team.name,
            });
          }
        }
        const nameMap = await resolvePlayerDisplayNames(repos, teamList, [...byId.keys()]);
        const coaches = [...byId.values()]
          .map(function (coach) {
            return { ...coach, displayName: nameMap[coach.profileId]?.trim() || 'Coach' };
          })
          .sort(function (a, b) {
            return a.displayName.localeCompare(b.displayName);
          });
        setRosterCoaches(coaches);
        setPlayerNames(function (prev) {
          return { ...prev, ...nameMap };
        });
      } catch (cause) {
        setRosterCoaches([]);
        setError(cause instanceof Error ? cause.message : 'roster_coaches_load_failed');
      } finally {
        setLoadingPlayers(false);
      }
    },
    [isPlayerRole, repos, userId],
  );

  const loadMessages = useCallback(
    async function (channelId) {
      setLoading(true);
      setError(null);
      try {
        const rows = await repos.messaging.listChannelMessages(channelId);
        setMessages(rows);
        await repos.messaging.markChannelRead(channelId);
        await loadConversations();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'chat_messages_load_failed');
        setMessages([]);
      } finally {
        setLoading(false);
      }
    },
    [loadConversations, repos.messaging],
  );

  const openDmWithPlayer = useCallback(
    // STORY-8.1 (resolved): coach<->player DM creation is free at every tier.
    // Despite the name (kept for minimal diff against the existing coach-side
    // flow), ensureDmChannel is role-agnostic — this is also used for a
    // player opening a DM with their coach.
    async function (playerId, displayName) {
      if (!userId) {
        return;
      }
      setStartingDm(true);
      setError(null);
      try {
        const conversation = await repos.messaging.ensureDmChannel(userId, playerId);
        setPickingPlayer(false);
        setActiveChannelId(conversation.id);
        setActiveType('dm');
        setActivePeerId(playerId);
        setActiveTitle(displayName || conversation.title || chatPeerDisplayLabel(playerNames, playerId));
        setMessages([]);
        await loadMessages(conversation.id);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'direct_messages_load_failed');
      } finally {
        setStartingDm(false);
      }
    },
    [loadMessages, playerNames, repos.messaging, userId],
  );

  const handleRealtimeMessage = useCallback(
    function (message) {
      setMessages(function (prev) {
        if (prev.some(function (row) {
          return row.id === message.id;
        })) {
          return prev;
        }
        return prev.concat([message]);
      });
    },
    [],
  );

  useChatRealtime(
    // STORY-8.1 (resolved): DM realtime must work at every tier too.
    repos.messaging,
    activeChannelId,
    handleRealtimeMessage,
  );

  useEffect(
    function () {
      loadConversations();
    },
    [loadConversations],
  );

  useEffect(
    function () {
      // Loaded eagerly (not gated on pickingPlayer) so startCompose can decide
      // whether to skip the picker when the player has exactly one coach.
      if (isPlayerRole) {
        loadRosterCoaches();
      }
    },
    [isPlayerRole, loadRosterCoaches],
  );

  useEffect(
    function () {
      if (!pickingPlayer || isPlayerRole) {
        return;
      }
      loadRosterPlayers();
    },
    [isPlayerRole, loadRosterPlayers, pickingPlayer],
  );

  useEffect(
    function () {
      if (!initialDm || !userId) {
        return;
      }

      let cancelled = false;

      (async function () {
        try {
          const coachId = isCoach || canComposeDm ? userId : initialDm.playerId;
          const playerId = isCoach || canComposeDm ? initialDm.playerId : userId;
          const conversation = await repos.messaging.ensureDmChannel(coachId, playerId);
          if (cancelled) {
            return;
          }
          setActiveChannelId(conversation.id);
          setActiveType('dm');
          setActivePeerId(initialDm.playerId);
          setActiveTitle(
            initialDm.displayName
              ?? chatPeerDisplayLabel(playerNames, initialDm.playerId, conversation.title)
              ?? conversation.title,
          );
          if (initialDm.draftMessage) {
            setMsg(initialDm.draftMessage);
          }
          await loadMessages(conversation.id);
        } catch (cause) {
          if (!cancelled) {
            setError(cause instanceof Error ? cause.message : 'direct_messages_load_failed');
          }
        } finally {
          onInitialDmConsumed?.();
        }
      })();

      return function () {
        cancelled = true;
      };
    },
    [
      canComposeDm,
      chatAllowed,
      initialDm,
      isCoach,
      loadMessages,
      onInitialDmConsumed,
      playerNames,
      repos.messaging,
      userId,
    ],
  );

  async function openConversation(conversation) {
    setActiveChannelId(conversation.id);
    setActiveType(conversation.type);
    setActivePeerId(conversation.peerId);
    setActiveTitle(
      conversation.peerId
        ? chatPeerDisplayLabel(playerNames, conversation.peerId, conversation.title)
        : conversation.title,
    );
    setError(null);
    await loadMessages(conversation.id);
  }

  async function handleSend() {
    const trimmed = msg.trim();
    if (!trimmed || !userId || !activeChannelId) {
      return;
    }
    // STORY-8.1 (resolved): canSendTextOnChannelType is the single source of
    // truth for text-send gating — 'dm' is free at every tier, 'team'/'p2p'
    // still require chatAllowed. Don't duplicate the chatAllowed check above.
    if (!activeType || !canSendTextOnChannelType(activeType, chatAllowed)) {
      return;
    }

    setSending(true);
    setError(null);
    try {
      if (activeType === 'dm' && activePeerId) {
        const coachId = canComposeDm ? userId : activePeerId;
        const playerId = canComposeDm ? activePeerId : userId;
        await repos.messaging.sendDirectMessage({
          coachId,
          playerId,
          body: trimmed,
        });
      } else {
        await repos.messaging.sendChannelMessage({
          channelId: activeChannelId,
          body: trimmed,
          messageType: 'text',
        });
      }
      setMsg('');
      await loadMessages(activeChannelId);
      await loadConversations();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'chat_message_send_failed');
    } finally {
      setSending(false);
    }
  }

  async function handleSendContentLink(ref) {
    if (!userId || !activeChannelId || !chatAllowed) {
      return;
    }
    setSending(true);
    setError(null);
    setAttaching(false);
    try {
      const attachment = buildContentLinkAttachment(ref);
      await repos.messaging.sendChannelMessage({
        channelId: activeChannelId,
        messageType: 'content_link',
        attachment,
        body: msg.trim() || attachment.title,
      });
      setMsg('');
      await loadMessages(activeChannelId);
      await loadConversations();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'chat_content_link_send_failed');
    } finally {
      setSending(false);
    }
  }

  async function handleSendVideoFile(file) {
    if (!userId || !activeChannelId || !chatAllowed) {
      return;
    }
    setSending(true);
    setError(null);
    setAttaching(false);
    try {
      const attachment = await repos.messaging.uploadChatVideo(
        activeChannelId,
        file,
        file.name || 'chat-video.mp4',
      );
      await repos.messaging.sendChannelMessage({
        channelId: activeChannelId,
        messageType: 'video',
        attachment,
        body: msg.trim(),
      });
      setMsg('');
      await loadMessages(activeChannelId);
      await loadConversations();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'chat_video_send_failed');
    } finally {
      setSending(false);
    }
  }

  function startCompose() {
    setError(null);
    // STORY-8.1 (resolved): infer from context when unambiguous — a player
    // with exactly one coach shouldn't have to pick from a list of one.
    // Never default to an unannounced "primary" coach when there's more
    // than one, though — show the picker in that case.
    if (isPlayerRole && rosterCoaches.length === 1) {
      openDmWithPlayer(rosterCoaches[0].profileId, rosterCoaches[0].displayName);
      return;
    }
    setPickingPlayer(true);
  }

  // STORY-8.1 (resolved): coach<->player DM ("coach messaging") is free at
  // every tier for every player/coach/team_manager — this screen should
  // never fully lock for those roles anymore. Advanced+ still gates team
  // channels and p2p (enforced in canSendTextOnChannelType, not here).
  const hasAnyMessagingAccess = canComposeDm || isPlayerRole || chatAllowed;
  if (!hasAnyMessagingAccess) {
    return (
      <ScreenContainer>
        <PageHeader title="MESSAGES" user={user} />
        <div className="py-[60px] text-center">
          <div className="mb-3 text-coach-t3"><IconLock /></div>
          <div className="mb-2 font-display text-lg font-semibold text-coach-t1">Chat Locked</div>
          <div className="mb-5 font-body text-[13px] text-coach-t3">Upgrade to Advanced to message.</div>
          <Btn primary onClick={function () { tryA('chat', function () {}); }}>Upgrade</Btn>
        </div>
      </ScreenContainer>
    );
  }

  if (attaching && activeChannelId) {
    return (
      <ChatAttachMenu
        onBack={function () {
          setAttaching(false);
        }}
        onPickContentLink={handleSendContentLink}
        onPickVideoFile={handleSendVideoFile}
      />
    );
  }

  if (linkDetail) {
    return (
      <ScreenContainer data-testid="chat-content-link-detail">
        <PageHeader
          title="CONTENT LINK"
          onBack={function () {
            setLinkDetail(null);
          }}
        />
        <div className="mb-2 font-display text-lg font-semibold text-coach-t1">{linkDetail.title}</div>
        <p className="mb-1 font-body text-sm capitalize text-coach-t2">{linkDetail.kind}</p>
        <p className="font-body text-[13px] uppercase text-coach-t3">{linkDetail.source}</p>
        <p className="mt-4 font-body text-[13px] text-coach-t3">
          Full content playback opens from Schedule / library when available.
        </p>
      </ScreenContainer>
    );
  }

  if (pickingPlayer) {
    const existingPeerIds = new Set(
      conversations
        .filter(function (row) {
          return row.type === 'dm' && row.peerId;
        })
        .map(function (row) {
          return row.peerId;
        }),
    );
    // STORY-8.1 (resolved): players pick a coach (grouped by team when there's
    // more than one); coaches/team managers keep the existing player picker.
    const pickerPeople = isPlayerRole ? rosterCoaches : rosterPlayers;
    const peerKind = isPlayerRole ? 'coach' : 'player';

    return (
      <ScreenContainer data-testid="chat-compose-screen">
        <PageHeader
          title="NEW MESSAGE"
          user={user}
          onBack={function () {
            setPickingPlayer(false);
            setError(null);
          }}
        />
        <p className="mb-3 font-body text-[13px] text-coach-t3">
          {isPlayerRole
            ? 'Choose a coach to start a conversation.'
            : 'Choose a player from your roster to start a conversation.'}
        </p>
        {error ? (
          <p className="mb-3 font-body text-xs text-coach-red">{error}</p>
        ) : null}
        {loadingPlayers ? (
          <p className="font-body text-sm text-coach-t3">Loading {peerKind}es…</p>
        ) : null}
        {!loadingPlayers && pickerPeople.length === 0 ? (
          <p className="font-body text-sm text-coach-t3">
            {isPlayerRole
              ? 'No coach found for your team yet.'
              : 'No active players on your teams yet. Add players from Roster first.'}
          </p>
        ) : null}
        {!loadingPlayers && !isPlayerRole && pendingRosterCount > 0 ? (
          <p className="mb-3 font-body text-xs text-coach-t3" data-testid="chat-pending-roster-note">
            {pendingRosterCount} invited {pendingRosterCount === 1 ? 'player hasn\'t' : 'players haven\'t'} finished signing up yet, so they aren't shown here.
          </p>
        ) : null}
        {pickerPeople.map(function (person) {
          const hasThread = existingPeerIds.has(person.profileId);
          return (
            <button
              key={person.profileId}
              type="button"
              disabled={startingDm}
              data-testid={isPlayerRole ? 'chat-compose-coach' : 'chat-compose-player'}
              onClick={function () {
                openDmWithPlayer(person.profileId, person.displayName);
              }}
              className="mb-0 flex w-full cursor-pointer items-center gap-3.5 border-0 border-b border-solid border-coach-border bg-transparent py-3.5 text-left disabled:opacity-50"
            >
              <div className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-coach-blue/20 text-coach-blue">
                <span className="font-display text-lg font-bold">{person.displayName[0] || '?'}</span>
              </div>
              <div className="flex-1">
                <div className="font-body text-sm font-semibold text-coach-t1">{person.displayName}</div>
                <div className="mt-0.5 font-body text-[13px] text-coach-t3">
                  {person.teamName ? person.teamName + ' · ' : ''}
                  {hasThread ? 'Open conversation' : 'Start new conversation'}
                </div>
              </div>
            </button>
          );
        })}
        <div className="h-6" />
      </ScreenContainer>
    );
  }

  if (activeChannelId) {
    return (
      <div
        className="flex min-h-[calc(100svh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-5rem)] flex-col"
        data-testid="direct-message-thread"
        data-channel-type={activeType || 'dm'}
      >
        <div className="flex items-center gap-3 border-b border-coach-border px-6 py-4">
          <button
            type="button"
            onClick={function () {
              setActiveChannelId(null);
              setActiveTitle('');
              setActivePeerId(null);
              setActiveType(null);
              setMessages([]);
              setError(null);
              loadConversations();
            }}
            className="cursor-pointer border-none bg-transparent p-0 text-coach-orange"
          >
            <IconBack />
          </button>
          <div className="font-body text-[15px] font-semibold text-coach-t1">{activeTitle}</div>
        </div>
        <div
          className="flex-1 overflow-y-auto px-6 py-4"
          data-testid="direct-message-list"
        >
          {loading ? (
            <p className="font-body text-sm text-coach-t3">Loading messages…</p>
          ) : null}
          {!loading
            ? messages.map(function (entry) {
                const isMe = entry.senderId === userId;
                return (
                  <ChatMessageBubble
                    key={entry.id}
                    message={entry}
                    isMe={isMe}
                    onContentLinkClick={function (attachment) {
                      setLinkDetail(attachment);
                    }}
                  />
                );
              })
            : null}
          {!loading && messages.length === 0 ? (
            <p className="font-body text-sm text-coach-t3">No messages yet. Send one below.</p>
          ) : null}
        </div>
        {error ? (
          <p className="px-6 font-body text-xs text-coach-red">{error}</p>
        ) : null}
        <div className="flex gap-2.5 border-t border-coach-border px-6 pb-5 pt-3">
          <button
            type="button"
            disabled={sending}
            onClick={function () {
              setAttaching(true);
              setError(null);
            }}
            data-testid="chat-attach-open"
            aria-label="Attach"
            className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-[14px] border border-coach-border bg-coach-card text-coach-orange disabled:opacity-50"
          >
            <IconPlus />
          </button>
          <input
            value={msg}
            onChange={function (event) {
              setMsg(event.target.value);
            }}
            placeholder="Type a message..."
            data-testid="direct-message-input"
            className="flex-1 rounded-[14px] border border-coach-border bg-coach-card px-4 py-3 font-body text-sm text-coach-t1 outline-none"
          />
          <button
            type="button"
            disabled={sending || !msg.trim()}
            onClick={handleSend}
            data-testid="direct-message-send"
            className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-[14px] border-none bg-coach-orange text-white disabled:opacity-50"
          >
            <IconSend />
          </button>
        </div>
      </div>
    );
  }

  return (
    <ScreenContainer data-testid="chat-screen">
      <PageHeader
        title="MESSAGES"
        user={user}
        trailing={
          canComposeDm || isPlayerRole ? (
            <button
              type="button"
              onClick={startCompose}
              data-testid="chat-new-message"
              aria-label="New message"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-none bg-coach-orange text-white"
            >
              <IconPlus />
            </button>
          ) : null
        }
      />
      {error ? (
        <p className="mb-3 font-body text-xs text-coach-red">{error}</p>
      ) : null}
      {conversations.length === 0 ? (
        <div className="py-10 text-center" data-testid="chat-empty-state">
          <p className="mb-2 font-body text-sm text-coach-t3">No conversations yet.</p>
          {canComposeDm || isPlayerRole ? (
            <>
              <p className="mb-4 font-body text-[13px] text-coach-t3">
                {isPlayerRole
                  ? 'Message your coach to get started.'
                  : 'Message a player from your roster to get started.'}
              </p>
              <button
                type="button"
                onClick={startCompose}
                data-testid="chat-empty-new-message"
                className="cursor-pointer rounded-xl border-none bg-coach-orange px-5 py-3 font-display text-sm font-semibold uppercase tracking-wider text-white"
              >
                New message
              </button>
            </>
          ) : null}
        </div>
      ) : null}
      {conversations.map(function (c) {
        const unread = computeUnreadCount(c.unreadCount);
        const isTeam = c.type === 'team';
        const label = c.peerId
          ? chatPeerDisplayLabel(playerNames, c.peerId, c.title)
          : c.title;
        return (
          <div
            key={c.id}
            data-testid={`chat-conversation-${c.type}`}
            onClick={function () {
              openConversation(c);
            }}
            className="flex cursor-pointer items-center gap-3.5 border-b border-coach-border py-3.5"
          >
            <div className={`flex h-[46px] w-[46px] items-center justify-center rounded-full ${isTeam ? 'bg-coach-orange-glow text-coach-orange' : 'bg-coach-blue/20 text-coach-blue'}`}>
              {isTeam ? <IconUsers /> : <span className="font-display text-lg font-bold">{label[0] || '?'}</span>}
            </div>
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="font-body text-sm font-semibold text-coach-t1">{label}</span>
                <span className="font-body text-[11px] text-coach-t3">{formatMessageTime(c.lastAt)}</span>
              </div>
              <div className="mt-0.5 truncate font-body text-[13px] text-coach-t3">
                {c.lastMessage || 'No messages yet'}
              </div>
            </div>
            {unread > 0 ? (
              <div
                data-testid="chat-unread-badge"
                className="flex h-[22px] min-w-[22px] items-center justify-center rounded-[11px] bg-coach-orange font-body text-[11px] font-bold text-white"
              >
                {unread}
              </div>
            ) : null}
          </div>
        );
      })}
      <div className="h-6" />
    </ScreenContainer>
  );
}
