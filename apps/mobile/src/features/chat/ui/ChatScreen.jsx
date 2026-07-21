import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRepositories } from '@coach360/api';
import { useAuth } from '@/features/auth/model/use-auth.js';
import {
  playerDisplayLabel,
  resolvePlayerDisplayNames,
} from '@/features/progress/lib/resolve-player-display-names.js';
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

function formatMessageTime(iso) {
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

  const [activePlayer, setActivePlayer] = useState(null);
  const [activePlayerName, setActivePlayerName] = useState('');
  const [threads, setThreads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [playerNames, setPlayerNames] = useState({});
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const chatAllowed = canAccess(user, 'chat');

  const loadThreads = useCallback(
    async function () {
      if (!userId || !isCoach || !chatAllowed) {
        setThreads([]);
        return;
      }
      try {
        const rows = await repos.messaging.listDirectThreads(userId);
        setThreads(rows);
        const teamList = await repos.teams.listForUser(userId);
        const nameMap = await resolvePlayerDisplayNames(
          repos,
          teamList,
          rows.map(function (row) {
            return row.playerId;
          }),
        );
        setPlayerNames(nameMap);
      } catch {
        setThreads([]);
      }
    },
    [chatAllowed, isCoach, repos.messaging, repos.profiles, repos.rosters, repos.teams, userId],
  );

  const loadMessages = useCallback(
    async function (coachId, playerId) {
      setLoading(true);
      setError(null);
      try {
        const rows = await repos.messaging.listDirectMessages(coachId, playerId);
        setMessages(rows);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'direct_messages_load_failed');
        setMessages([]);
      } finally {
        setLoading(false);
      }
    },
    [repos.messaging],
  );

  useEffect(
    function () {
      loadThreads();
    },
    [loadThreads],
  );

  useEffect(
    function () {
      if (!initialDm || !userId || !chatAllowed) {
        return;
      }
      setActivePlayer(initialDm.playerId);
      setActivePlayerName(
        initialDm.displayName ?? playerDisplayLabel(playerNames, initialDm.playerId),
      );
      if (initialDm.draftMessage) {
        setMsg(initialDm.draftMessage);
      }
      loadMessages(userId, initialDm.playerId);
      onInitialDmConsumed?.();
    },
    [chatAllowed, initialDm, loadMessages, onInitialDmConsumed, userId],
  );

  useEffect(
    function () {
      if (!activePlayer || !userId || initialDm) {
        return;
      }
      loadMessages(userId, activePlayer);
    },
    [activePlayer, initialDm, loadMessages, userId],
  );

  const mockChats = useMemo(
    function () {
      if (isCoach && threads.length > 0) {
        return threads.map(function (thread) {
          return {
            id: thread.playerId,
            n: playerDisplayLabel(playerNames, thread.playerId),
            ty: 'p',
            m: thread.lastMessage,
            ti: formatMessageTime(thread.lastAt),
            u: 0,
          };
        });
      }
      return [
        { id: 1, n: 'U14 Eagles', ty: 'team', m: 'Practice at 4pm', ti: '2m', u: 3 },
        { id: 2, n: 'Jaylen Carter', ty: 'p', m: 'Thanks coach!', ti: '15m', u: 0 },
        { id: 3, n: 'U16 Hawks', ty: 'team', m: 'Film uploaded', ti: '1h', u: 1 },
      ];
    },
    [isCoach, playerNames, threads],
  );

  async function handleSend() {
    const trimmed = msg.trim();
    if (!trimmed || !userId || !activePlayer || !chatAllowed) {
      return;
    }

    setSending(true);
    setError(null);
    try {
      const coachId = isCoach ? userId : activePlayer;
      const playerId = isCoach ? activePlayer : userId;
      await repos.messaging.sendDirectMessage({
        coachId,
        playerId,
        body: trimmed,
      });
      setMsg('');
      await loadMessages(coachId, playerId);
      await loadThreads();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'direct_message_send_failed');
    } finally {
      setSending(false);
    }
  }

  if (!chatAllowed) {
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

  if (activePlayer) {
    const title =
      activePlayerName || playerDisplayLabel(playerNames, activePlayer);
    return (
      <div
        className="flex min-h-[calc(100svh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-5rem)] flex-col"
        data-testid="direct-message-thread"
      >
        <div className="flex items-center gap-3 border-b border-coach-border px-6 py-4">
          <button
            type="button"
            onClick={function () {
              setActivePlayer(null);
              setActivePlayerName('');
              setMessages([]);
              setError(null);
            }}
            className="cursor-pointer border-none bg-transparent p-0 text-coach-orange"
          >
            <IconBack />
          </button>
          <div className="font-body text-[15px] font-semibold text-coach-t1">{title}</div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4" data-testid="direct-message-list">
          {loading ? (
            <p className="font-body text-sm text-coach-t3">Loading messages…</p>
          ) : null}
          {!loading
            ? messages.map(function (entry) {
                const isMe = entry.senderId === userId;
                return (
                  <div
                    key={entry.id}
                    className={`mb-3 flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 ${isMe ? 'rounded-br rounded-bl-2xl bg-coach-orange' : 'rounded-bl rounded-br-2xl bg-coach-card'}`}
                    >
                      <div className={`font-body text-sm leading-snug ${isMe ? 'text-white' : 'text-coach-t1'}`}>
                        {entry.body}
                      </div>
                      <div className={`mt-1 text-right font-body text-[10px] ${isMe ? 'text-white/60' : 'text-coach-t3'}`}>
                        {formatMessageTime(entry.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })
            : null}
          {!loading && messages.length === 0 ? (
            <p className="font-body text-sm text-coach-t3">No messages yet. Send feedback below.</p>
          ) : null}
        </div>
        {error ? (
          <p className="px-6 font-body text-xs text-coach-red">{error}</p>
        ) : null}
        <div className="flex gap-2.5 border-t border-coach-border px-6 pb-5 pt-3">
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
      <PageHeader title="MESSAGES" user={user} />
      {mockChats.map(function (c) {
        return (
          <div
            key={c.id}
            onClick={function () {
              if (c.ty === 'p') {
                setActivePlayer(String(c.id));
                setActivePlayerName(c.n);
              }
            }}
            className="flex cursor-pointer items-center gap-3.5 border-b border-coach-border py-3.5"
          >
            <div className={`flex h-[46px] w-[46px] items-center justify-center rounded-full ${c.ty === 'team' ? 'bg-coach-orange-glow text-coach-orange' : 'bg-coach-blue/20 text-coach-blue'}`}>
              {c.ty === 'team' ? <IconUsers /> : <span className="font-display text-lg font-bold">{c.n[0]}</span>}
            </div>
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="font-body text-sm font-semibold text-coach-t1">{c.n}</span>
                <span className="font-body text-[11px] text-coach-t3">{c.ti}</span>
              </div>
              <div className="mt-0.5 truncate font-body text-[13px] text-coach-t3">{c.m}</div>
            </div>
            {c.u > 0 ? (
              <div className="flex h-[22px] min-w-[22px] items-center justify-center rounded-[11px] bg-coach-orange font-body text-[11px] font-bold text-white">
                {c.u}
              </div>
            ) : null}
          </div>
        );
      })}
      <div className="h-6" />
    </ScreenContainer>
  );
}
