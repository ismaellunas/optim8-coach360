import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRepositories } from '@coach360/api';
import {
  SESSION_MVP_TYPES,
  attachContentRef,
  canCreateIndividualSession,
  canEditSession,
  canViewSharedSchedule,
  filterUpcomingSessions,
  mapSessionValidationMessage,
} from '@coach360/domain';
import { useAuth } from '@/features/auth/model/use-auth.js';
import {
  Button as Btn,
  Card,
  DashedBtn,
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

function contentKindLabel(kind) {
  if (kind === 'package') {
    return 'Package';
  }
  if (kind === 'video') {
    return 'Video';
  }
  if (kind === 'strategy') {
    return 'Strategy';
  }
  return 'Drill';
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

/** Calendar date in the current week for a Sunday=0..Saturday=6 weekday index. */
function dateForWeekday(weekdayIndex, now = new Date()) {
  const next = new Date(now);
  next.setDate(now.getDate() + (weekdayIndex - now.getDay()));
  return next;
}

function SessionForm({
  mode,
  readOnly = false,
  initialSession,
  defaultDate,
  teams,
  players,
  libraryItems,
  purchasedItems,
  canCreateIndividual,
  canCancel,
  saving,
  error,
  onSubmit,
  onCancel,
  onDelete,
}) {
  const baseDate = initialSession
    ? new Date(initialSession.scheduledAt)
    : defaultDate
      ? new Date(defaultDate)
      : new Date();
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
  const [contentRefs, setContentRefs] = useState(() =>
    Array.isArray(initialSession?.contentRefs) ? [...initialSession.contentRefs] : [],
  );
  const [showContentPicker, setShowContentPicker] = useState(false);
  const [pickerTab, setPickerTab] = useState('library');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);

  const effectiveSessionType =
    !canCreateIndividual && sessionType === 'individual' ? 'practice' : sessionType;
  const effectiveTeamId =
    effectiveSessionType === 'individual'
      ? ''
      : teamId || teams[0]?.id || '';

  const orderedContent = useMemo(
    () => [...contentRefs].sort((a, b) => a.sortOrder - b.sortOrder),
    [contentRefs],
  );

  const displayError = formError || error;

  function fieldClass(hasError) {
    return `box-border w-full rounded-xl border px-4 py-3.5 font-body text-base text-coach-t1 outline-none ${hasError ? 'border-coach-red' : 'border-coach-border'} bg-coach-card`;
  }

  function handleAttachItem(item) {
    setContentRefs((current) =>
      attachContentRef(current, {
        kind: item.kind,
        source: item.source,
        id: item.id,
        title: item.title,
      }),
    );
    setShowContentPicker(false);
  }

  function handleRemoveContent(sortOrder) {
    setContentRefs((current) =>
      current
        .filter((ref) => ref.sortOrder !== sortOrder)
        .map((ref, index) => ({ ...ref, sortOrder: index })),
    );
  }

  function validateRequiredFields() {
    const nextErrors = {};
    if (!title.trim()) {
      nextErrors.title = 'Enter a session title.';
    }
    if (!date || !time) {
      nextErrors.scheduledAt = 'Choose a date and time.';
    }
    if (effectiveSessionType === 'individual') {
      if (!playerId) {
        nextErrors.playerId = mapSessionValidationMessage('individual_session_requires_player');
      }
    } else if (!effectiveTeamId) {
      nextErrors.teamId = mapSessionValidationMessage('team_session_requires_team');
    }
    setFieldErrors(nextErrors);
    const messages = Object.values(nextErrors);
    return messages.length > 0 ? messages.join(' ') : null;
  }

  function handleSubmit(event) {
    event.preventDefault();
    const validationMessage = validateRequiredFields();
    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }
    setFormError(null);
    setFieldErrors({});
    onSubmit({
      title,
      notes,
      scheduledAt: toIsoDateTime(date, time),
      durationMinutes: 60,
      sessionType: effectiveSessionType,
      teamId: effectiveSessionType === 'individual' ? null : effectiveTeamId || null,
      playerId: effectiveSessionType === 'individual' ? playerId || null : null,
      contentRefs: orderedContent,
    });
  }

  const pageTitle = readOnly
    ? 'SESSION DETAILS'
    : mode === 'edit'
      ? 'EDIT SESSION'
      : 'NEW SESSION';

  if (showContentPicker && !readOnly) {
    const pickerItems = pickerTab === 'library' ? libraryItems : purchasedItems;
    return (
      <ScreenContainer>
        <PageHeader
          title="ADD CONTENT"
          onBack={function () {
            setShowContentPicker(false);
          }}
        />
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={function () {
              setPickerTab('library');
            }}
            className={`flex-1 cursor-pointer rounded-xl border px-3 py-2.5 font-display text-xs font-semibold uppercase tracking-wider ${pickerTab === 'library' ? 'border-coach-orange bg-coach-orange text-white' : 'border-coach-border bg-coach-card text-coach-t2'}`}
          >
            Library
          </button>
          <button
            type="button"
            onClick={function () {
              setPickerTab('purchased');
            }}
            className={`flex-1 cursor-pointer rounded-xl border px-3 py-2.5 font-display text-xs font-semibold uppercase tracking-wider ${pickerTab === 'purchased' ? 'border-coach-orange bg-coach-orange text-white' : 'border-coach-border bg-coach-card text-coach-t2'}`}
          >
            Purchased
          </button>
        </div>
        {pickerItems.length === 0 ? (
          <div className="px-6 py-10 text-center font-body text-coach-t3">
            {pickerTab === 'library' ? 'No library items yet' : 'No purchased packages yet'}
          </div>
        ) : (
          pickerItems.map(function (item) {
            return (
              <Card
                key={`${item.source}-${item.id}`}
                onClick={function () {
                  handleAttachItem(item);
                }}
                className="cursor-pointer"
              >
                <div className="mb-1 font-body text-xs font-semibold uppercase text-coach-orange">
                  {contentKindLabel(item.kind)}
                  {item.kind === 'package' ? ' · single unit' : ''}
                </div>
                <div className="font-display text-base font-bold text-coach-t1">{item.title}</div>
              </Card>
            );
          })
        )}
      </ScreenContainer>
    );
  }

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
          onChange={(event) => {
            setTitle(event.target.value);
            setFieldErrors((current) => ({ ...current, title: undefined }));
          }}
          placeholder="e.g. Shooting Drills"
          aria-invalid={Boolean(fieldErrors.title)}
          className={`mb-1 ${fieldClass(Boolean(fieldErrors.title))}`}
        />
        {fieldErrors.title ? (
          <p className="mb-3 font-body text-xs text-coach-red">{fieldErrors.title}</p>
        ) : (
          <div className="mb-3.5" />
        )}

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
              onChange={(event) => {
                setDate(event.target.value);
                setFieldErrors((current) => ({ ...current, scheduledAt: undefined }));
              }}
              aria-invalid={Boolean(fieldErrors.scheduledAt)}
              className={fieldClass(Boolean(fieldErrors.scheduledAt))}
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
              onChange={(event) => {
                setTime(event.target.value);
                setFieldErrors((current) => ({ ...current, scheduledAt: undefined }));
              }}
              aria-invalid={Boolean(fieldErrors.scheduledAt)}
              className={fieldClass(Boolean(fieldErrors.scheduledAt))}
            />
          </div>
        </div>
        {fieldErrors.scheduledAt ? (
          <p className="-mt-2 mb-3.5 font-body text-xs text-coach-red">{fieldErrors.scheduledAt}</p>
        ) : null}

        <label className="mb-1.5 block font-body text-xs uppercase text-coach-t3" htmlFor="session-type">
          Session type
        </label>
        <select
          id="session-type"
          value={effectiveSessionType}
          disabled={readOnly}
          onChange={(event) => setSessionType(event.target.value)}
          className={`mb-3.5 ${fieldClass(false)}`}
        >
          {SESSION_MVP_TYPES
            .filter((entry) => canCreateIndividual || entry.value !== 'individual')
            .map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
        </select>

        <div className="mb-1.5 font-body text-xs uppercase text-coach-t3">Share with</div>
        {effectiveSessionType === 'individual' ? (
          <>
            <label className="mb-1.5 block font-body text-xs uppercase text-coach-t3" htmlFor="session-player">
              Individual player
            </label>
            <select
              id="session-player"
              data-testid="share-recipient-player"
              value={playerId}
              disabled={readOnly}
              onChange={(event) => {
                setPlayerId(event.target.value);
                setFieldErrors((current) => ({ ...current, playerId: undefined }));
              }}
              aria-invalid={Boolean(fieldErrors.playerId)}
              className={`mb-1 ${fieldClass(Boolean(fieldErrors.playerId))}`}
            >
              <option value="">Select player</option>
              {players.map((player) => (
                <option key={player.profileId} value={player.profileId}>
                  {player.displayName ?? player.profileId}
                </option>
              ))}
            </select>
            {fieldErrors.playerId ? (
              <p className="mb-3.5 font-body text-xs text-coach-red">{fieldErrors.playerId}</p>
            ) : (
              <div className="mb-3.5" />
            )}
          </>
        ) : (
          <>
            <label className="mb-1.5 block font-body text-xs uppercase text-coach-t3" htmlFor="session-team">
              Team (full roster)
            </label>
            <select
              id="session-team"
              data-testid="share-recipient-team"
              value={effectiveTeamId}
              disabled={readOnly}
              onChange={(event) => {
                setTeamId(event.target.value);
                setFieldErrors((current) => ({ ...current, teamId: undefined }));
              }}
              aria-invalid={Boolean(fieldErrors.teamId)}
              className={`mb-1 ${fieldClass(Boolean(fieldErrors.teamId))}`}
            >
              <option value="">Select team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
            {fieldErrors.teamId ? (
              <p className="mb-3.5 font-body text-xs text-coach-red">{fieldErrors.teamId}</p>
            ) : (
              <div className="mb-3.5" />
            )}
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

        <div className="mb-1.5 font-body text-xs uppercase text-coach-t3">Session content</div>
        <div data-testid="session-content-list" className="mb-3.5">
          {orderedContent.length === 0 ? (
            <div className="rounded-xl border border-dashed border-coach-border px-4 py-5 text-center font-body text-sm text-coach-t3">
              No content attached
            </div>
          ) : (
            orderedContent.map(function (ref, index) {
              return (
                <Card key={`${ref.source}-${ref.id}-${ref.sortOrder}`} className="mb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="mb-1 font-body text-xs font-semibold text-coach-orange">
                        {index + 1}. {contentKindLabel(ref.kind)}
                        {ref.source === 'purchase' ? ' · Purchased' : ' · Library'}
                        {ref.kind === 'package' ? ' · single unit' : ''}
                      </div>
                      <div className="font-display text-base font-bold text-coach-t1">{ref.title}</div>
                    </div>
                    {!readOnly ? (
                      <button
                        type="button"
                        onClick={function () {
                          handleRemoveContent(ref.sortOrder);
                        }}
                        className="cursor-pointer border-0 bg-transparent font-body text-xs text-coach-red"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </Card>
              );
            })
          )}
        </div>
        {!readOnly ? (
          <DashedBtn
            onClick={function () {
              setShowContentPicker(true);
            }}
          >
            + Add content
          </DashedBtn>
        ) : null}

        {displayError ? <p className="mb-3 mt-3 font-body text-sm text-coach-red">{displayError}</p> : null}

        {!readOnly ? (
          <>
            <div className="mt-3">
              <Btn primary full type="submit" disabled={saving}>
                {saving ? 'Saving…' : mode === 'edit' ? 'Save Session' : 'Create Session'}
              </Btn>
            </div>
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
  const [libraryItems, setLibraryItems] = useState([]);
  const [purchasedItems, setPurchasedItems] = useState([]);
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
  const canViewSchedule = useMemo(
    () =>
      appRole
        ? canViewSharedSchedule(appRole, accessSubscription)
        : false,
    [appRole, accessSubscription],
  );

  const loadBaseData = useCallback(
    async function () {
      if (!userId) {
        setSessions([]);
        setTeams([]);
        setPlayers([]);
        setLibraryItems([]);
        setPurchasedItems([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const isCoachLike =
          appRole === 'coach' || appRole === 'team_manager' || appRole === 'admin';
        const [sessionRows, ownedTeams, memberTeams, libraryRows, purchaseRows] = await Promise.all([
          repos.sessions.listForUser(userId),
          isCoachLike ? repos.teams.listForUser(userId) : Promise.resolve([]),
          appRole === 'team_manager' || appRole === 'player'
            ? repos.rosters.listMemberTeams(userId)
            : Promise.resolve([]),
          isCoachLike ? repos.library.listCoachLibrary(userId) : Promise.resolve([]),
          isCoachLike ? repos.library.listPurchasedContent(userId) : Promise.resolve([]),
        ]);
        const nextTeams = uniqueTeams([...(ownedTeams ?? []), ...(memberTeams ?? [])]);
        setSessions(sessionRows.filter((entry) => entry.status !== 'cancelled'));
        setTeams(nextTeams);
        setLibraryItems(libraryRows ?? []);
        setPurchasedItems(purchaseRows ?? []);

        if (isCoachLike && nextTeams.length > 0) {
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
        setLibraryItems([]);
        setPurchasedItems([]);
      } finally {
        setLoading(false);
      }
    },
    [appRole, repos.library, repos.rosters, repos.sessions, repos.teams, userId],
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
        const created = await repos.sessions.createSession(userId, input);
        repos.notifications.enqueueSessionChange({
          sessionId: created.id,
          coachId: created.coachId,
          teamId: created.teamId,
          playerId: created.playerId,
          triggeredBy: userId,
          event: 'session_created',
        });
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

  if (!canViewSchedule) {
    return (
      <ScreenContainer>
        <PageHeader title="SCHEDULE" user={user} />
        <div className="py-[60px] text-center" data-testid="schedule-paywall">
          <div className="mb-3 text-coach-t3"><IconLock /></div>
          <div className="mb-2 font-display text-lg font-semibold text-coach-t1">Schedule Locked</div>
          <div className="mb-5 font-body text-[13px] text-coach-t3">
            Upgrade to Basic to view your shared schedule.
          </div>
          <Btn primary onClick={function () { tryA('viewSchedule', function () {}); }}>Upgrade</Btn>
        </div>
      </ScreenContainer>
    );
  }

  if (showCreate || editingSession || viewingSession) {
    const activeSession = editingSession ?? viewingSession;
    const isReadOnly = Boolean(viewingSession);
    return (
      <SessionForm
        mode={editingSession ? 'edit' : 'create'}
        readOnly={isReadOnly}
        initialSession={activeSession}
        defaultDate={showCreate && !activeSession ? dateForWeekday(selectedDay) : undefined}
        teams={teams}
        players={players}
        libraryItems={libraryItems}
        purchasedItems={purchasedItems}
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

  const scheduleSessions =
    appRole === 'player' ? filterUpcomingSessions(sessions) : sessions;
  const dayData = scheduleSessions.filter(
    (entry) => new Date(entry.scheduledAt).getDay() === selectedDay,
  );
  const daysWithSessions = Array.from({ length: 7 }, () => false);
  for (const entry of scheduleSessions) {
    daysWithSessions[new Date(entry.scheduledAt).getDay()] = true;
  }

  return (
    <ScreenContainer>
      <PageHeader title="SCHEDULE" user={user} />
      <div className="mb-5 flex gap-1.5">
        {days.map(function (day, index) {
          const active = selectedDay === index;
          const hasSessions = daysWithSessions[index];
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
              {hasSessions ? (
                <div
                  className={`mx-auto mt-1 h-1.5 w-1.5 rounded-full ${active ? 'bg-white' : 'bg-coach-orange'}`}
                  aria-hidden
                />
              ) : (
                <div className="mt-1 h-1.5" aria-hidden />
              )}
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
        <div className="px-10 py-10 text-center font-body text-coach-t3">
          {scheduleSessions.length > 0
            ? 'No sessions on this day — try a day with an orange dot.'
            : appRole === 'player'
              ? 'No upcoming sessions shared with you yet.'
              : 'No sessions scheduled'}
        </div>
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
