import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRepositories } from '@coach360/api';
import {
  SESSION_MVP_TYPES,
  canAccessSessionContent,
  computeCompletionPercent,
  sessionContentAccessMessage,
  sessionContentKey,
} from '@coach360/domain';
import {
  Badge,
  Button as Btn,
  Card,
  PageHeader,
  ScreenContainer,
} from '@/shared/ui/primitives.jsx';
import { SessionVideoPlayer } from './SessionVideoPlayer.jsx';

function IconLock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

function formatSessionWhen(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
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

function parseOptionalInt(raw) {
  const trimmed = String(raw ?? '').trim();
  if (trimmed === '') {
    return null;
  }
  const value = Number.parseInt(trimmed, 10);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function SessionContentRow({
  refItem,
  index,
  completed,
  completionEntry,
  mediaUrl,
  canInteract,
  busy,
  onToggleComplete,
  onLogDrill,
}) {
  const showVideo = refItem.kind === 'video' || refItem.kind === 'package';
  const isDrill = refItem.kind === 'drill';
  const [reps, setReps] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');

  return (
    <Card
      data-testid={`player-session-content-${refItem.kind}-${refItem.source}-${refItem.id}`}
      className={completed ? 'border-l-[3px] border-l-coach-green' : 'border-l-[3px] border-l-coach-orange'}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="mb-1 font-body text-xs font-semibold uppercase text-coach-orange">
            {index + 1}. {contentKindLabel(refItem.kind)}
            {refItem.source === 'purchase' ? ' · Purchased' : ' · Library'}
            {refItem.kind === 'package' ? ' · single unit' : ''}
          </div>
          <div className="font-display text-base font-bold text-coach-t1">{refItem.title}</div>
          {completed && completionEntry && (completionEntry.reps != null || completionEntry.durationSeconds != null) ? (
            <div className="mt-1 font-body text-xs text-coach-t3" data-testid="drill-log-summary">
              {completionEntry.reps != null ? `${completionEntry.reps} reps` : null}
              {completionEntry.reps != null && completionEntry.durationSeconds != null ? ' · ' : null}
              {completionEntry.durationSeconds != null
                ? `${Math.round(completionEntry.durationSeconds / 60)} min`
                : null}
            </div>
          ) : null}
        </div>
        {completed ? (
          <Badge tone="green">Done</Badge>
        ) : (
          <Badge tone="orange">To do</Badge>
        )}
      </div>

      {showVideo && canInteract && mediaUrl ? (
        <div className="mb-3" data-testid="session-video-container">
          <SessionVideoPlayer src={mediaUrl} title={refItem.title} />
        </div>
      ) : null}

      {canInteract && isDrill && !completed ? (
        <div className="mb-3 grid grid-cols-2 gap-3" data-testid="drill-log-form">
          <div>
            <label className="mb-1.5 block font-body text-xs uppercase text-coach-t3" htmlFor={`drill-reps-${index}`}>
              Reps (optional)
            </label>
            <input
              id={`drill-reps-${index}`}
              type="number"
              min={0}
              value={reps}
              onChange={function (event) {
                setReps(event.target.value);
              }}
              placeholder="e.g. 50"
              className="box-border w-full rounded-xl border border-coach-border bg-coach-card px-3 py-2.5 font-body text-sm text-coach-t1 outline-none"
            />
          </div>
          <div>
            <label
              className="mb-1.5 block font-body text-xs uppercase text-coach-t3"
              htmlFor={`drill-time-${index}`}
            >
              Time (min, optional)
            </label>
            <input
              id={`drill-time-${index}`}
              type="number"
              min={0}
              value={durationMinutes}
              onChange={function (event) {
                setDurationMinutes(event.target.value);
              }}
              placeholder="e.g. 10"
              className="box-border w-full rounded-xl border border-coach-border bg-coach-card px-3 py-2.5 font-body text-sm text-coach-t1 outline-none"
            />
          </div>
        </div>
      ) : null}

      {canInteract ? (
        <Btn
          small
          primary={!completed}
          disabled={busy || completed}
          onClick={function () {
            if (isDrill && !completed) {
              const durationSeconds = parseOptionalInt(durationMinutes);
              onLogDrill(refItem, {
                reps: parseOptionalInt(reps),
                durationSeconds: durationSeconds != null ? durationSeconds * 60 : null,
              });
              return;
            }
            onToggleComplete(refItem);
          }}
        >
          {completed ? 'Completed' : isDrill ? 'Log drill complete' : 'Mark complete'}
        </Btn>
      ) : (
        <p className="font-body text-xs text-coach-t3">Complete this when the session is available.</p>
      )}
    </Card>
  );
}

export function PlayerSessionDetailScreen({ session, playerId, onBack }) {
  const repos = useRepositories();
  const [completions, setCompletions] = useState([]);
  const [mediaUrls, setMediaUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);
  const [error, setError] = useState(null);

  const orderedContent = useMemo(
    () => [...(session.contentRefs ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [session.contentRefs],
  );

  const canInteract = canAccessSessionContent(session);
  const accessMessage = sessionContentAccessMessage(session);

  const completionByKey = useMemo(
    () => new Map(completions.map((entry) => [entry.contentKey, entry])),
    [completions],
  );

  const completedCount = useMemo(
    function () {
      return orderedContent.filter(function (refItem) {
        return completionByKey.has(sessionContentKey(refItem));
      }).length;
    },
    [completionByKey, orderedContent],
  );

  const sessionProgressPercent = computeCompletionPercent(completedCount, orderedContent.length);

  const loadData = useCallback(
    async function () {
      if (!playerId || !session?.id) {
        setCompletions([]);
        setMediaUrls({});
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const completionRows = await repos.sessionContent.listCompletions(session.id, playerId);
        setCompletions(completionRows);

        const urlEntries = await Promise.all(
          orderedContent
            .filter((ref) => ref.kind === 'video' || ref.kind === 'package')
            .map(async function (ref) {
              const key = sessionContentKey(ref);
              try {
                const url = await repos.sessionContent.resolveMediaUrl(ref, session.coachId);
                return [key, url];
              } catch {
                return [key, null];
              }
            }),
        );
        setMediaUrls(Object.fromEntries(urlEntries));
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : 'session_content_load_failed';
        setError(message);
        setCompletions([]);
        setMediaUrls({});
      } finally {
        setLoading(false);
      }
    },
    [orderedContent, playerId, repos.sessionContent, session.coachId, session.id],
  );

  useEffect(
    function () {
      loadData();
    },
    [loadData],
  );

  async function saveCompletion(refItem, drillLog) {
    if (!playerId || !canInteract) {
      return;
    }
    const key = sessionContentKey(refItem);
    if (completionByKey.has(key)) {
      return;
    }

    setBusyKey(key);
    setError(null);
    try {
      const saved = await repos.sessionContent.markComplete(
        session.id,
        playerId,
        refItem,
        drillLog,
      );
      setCompletions(function (current) {
        const without = current.filter((entry) => entry.contentKey !== saved.contentKey);
        return [...without, saved];
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'session_completion_save_failed');
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <ScreenContainer>
      <PageHeader title="SESSION DETAILS" onBack={onBack} />
      <div data-testid="player-session-detail">
        <Card className="mb-4 border-l-[3px] border-l-coach-orange">
          <div className="mb-1 font-body text-xs font-semibold uppercase text-coach-orange">
            {formatSessionWhen(session.scheduledAt)}
          </div>
          <div className="font-display text-xl font-bold text-coach-t1">{session.title}</div>
          <div className="mt-1 font-body text-xs text-coach-t3">
            {sessionTypeLabel(session.sessionType)}
          </div>
          {session.notes ? (
            <p className="mt-3 font-body text-sm leading-relaxed text-coach-t2">{session.notes}</p>
          ) : null}
          {orderedContent.length > 0 ? (
            <div className="mt-4" data-testid="session-progress-bar">
              <div className="mb-1 flex justify-between font-body text-xs text-coach-t3">
                <span>Session progress</span>
                <span className="font-mono text-coach-t2">{sessionProgressPercent}%</span>
              </div>
              <div className="h-1.5 rounded-sm bg-coach-border">
                <div
                  className="h-full rounded-sm bg-coach-orange"
                  style={{ width: `${sessionProgressPercent}%` }}
                />
              </div>
            </div>
          ) : null}
        </Card>

        {!canInteract && accessMessage ? (
          <div
            className="mb-4 rounded-xl border border-coach-border bg-coach-card px-4 py-5 text-center"
            data-testid="session-content-locked"
          >
            <div className="mb-2 flex justify-center text-coach-t3">
              <IconLock />
            </div>
            <p className="font-body text-sm text-coach-t2">{accessMessage}</p>
          </div>
        ) : null}

        <div className="mb-1.5 font-body text-xs uppercase text-coach-t3">Session content</div>
        <div data-testid="player-session-content-list">
          {loading ? (
            <div className="px-4 py-8 text-center font-body text-sm text-coach-t3">Loading content…</div>
          ) : orderedContent.length === 0 ? (
            <div className="rounded-xl border border-dashed border-coach-border px-4 py-5 text-center font-body text-sm text-coach-t3">
              No content attached
            </div>
          ) : (
            orderedContent.map(function (refItem, index) {
              const key = sessionContentKey(refItem);
              const completionEntry = completionByKey.get(key) ?? null;
              return (
                <SessionContentRow
                  key={key}
                  refItem={refItem}
                  index={index}
                  completed={Boolean(completionEntry)}
                  completionEntry={completionEntry}
                  mediaUrl={mediaUrls[key] ?? null}
                  canInteract={canInteract}
                  busy={busyKey === key}
                  onToggleComplete={saveCompletion}
                  onLogDrill={saveCompletion}
                />
              );
            })
          )}
        </div>

        {error ? <p className="mt-3 font-body text-sm text-coach-red">{error}</p> : null}
      </div>
    </ScreenContainer>
  );
}
