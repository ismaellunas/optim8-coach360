import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRepositories } from '@coach360/api';
import {
  buildCorrectiveSessionInput,
  canViewPeerEngagement,
  coachProgressFeaturesForAccess,
  featureAccessLevel,
  filterCoachCompletions,
  formatCompletionLabel,
  summarizePeerEngagement,
  summarizePlayerProgress,
} from '@coach360/domain';
import { useAuth } from '@/features/auth/model/use-auth.js';
import {
  playerDisplayLabel,
  resolvePlayerDisplayNames,
} from '@/features/progress/lib/resolve-player-display-names.js';
import {
  Button as Btn,
  Card,
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

function formatCompletedAt(iso) {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function CoachProgressReviewScreen({
  user,
  tryA,
  onSendFeedback,
  onShareViaSchedule,
}) {
  const { session } = useAuth();
  const repos = useRepositories();
  const coachId = session?.user.id;

  const accessLevel = user
    ? featureAccessLevel(user.role, user.tier, 'viewProgress')
    : 'none';
  const features = coachProgressFeaturesForAccess(accessLevel);
  const peerEngagementAllowed = user
    ? canViewPeerEngagement(user.role, user.tier)
    : false;

  const [completions, setCompletions] = useState([]);
  const [playerNames, setPlayerNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assignBusy, setAssignBusy] = useState(null);
  const [assignMessage, setAssignMessage] = useState(null);
  const [peerEngagement, setPeerEngagement] = useState(null);

  const [playerFilter, setPlayerFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const loadData = useCallback(
    async function () {
      if (!coachId || accessLevel === 'none') {
        setCompletions([]);
        setPeerEngagement(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const [rows, teamList] = await Promise.all([
          repos.sessionContent.listCoachCompletions(),
          repos.teams.listForUser(coachId),
        ]);

        setCompletions(rows);

        const playerIds = rows.map(function (row) {
          return row.playerId;
        });
        const nameMap = await resolvePlayerDisplayNames(repos, teamList, playerIds);
        setPlayerNames(nameMap);

        if (peerEngagementAllowed && teamList.length > 0) {
          const shareLists = await Promise.all(
            teamList.map(function (team) {
              return repos.messaging.listTeamPeerShares(team.id);
            }),
          );
          setPeerEngagement(summarizePeerEngagement(shareLists.flat()));
        } else {
          setPeerEngagement(null);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'coach_progress_load_failed');
        setCompletions([]);
        setPeerEngagement(null);
      } finally {
        setLoading(false);
      }
    },
    [
      accessLevel,
      coachId,
      peerEngagementAllowed,
      repos.messaging,
      repos.profiles,
      repos.rosters,
      repos.sessionContent,
      repos.teams,
    ],
  );

  useEffect(
    function () {
      loadData();
    },
    [loadData],
  );

  const filtered = useMemo(
    function () {
      const fromIso = fromDate ? `${fromDate}T00:00:00.000Z` : undefined;
      return filterCoachCompletions(completions, {
        playerId: playerFilter || undefined,
        from: fromIso,
        to: toDate || undefined,
      });
    },
    [completions, fromDate, playerFilter, toDate],
  );

  const summary = useMemo(
    function () {
      return summarizePlayerProgress(filtered);
    },
    [filtered],
  );

  const playerOptions = useMemo(
    function () {
      const ids = [...new Set(completions.map(function (row) { return row.playerId; }))];
      return ids.sort(function (a, b) {
        const nameA = playerDisplayLabel(playerNames, a);
        const nameB = playerDisplayLabel(playerNames, b);
        return nameA.localeCompare(nameB);
      });
    },
    [completions, playerNames],
  );

  async function handleAssignDrill(entry) {
    if (!coachId || !features.canAssignDrills) {
      return;
    }
    const input = buildCorrectiveSessionInput(
      entry.playerId,
      entry.contentKey,
      'Corrective drill',
    );
    if (!input) {
      setAssignMessage('Could not parse drill from completion.');
      return;
    }

    setAssignBusy(entry.contentKey + entry.playerId);
    setAssignMessage(null);
    try {
      const created = await repos.sessions.createSession(coachId, input);
      repos.notifications.enqueueSessionChange({
        sessionId: created.id,
        coachId: created.coachId,
        teamId: created.teamId,
        playerId: created.playerId,
        triggeredBy: coachId,
        event: 'session_created',
      });
      setAssignMessage('Corrective drill assigned.');
    } catch (cause) {
      setAssignMessage(cause instanceof Error ? cause.message : 'corrective_assign_failed');
    } finally {
      setAssignBusy(null);
    }
  }

  if (accessLevel === 'none') {
    return (
      <ScreenContainer>
        <PageHeader title="PLAYER PROGRESS" user={user} />
        <div
          className="rounded-xl border border-coach-border bg-coach-card px-4 py-8 text-center"
          data-testid="coach-progress-tier-locked"
        >
          <div className="mb-2 flex justify-center text-coach-t3">
            <IconLock />
          </div>
          <p className="mb-4 font-body text-sm text-coach-t2">
            Upgrade to Advanced to review player drill completions and provide feedback.
          </p>
          <Btn
            primary
            onClick={function () {
              tryA('viewProgress', function () {});
            }}
          >
            Upgrade
          </Btn>
        </div>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer data-testid="coach-progress-dashboard">
      <PageHeader title="PLAYER PROGRESS" user={user} />

      {accessLevel === 'readonly' ? (
        <Card
          className="mb-4 border border-coach-orange/20 bg-coach-orange-glow/40"
          data-testid="coach-progress-basic-banner"
        >
          <div className="font-body text-[13px] font-semibold text-coach-t1">Basic progress track</div>
          <div className="font-body text-xs text-coach-t2">
            Limited roster view. Upgrade to Advanced for filters, feedback, and drill assignment.
          </div>
        </Card>
      ) : null}

      <div className="mb-3 grid grid-cols-2 gap-2.5">
        <Card data-testid="coach-progress-drills-count">
          <div className="font-body text-xs uppercase text-coach-t3">Drills logged</div>
          <div className="mt-1 font-display text-[26px] font-bold text-coach-t1">
            {summary.drillsCompleted}
          </div>
        </Card>
        <Card>
          <div className="font-body text-xs uppercase text-coach-t3">Completions</div>
          <div className="mt-1 font-display text-[26px] font-bold text-coach-t1">
            {summary.itemsCompleted}
          </div>
        </Card>
      </div>

      {features.canViewAiInsights ? null : (
        <Card className="mb-3 border border-coach-purple/20 bg-coach-purple/5" data-testid="coach-progress-ai-locked">
          <div className="font-body text-[13px] font-semibold text-coach-t1">AI performance insights</div>
          <div className="font-body text-xs text-coach-t2">Upgrade to Pro for AI-driven player insights.</div>
        </Card>
      )}

      {peerEngagementAllowed && peerEngagement ? (
        <Card className="mb-3" data-testid="coach-peer-engagement">
          <div className="mb-2 font-body text-[13px] font-semibold text-coach-t1">
            Peer sharing engagement
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div data-testid="coach-peer-engagement-total">
              <div className="font-body text-xs uppercase text-coach-t3">Shares</div>
              <div className="mt-1 font-display text-[22px] font-bold text-coach-t1">
                {peerEngagement.totalShares}
              </div>
            </div>
            <div data-testid="coach-peer-engagement-sharers">
              <div className="font-body text-xs uppercase text-coach-t3">Sharers</div>
              <div className="mt-1 font-display text-[22px] font-bold text-coach-t1">
                {peerEngagement.uniqueSharers}
              </div>
            </div>
            <div>
              <div className="font-body text-xs uppercase text-coach-t3">Achievements</div>
              <div className="mt-1 font-display text-[22px] font-bold text-coach-t1">
                {peerEngagement.achievementShares}
              </div>
            </div>
            <div>
              <div className="font-body text-xs uppercase text-coach-t3">Tips</div>
              <div className="mt-1 font-display text-[22px] font-bold text-coach-t1">
                {peerEngagement.insightShares}
              </div>
            </div>
          </div>
          {peerEngagement.recentTitles.length > 0 ? (
            <div className="mt-3" data-testid="coach-peer-engagement-recent">
              <div className="mb-1 font-body text-xs uppercase text-coach-t3">Recent</div>
              {peerEngagement.recentTitles.map(function (title) {
                return (
                  <div key={title} className="font-body text-[13px] text-coach-t2">
                    {title}
                  </div>
                );
              })}
            </div>
          ) : null}
        </Card>
      ) : null}

      {!peerEngagementAllowed ? (
        <Card
          className="mb-3 border border-coach-orange/20 bg-coach-orange-glow/40"
          data-testid="coach-peer-engagement-locked"
        >
          <div className="font-body text-[13px] font-semibold text-coach-t1">
            Peer sharing engagement
          </div>
          <div className="mb-3 font-body text-xs text-coach-t2">
            Upgrade to Pro to see aggregated teammate sharing metrics.
          </div>
          <Btn
            primary
            onClick={function () {
              tryA('peerEngagement', function () {});
            }}
          >
            Upgrade
          </Btn>
        </Card>
      ) : null}

      {features.canFilterByPlayer || features.canFilterByDate ? (
        <Card className="mb-3" data-testid="coach-progress-filters">
          {features.canFilterByPlayer ? (
            <>
              <label className="mb-1.5 block font-body text-xs uppercase text-coach-t3" htmlFor="coach-progress-player-filter">
                Player
              </label>
              <select
                id="coach-progress-player-filter"
                data-testid="coach-progress-player-filter"
                value={playerFilter}
                onChange={function (event) {
                  setPlayerFilter(event.target.value);
                }}
                className="mb-3 box-border w-full rounded-xl border border-coach-border bg-coach-card px-4 py-3 font-body text-sm text-coach-t1 outline-none"
              >
                <option value="">All players</option>
                {playerOptions.map(function (id) {
                  return (
                    <option key={id} value={id}>
                      {playerDisplayLabel(playerNames, id)}
                    </option>
                  );
                })}
              </select>
            </>
          ) : null}
          {features.canFilterByDate ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block font-body text-xs uppercase text-coach-t3" htmlFor="coach-progress-from">
                  From
                </label>
                <input
                  id="coach-progress-from"
                  type="date"
                  data-testid="coach-progress-date-from"
                  value={fromDate}
                  max={toDate || toLocalDateInput(new Date())}
                  onChange={function (event) {
                    setFromDate(event.target.value);
                  }}
                  className="box-border w-full rounded-xl border border-coach-border bg-coach-card px-3 py-2.5 font-body text-sm text-coach-t1 outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block font-body text-xs uppercase text-coach-t3" htmlFor="coach-progress-to">
                  To
                </label>
                <input
                  id="coach-progress-to"
                  type="date"
                  data-testid="coach-progress-date-to"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={function (event) {
                    setToDate(event.target.value);
                  }}
                  className="box-border w-full rounded-xl border border-coach-border bg-coach-card px-3 py-2.5 font-body text-sm text-coach-t1 outline-none"
                />
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}

      {loading ? (
        <p className="font-body text-sm text-coach-t2">Loading completions…</p>
      ) : null}

      {!loading && error ? (
        <p className="mb-3 font-body text-sm text-coach-red">{error}</p>
      ) : null}

      {assignMessage ? (
        <p className="mb-3 font-body text-sm text-coach-green" data-testid="coach-progress-assign-message">
          {assignMessage}
        </p>
      ) : null}

      <div className="mb-2 font-display text-sm font-semibold uppercase text-coach-t1">
        Drill completions
      </div>

      {!loading && filtered.length === 0 ? (
        <Card data-testid="coach-progress-empty">
          <p className="font-body text-sm text-coach-t2">No drill completions match your filters.</p>
        </Card>
      ) : null}

      <div data-testid="coach-progress-completion-list">
        {!loading
          ? filtered.map(function (entry) {
              const playerLabel = playerDisplayLabel(playerNames, entry.playerId);
              const busyKey = entry.contentKey + entry.playerId;
              return (
                <Card key={`${entry.sessionId}-${entry.contentKey}-${entry.completedAt}`}>
                  <div className="mb-1 font-body text-xs font-semibold uppercase text-coach-orange">
                    {formatCompletionLabel(entry.contentKey)}
                  </div>
                  <div className="font-body text-sm font-semibold text-coach-t1">{playerLabel}</div>
                  <div className="mt-1 font-body text-xs text-coach-t3">
                    {formatCompletedAt(entry.completedAt)}
                    {typeof entry.reps === 'number' ? ` · ${entry.reps} reps` : ''}
                    {typeof entry.durationSeconds === 'number'
                      ? ` · ${Math.round(entry.durationSeconds / 60)}m`
                      : ''}
                  </div>
                  {features.canSendFeedback || features.canAssignDrills ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {features.canSendFeedback ? (
                        <Btn
                          small
                          onClick={function () {
                            onSendFeedback({
                              playerId: entry.playerId,
                              displayName: playerLabel,
                              contentKey: entry.contentKey,
                            });
                          }}
                          data-testid="coach-send-feedback"
                        >
                          Send feedback
                        </Btn>
                      ) : null}
                      {features.canAssignDrills ? (
                        <Btn
                          small
                          disabled={assignBusy === busyKey}
                          onClick={function () {
                            handleAssignDrill(entry);
                          }}
                          data-testid="coach-assign-corrective-drill"
                        >
                          Assign drill
                        </Btn>
                      ) : null}
                      {features.canAssignDrills && onShareViaSchedule ? (
                        <Btn
                          small
                          onClick={function () {
                            onShareViaSchedule({
                              playerId: entry.playerId,
                              contentKey: entry.contentKey,
                            });
                          }}
                          data-testid="coach-share-via-schedule"
                        >
                          Share via schedule
                        </Btn>
                      ) : null}
                    </div>
                  ) : null}
                </Card>
              );
            })
          : null}
      </div>

      <div className="h-6" />
    </ScreenContainer>
  );
}
