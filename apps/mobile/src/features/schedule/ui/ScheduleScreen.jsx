import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRepositories } from '@coach360/api';
import {
  SESSION_MVP_TYPES,
  canCreateIndividualSession,
  canEditSession,
} from '@coach360/domain';
import { useAuth } from '@/features/auth/model/use-auth.js';
import {
  Button as Btn,
  Card,
  DashedBtn,
  PageHeader,
  ScreenContainer,
} from '@/shared/ui/primitives.jsx';

function toLocalDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toLocalTimeInput(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function toIsoDateTime(date, time) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function sessionTypeLabel(type) {
  return SESSION_MVP_TYPES.find((entry) => entry.value === type)?.label ?? type;
}

function uniqueTeams(teams) {
  const seen = new Set();
  return teams.filter((team) => {
    if (!team?.id || seen.has(team.id)) {
      return false;
    }
    seen.add(team.id);
    return true;
  });
}

function subscriptionFromLegacyUser(user) {
  if (!user) {
    return null;
  }
  return {
    tier: user.tier === 'trial' ? 'trial' : user.tier,
    status: user.tier === 'trial' ? 'trialing' : 'active',
  };
}

function canShowScheduleCreateAction(role) {
  return role === 'coach' || role === 'team_manager' || role === 'admin';
}

function SessionForm({
  mode,
  readOnly = false,
  initialSession,
  teams,
  players,
  canCreateIndividual,
  canCancel,
  saving,
  error,
  onSubmit,
  onCancel,
  onDelete,
}) {
  const baseDate = initialSession ? new Date(initialSession.scheduledAt) : new Date();
  const [title, setTitle] = useState(initialSession?.title ?? '');
  const [date, setDate] = useState(toLocalDateInput(baseDate));
  const [time, setTime] = useState(toLocalTimeInput(baseDate));
  const [sessionType, setSessionType] = useState(() => {
    const initial = initialSession?.sessionType ?? 'practice';
    if (!canCreateIndividual && initial === 'individual') {
      return 'practice';
    }
    return initial;
  });
  const [teamId, setTeamId] = useState(initialSession?.teamId ?? '');
  const [playerId, setPlayerId] = useState(initialSession?.playerId ?? '');
  const [notes, setNotes] = useState(initialSession?.notes ?? '');

  const effectiveSessionType =
    !canCreateIndividual && sessionType === 'individual' ? 'practice' : sessionType;
  const effectiveTeamId =
    effectiveSessionType === 'individual'
      ? ''
      : teamId || teams[0]?.id || '';

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      title,
      notes,
      scheduledAt: toIsoDateTime(date, time),
      durationMinutes: 60,
      sessionType: effectiveSessionType,
      teamId: effectiveSessionType === 'individual' ? null : effectiveTeamId || null,
      playerId: effectiveSessionType === 'individual' ? playerId || null : null,
    });
  }

  const pageTitle = readOnly
    ? 'SESSION DETAILS'
    : mode === 'edit'
      ? 'EDIT SESSION'
      : 'NEW SESSION';

  return (
    <ScreenContainer>
      <PageHeader
        title={pageTitle}
        onBack={onCancel}
      />
      <form onSubmit={readOnly ? undefined : handleSubmit}>
        <label className="mb-1.5 block font-body text-xs uppercase text-coach-t3" htmlFor="session-title">
          Session title
        </label>
        <input
          id="session-title"
          value={title}
          readOnly={readOnly}
          disabled={readOnly}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Shooting Drills"
          className="mb-3.5 box-border w-full rounded-xl border border-coach-border bg-coach-card px-4 py-3.5 font-body text-base text-coach-t1 outline-none"
        />

        <div className="mb-3.5 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block font-body text-xs uppercase text-coach-t3" htmlFor="session-date">
              Date
            </label>
            <input
              id="session-date"
              type="date"
              value={date}
              readOnly={readOnly}
              disabled={readOnly}
              onChange={(event) => setDate(event.target.value)}
              className="box-border w-full rounded-xl border border-coach-border bg-coach-card px-4 py-3.5 font-body text-base text-coach-t1 outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block font-body text-xs uppercase text-coach-t3" htmlFor="session-time">
              Time
            </label>
            <input
              id="session-time"
              type="time"
              value={time}
              readOnly={readOnly}
              disabled={readOnly}
              onChange={(event) => setTime(event.target.value)}
              className="box-border w-full rounded-xl border border-coach-border bg-coach-card px-4 py-3.5 font-body text-base text-coach-t1 outline-none"
            />
          </div>
        </div>

        <label className="mb-1.5 block font-body text-xs uppercase text-coach-t3" htmlFor="session-type">
          Session type
        </label>
        <select
          id="session-type"
          value={effectiveSessionType}
          disabled={readOnly}
          onChange={(event) => setSessionType(event.target.value)}
          className="mb-3.5 box-border w-full rounded-xl border border-coach-border bg-coach-card px-4 py-3.5 font-body text-base text-coach-t1 outline-none"
        >
          {SESSION_MVP_TYPES
            .filter((entry) => canCreateIndividual || entry.value !== 'individual')
            .map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
        </select>

        {effectiveSessionType === 'individual' ? (
          <>
            <label className="mb-1.5 block font-body text-xs uppercase text-coach-t3" htmlFor="session-player">
              Player
            </label>
            <select
              id="session-player"
              value={playerId}
              disabled={readOnly}
              onChange={(event) => setPlayerId(event.target.value)}
              className="mb-3.5 box-border w-full rounded-xl border border-coach-border bg-coach-card px-4 py-3.5 font-body text-base text-coach-t1 outline-none"
            >
              <option value="">Select player</option>
              {players.map((player) => (
                <option key={player.profileId} value={player.profileId}>
                  {player.displayName ?? player.profileId}
                </option>
              ))}
            </select>
          </>
        ) : (
          <>
            <label className="mb-1.5 block font-body text-xs uppercase text-coach-t3" htmlFor="session-team">
              Team
            </label>
            <select
              id="session-team"
              value={effectiveTeamId}
              disabled={readOnly}
              onChange={(event) => setTeamId(event.target.value)}
              className="mb-3.5 box-border w-full rounded-xl border border-coach-border bg-coach-card px-4 py-3.5 font-body text-base text-coach-t1 outline-none"
            >
              <option value="">Select team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </>
        )}

        <label className="mb-1.5 block font-body text-xs uppercase text-coach-t3" htmlFor="session-notes">
          Notes
        </label>
        <textarea
          id="session-notes"
          value={notes}
          readOnly={readOnly}
          disabled={readOnly}
          onChange={(event) => setNotes(event.target.value)}
          rows={4}
          className="mb-4 box-border w-full rounded-xl border border-coach-border bg-coach-card px-4 py-3.5 font-body text-base text-coach-t1 outline-none"
        />

        {error ? <p className="mb-3 font-body text-sm text-coach-red">{error}</p> : null}

        {!readOnly ? (
          <>
            <Btn primary full type="submit" disabled={saving}>
              {saving ? 'Saving…' : mode === 'edit' ? 'Save Session' : 'Create Session'}
            </Btn>
            {canCancel ? (
              <button
                type="button"
                onClick={onDelete}
                className="mt-3 w-full cursor-pointer rounded-xl border border-coach-red bg-transparent px-5 py-3 font-display text-sm font-semibold uppercase tracking-wider text-coach-red"
              >
                Cancel session
              </button>
            ) : null}
          </>
        ) : null}
      </form>
    </ScreenContainer>
  );
}

export function ScheduleScreen({ user, tryA }) {
  const repos = useRepositories();
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const appRole = session?.user?.role ?? null;
  const accessSubscription = useMemo(
    () => subscriptionFromLegacyUser(user),
    [user],
  );

  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [sessions, setSessions] = useState([]);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [viewingSession, setViewingSession] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const canCreateIndividual = useMemo(
    () =>
      appRole
        ? canCreateIndividualSession(appRole, accessSubscription)
        : false,
    [appRole, accessSubscription],
  );
  const showCreateAction = canShowScheduleCreateAction(appRole);

  const loadBaseData = useCallback(
    async function () {
      if (!userId) {
        setSessions([]);
        setTeams([]);
        setPlayers([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const [sessionRows, ownedTeams, memberTeams] = await Promise.all([
          repos.sessions.listForUser(userId),
          repos.teams.listForUser(userId),
          appRole === 'team_manager' ? repos.rosters.listMemberTeams(userId) : Promise.resolve([]),
        ]);
        const nextTeams = uniqueTeams([...(ownedTeams ?? []), ...(memberTeams ?? [])]);
        setSessions(sessionRows.filter((entry) => entry.status !== 'cancelled'));
        setTeams(nextTeams);

        if (nextTeams.length > 0) {
          const rosterLists = await Promise.all(
            nextTeams.map((team) => repos.rosters.listMembers(team.id)),
          );
          const seenPlayers = new Set();
          setPlayers(
            rosterLists
              .flat()
              .filter(function (member) {
                return (
                  member.rosterRole === 'player'
                  && member.status === 'active'
                  && !seenPlayers.has(member.profileId)
                  && seenPlayers.add(member.profileId)
                );
              }),
          );
        } else {
          setPlayers([]);
        }
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : 'session_load_failed';
        console.error('[ScheduleScreen] load failed:', cause);
        setError(message);
        setSessions([]);
        setTeams([]);
        setPlayers([]);
      } finally {
        setLoading(false);
      }
    },
    [appRole, repos.rosters, repos.sessions, repos.teams, userId],
  );

  useEffect(
    function () {
      loadBaseData();
    },
    [loadBaseData],
  );

  async function handleSaveSession(input) {
    if (!userId) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingSession) {
        const updated = await repos.sessions.updateSession(editingSession.id, userId, input);
        repos.notifications.enqueueSessionChange({
          sessionId: updated.id,
          coachId: updated.coachId,
          teamId: updated.teamId,
          playerId: updated.playerId,
          triggeredBy: userId,
          event: 'session_updated',
        });
      } else {
        await repos.sessions.createSession(userId, input);
      }
      setShowCreate(false);
      setEditingSession(null);
      await loadBaseData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'session_save_failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSession() {
    if (!userId || !editingSession) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await repos.sessions.cancelSession(editingSession.id, userId);
      repos.notifications.enqueueSessionChange({
        sessionId: editingSession.id,
        coachId: editingSession.coachId,
        teamId: editingSession.teamId,
        playerId: editingSession.playerId,
        triggeredBy: userId,
        event: 'session_cancelled',
      });
      setEditingSession(null);
      setShowCreate(false);
      await loadBaseData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'session_cancel_failed');
    } finally {
      setSaving(false);
    }
  }

  if (showCreate || editingSession || viewingSession) {
    const activeSession = editingSession ?? viewingSession;
    const isReadOnly = Boolean(viewingSession);
    return (
      <SessionForm
        mode={editingSession ? 'edit' : 'create'}
        readOnly={isReadOnly}
        initialSession={activeSession}
        teams={teams}
        players={players}
        canCreateIndividual={canCreateIndividual}
        canCancel={Boolean(editingSession) && !isReadOnly}
        saving={saving}
        error={error}
        onSubmit={handleSaveSession}
        onCancel={() => {
          setShowCreate(false);
          setEditingSession(null);
          setViewingSession(null);
          setError(null);
        }}
        onDelete={handleDeleteSession}
      />
    );
  }

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dates = Array.from({ length: 7 }, (_, index) => {
    const now = new Date();
    const diff = index - now.getDay();
    const next = new Date(now);
    next.setDate(now.getDate() + diff);
    return next.getDate();
  });

  const dayData = sessions.filter((entry) => new Date(entry.scheduledAt).getDay() === selectedDay);

  return (
    <ScreenContainer>
      <PageHeader title="SCHEDULE" user={user} />
      <div className="mb-5 flex gap-1.5">
        {days.map(function (day, index) {
          const active = selectedDay === index;
          return (
            <div
              key={day}
              onClick={function () {
                setSelectedDay(index);
              }}
              className={`flex-1 cursor-pointer rounded-[14px] border px-0 py-2.5 text-center ${active ? 'border-coach-orange bg-coach-orange' : 'border-coach-border bg-coach-card'}`}
            >
              <div className={`font-body text-[10px] uppercase ${active ? 'text-white/70' : 'text-coach-t3'}`}>{day}</div>
              <div className={`mt-0.5 font-display text-lg font-bold ${active ? 'text-white' : 'text-coach-t1'}`}>{dates[index]}</div>
            </div>
          );
        })}
      </div>
      {loading ? (
        <div className="px-10 py-10 text-center font-body text-coach-t3">Loading schedule…</div>
      ) : error ? (
        <Card className="border-coach-red">
          <div className="font-body text-sm text-coach-red">{error}</div>
        </Card>
      ) : dayData.length === 0 ? (
        <div className="px-10 py-10 text-center font-body text-coach-t3">No sessions scheduled</div>
      ) : (
        dayData.map(function (entry) {
          return (
            <Card
              key={entry.id}
              onClick={function () {
                if (appRole && userId && canEditSession(appRole, entry, userId)) {
                  setEditingSession(entry);
                  setViewingSession(null);
                } else {
                  setViewingSession(entry);
                  setEditingSession(null);
                }
                setShowCreate(false);
                setError(null);
              }}
              className="border-l-[3px] border-l-coach-orange"
            >
              <div className="mb-1 font-body text-xs font-semibold text-coach-orange">
                {formatTime(entry.scheduledAt)}
              </div>
              <div className="font-display text-lg font-bold text-coach-t1">{entry.title}</div>
              <div className="mt-1 font-body text-xs text-coach-t3">
                {sessionTypeLabel(entry.sessionType)}
                {entry.playerId ? ' • Individual session' : ''}
              </div>
            </Card>
          );
        })
      )}
      {showCreateAction ? (
        <DashedBtn
          onClick={function () {
            tryA('createSession', function () {
              setShowCreate(true);
            });
          }}
        >
          + Add Session
        </DashedBtn>
      ) : null}
    </ScreenContainer>
  );
}
