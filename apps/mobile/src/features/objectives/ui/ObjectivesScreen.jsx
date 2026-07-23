import { useCallback, useEffect, useState } from 'react';
import { useRepositories } from '@coach360/api';
import {
  computeObjectiveProgress,
  createObjectiveInputSchema,
} from '@coach360/domain';
import { useAuth } from '@/features/auth/model/use-auth.js';
import {
  Button as Btn,
  Card,
  DashedBtn,
  Field,
  PageHeader,
  ScreenContainer,
} from '@/shared/ui/primitives.jsx';

const CATEGORIES = [
  { id: '', label: 'None' },
  { id: 'shooting', label: 'Shooting' },
  { id: 'defense', label: 'Defense' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'other', label: 'Other' },
];

function progressColor(pct) {
  if (pct >= 80) return '#34D399';
  if (pct >= 50) return '#FBBF24';
  return '#FF6B2C';
}

/** Circular progress ring for player Pro view (STORY-11.1 AC-2). */
export function ObjectiveProgressRing({ percent, size = 56, testId }) {
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference - (clamped / 100) * circumference;
  const color = progressColor(clamped);

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      data-testid={testId || 'objective-progress-ring'}
      data-progress={clamped}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#2A3040"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center font-mono text-[11px] font-semibold text-coach-t1"
        data-testid="objective-progress-pct"
      >
        {clamped}%
      </span>
    </div>
  );
}

function assigneeLabel(objective, nameById) {
  if (objective.scope === 'player' && objective.playerId) {
    return nameById[objective.playerId] || 'Player';
  }
  if (objective.scope === 'team' && objective.teamId) {
    return nameById[objective.teamId] || 'Team';
  }
  return objective.scope === 'team' ? 'Team' : 'Player';
}

export function ObjectivesScreen({ user, onBack }) {
  const { session } = useAuth();
  const repos = useRepositories();
  const userId = session?.user.id;
  const role = session?.user.role || user?.role;
  const isCoach = role === 'coach';

  const [objectives, setObjectives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [nameById, setNameById] = useState({});

  const [title, setTitle] = useState('');
  const [scope, setScope] = useState('player');
  const [playerId, setPlayerId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [category, setCategory] = useState('');
  const [targetCompletions, setTargetCompletions] = useState('10');

  const loadObjectives = useCallback(
    async function () {
      if (!userId || !role) {
        setObjectives([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const rows = await repos.objectives.listForUser(userId, role);
        setObjectives(rows);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'objectives_load_failed');
        setObjectives([]);
      } finally {
        setLoading(false);
      }
    },
    [repos.objectives, role, userId],
  );

  const loadAssigneeOptions = useCallback(
    async function () {
      if (!userId || !isCoach) {
        return;
      }

      try {
        const nextTeams = await repos.teams.listForUser(userId);
        setTeams(nextTeams);

        const names = {};
        for (const team of nextTeams) {
          names[team.id] = team.name;
        }

        const playerMap = new Map();
        for (const team of nextTeams) {
          const members = await repos.rosters.listMembers(team.id);
          for (const member of members) {
            if (member.rosterRole !== 'player' || member.status !== 'active') {
              continue;
            }
            if (!playerMap.has(member.profileId)) {
              playerMap.set(member.profileId, {
                id: member.profileId,
                name: member.displayName || 'Player',
                teamName: team.name,
              });
            }
            names[member.profileId] = member.displayName || 'Player';
          }
        }

        setPlayers(Array.from(playerMap.values()));
        setNameById(names);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'assignees_load_failed');
      }
    },
    [isCoach, repos.rosters, repos.teams, userId],
  );

  useEffect(
    function () {
      loadObjectives();
    },
    [loadObjectives],
  );

  useEffect(
    function () {
      loadAssigneeOptions();
    },
    [loadAssigneeOptions],
  );

  async function handleCreate(event) {
    event.preventDefault();
    if (!userId || !isCoach) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const parsed = createObjectiveInputSchema.parse({
        title,
        scope,
        playerId: scope === 'player' ? playerId || null : null,
        teamId: scope === 'team' ? teamId || null : null,
        category: category || null,
        targetCompletions: Number(targetCompletions) || 10,
      });

      await repos.objectives.create(userId, parsed);
      setCreating(false);
      setTitle('');
      setScope('player');
      setPlayerId('');
      setTeamId('');
      setCategory('');
      setTargetCompletions('10');
      await loadObjectives();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'objectives_create_failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenContainer data-testid="objectives-screen">
      <PageHeader title="OBJECTIVES" onBack={onBack} />

      {error ? (
        <p className="mb-3 font-body text-sm text-coach-red" data-testid="objectives-error">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="font-body text-sm text-coach-t2">Loading objectives…</p>
      ) : null}

      {!loading && objectives.length === 0 && !creating ? (
        <Card className="p-6 text-center" data-testid="objectives-empty">
          <p className="font-body text-sm text-coach-t2">
            {isCoach
              ? 'No objectives yet. Add a player or team goal.'
              : 'No objectives assigned yet.'}
          </p>
        </Card>
      ) : null}

      {!loading &&
        objectives.map(function (objective) {
          const pct = computeObjectiveProgress(
            objective.currentCompletions,
            objective.targetCompletions,
          );
          const barColor = progressColor(pct);

          if (!isCoach) {
            return (
              <Card
                key={objective.id}
                className="mb-2.5 flex items-center gap-3"
                data-testid="objective-card"
                data-scope={objective.scope}
              >
                <ObjectiveProgressRing percent={pct} />
                <div className="min-w-0 flex-1">
                  <div className="font-body text-sm font-semibold text-coach-t1">
                    {objective.title}
                  </div>
                  <div className="mt-1 font-body text-[11px] text-coach-t3">
                    {objective.currentCompletions}/{objective.targetCompletions} drills
                    {objective.scope === 'team' ? ' · Team' : ''}
                  </div>
                </div>
              </Card>
            );
          }

          return (
            <Card key={objective.id} className="mb-2.5" data-testid="objective-card" data-scope={objective.scope}>
              <div className="mb-1 flex justify-between">
                <span className="font-body text-sm font-semibold text-coach-t1">{objective.title}</span>
                <span className="font-mono text-sm" style={{ color: barColor }}>
                  {pct}%
                </span>
              </div>
              <div className="mb-2 font-body text-[11px] text-coach-t3">
                {assigneeLabel(objective, nameById)}
                {' · '}
                {objective.currentCompletions}/{objective.targetCompletions} drills
              </div>
              <div className="h-1.5 rounded-sm bg-coach-border">
                <div
                  className="h-full rounded-sm"
                  style={{ width: pct + '%', backgroundColor: barColor }}
                />
              </div>
            </Card>
          );
        })}

      {isCoach && creating ? (
        <Card className="mb-3" data-testid="objective-create-form">
          <form onSubmit={handleCreate}>
            <Field
              id="objective-title"
              label="Title"
              placeholder="Improve 3PT to 40%"
              value={title}
              onChange={function (e) {
                setTitle(e.target.value);
              }}
            />

            <div className="mb-3.5">
              <div className="mb-1.5 font-body text-xs uppercase text-coach-t3">Scope</div>
              <div className="flex gap-2" data-testid="objective-scope-toggle">
                {['player', 'team'].map(function (value) {
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={function () {
                        setScope(value);
                      }}
                      className={`flex-1 cursor-pointer rounded-xl border-none py-2.5 font-display text-[12px] font-semibold uppercase ${
                        scope === value
                          ? 'bg-coach-orange text-white'
                          : 'bg-coach-orange-glow text-coach-orange'
                      }`}
                      data-testid={value === 'player' ? 'objective-scope-player' : 'objective-scope-team'}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>

            {scope === 'player' ? (
              <div className="mb-3.5">
                <label
                  htmlFor="objective-player"
                  className="mb-1.5 block font-body text-xs uppercase text-coach-t3"
                >
                  Player
                </label>
                <select
                  id="objective-player"
                  data-testid="objective-player-select"
                  value={playerId}
                  onChange={function (e) {
                    setPlayerId(e.target.value);
                  }}
                  className="box-border w-full rounded-xl border border-coach-border bg-coach-card px-4 py-3.5 font-body text-base text-coach-t1 outline-none"
                >
                  <option value="">Select player</option>
                  {players.map(function (player) {
                    return (
                      <option key={player.id} value={player.id}>
                        {player.name} ({player.teamName})
                      </option>
                    );
                  })}
                </select>
              </div>
            ) : (
              <div className="mb-3.5">
                <label
                  htmlFor="objective-team"
                  className="mb-1.5 block font-body text-xs uppercase text-coach-t3"
                >
                  Team
                </label>
                <select
                  id="objective-team"
                  data-testid="objective-team-select"
                  value={teamId}
                  onChange={function (e) {
                    setTeamId(e.target.value);
                  }}
                  className="box-border w-full rounded-xl border border-coach-border bg-coach-card px-4 py-3.5 font-body text-base text-coach-t1 outline-none"
                >
                  <option value="">Select team</option>
                  {teams.map(function (team) {
                    return (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            <div className="mb-3.5">
              <label
                htmlFor="objective-category"
                className="mb-1.5 block font-body text-xs uppercase text-coach-t3"
              >
                Category
              </label>
              <select
                id="objective-category"
                data-testid="objective-category-select"
                value={category}
                onChange={function (e) {
                  setCategory(e.target.value);
                }}
                className="box-border w-full rounded-xl border border-coach-border bg-coach-card px-4 py-3.5 font-body text-base text-coach-t1 outline-none"
              >
                {CATEGORIES.map(function (item) {
                  return (
                    <option key={item.id || 'none'} value={item.id}>
                      {item.label}
                    </option>
                  );
                })}
              </select>
            </div>

            <Field
              id="objective-target"
              label="Target drills"
              type="number"
              placeholder="10"
              value={targetCompletions}
              onChange={function (e) {
                setTargetCompletions(e.target.value);
              }}
            />

            <div className="mt-2 flex gap-2">
              <Btn
                full
                type="button"
                disabled={saving}
                onClick={function () {
                  setCreating(false);
                }}
              >
                Cancel
              </Btn>
              <Btn primary full type="submit" disabled={saving} data-testid="objective-save">
                {saving ? 'Saving…' : 'Save objective'}
              </Btn>
            </div>
          </form>
        </Card>
      ) : null}

      {isCoach && !creating ? (
        <DashedBtn
          onClick={function () {
            setCreating(true);
          }}
          data-testid="objective-add"
        >
          + Add Objective
        </DashedBtn>
      ) : null}
    </ScreenContainer>
  );
}
