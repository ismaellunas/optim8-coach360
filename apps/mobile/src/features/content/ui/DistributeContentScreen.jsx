import { useCallback, useEffect, useState } from 'react';
import { useRepositories } from '@coach360/api';
import {
  assignContentInputSchema,
  mapContentError,
} from '@coach360/domain';
import { useAuth } from '@/features/auth/model/use-auth.js';
import {
  Button as Btn,
  Card,
  PageHeader,
  ScreenContainer,
} from '@/shared/ui/primitives.jsx';

const fieldClass = (invalid) =>
  `box-border w-full rounded-xl border px-4 py-3.5 font-body text-base text-coach-t1 outline-none ${
    invalid ? 'border-coach-red bg-coach-card' : 'border-coach-border bg-coach-card'
  }`;

/**
 * Path A — share library item to full team roster or one roster player (STORY-9.4).
 */
export function DistributeContentScreen({ item, onBack, onDistributed }) {
  const repos = useRepositories();
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [mode, setMode] = useState('team');
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [teamId, setTeamId] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const load = useCallback(
    async function () {
      if (!userId) {
        setTeams([]);
        setPlayers([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const ownedTeams = await repos.teams.listForUser(userId);
        const nextTeams = ownedTeams ?? [];
        setTeams(nextTeams);

        if (nextTeams.length > 0) {
          const memberLists = await Promise.all(
            nextTeams.map((team) => repos.rosters.listMembers(team.id)),
          );
          const seen = new Set();
          const nextPlayers = [];
          for (const members of memberLists) {
            for (const member of members ?? []) {
              if (
                member.rosterRole === 'player' &&
                member.status === 'active' &&
                !seen.has(member.profileId)
              ) {
                seen.add(member.profileId);
                nextPlayers.push(member);
              }
            }
          }
          setPlayers(nextPlayers);
        } else {
          setPlayers([]);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'content_assign_load_failed');
      } finally {
        setLoading(false);
      }
    },
    [repos.rosters, repos.teams, userId],
  );

  useEffect(
    function () {
      load();
    },
    [load],
  );

  async function handleDistribute() {
    if (!userId || !item?.id) {
      return;
    }
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      const input = assignContentInputSchema.parse({
        libraryItemId: item.id,
        teamId: mode === 'team' ? teamId || null : null,
        playerId: mode === 'player' ? playerId || null : null,
      });
      const assignment = await repos.contentAssignments.assign(userId, input);
      repos.notifications.enqueueContentAssigned({
        assignmentId: assignment.id,
        libraryItemId: assignment.libraryItemId,
        coachId: assignment.coachId,
        teamId: assignment.teamId,
        playerId: assignment.playerId,
        triggeredBy: userId,
        event: 'content_assigned',
      });
      onDistributed?.(assignment);
    } catch (cause) {
      const raw = cause instanceof Error ? cause.message : 'content_assign_failed';
      if (raw.includes('content_recipient_required')) {
        setFieldErrors({
          teamId: mode === 'team' ? mapContentError('content_recipient_required') : undefined,
          playerId: mode === 'player' ? mapContentError('content_recipient_required') : undefined,
        });
      }
      setError(mapContentError(raw));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenContainer data-testid="distribute-content-screen">
      <PageHeader title="DISTRIBUTE" onBack={onBack} />
      <Card className="mb-4">
        <div className="font-display text-base font-semibold text-coach-t1">{item?.title}</div>
        <div className="mt-1 font-body text-[11px] uppercase text-coach-t3">{item?.kind}</div>
      </Card>

      <p className="mb-3 font-body text-[13px] text-coach-t2">
        Share privately with a full team roster or one roster player. Add individual clients to a
        team first (even a one-player team).
      </p>

      {loading ? (
        <div className="font-body text-sm text-coach-t3">Loading recipients…</div>
      ) : null}

      {error ? (
        <p className="mb-3 font-body text-sm text-coach-red" data-testid="distribute-content-error">
          {error}
        </p>
      ) : null}

      <div className="mb-1.5 font-body text-xs uppercase text-coach-t3">Share with</div>
      <div className="mb-3.5 flex gap-2 rounded-xl bg-coach-card p-1">
        <button
          type="button"
          data-testid="share-recipient-team"
          onClick={function () {
            setMode('team');
            setPlayerId('');
            setFieldErrors({});
          }}
          className={`flex-1 cursor-pointer rounded-xl border-none px-3 py-2.5 font-display text-xs font-semibold uppercase tracking-wider ${
            mode === 'team'
              ? 'bg-coach-orange text-white'
              : 'bg-transparent text-coach-t2'
          }`}
        >
          Team (full roster)
        </button>
        <button
          type="button"
          data-testid="share-recipient-player"
          onClick={function () {
            setMode('player');
            setTeamId('');
            setFieldErrors({});
          }}
          className={`flex-1 cursor-pointer rounded-xl border-none px-3 py-2.5 font-display text-xs font-semibold uppercase tracking-wider ${
            mode === 'player'
              ? 'bg-coach-orange text-white'
              : 'bg-transparent text-coach-t2'
          }`}
        >
          Individual player
        </button>
      </div>

      {mode === 'team' ? (
        <>
          <label className="mb-1.5 block font-body text-xs uppercase text-coach-t3" htmlFor="distribute-team">
            Team (full roster)
          </label>
          <select
            id="distribute-team"
            data-testid="distribute-team-select"
            value={teamId}
            onChange={function (event) {
              setTeamId(event.target.value);
              setFieldErrors((current) => ({ ...current, teamId: undefined }));
            }}
            className={`mb-1 ${fieldClass(Boolean(fieldErrors.teamId))}`}
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
          {fieldErrors.teamId ? (
            <p className="mb-3.5 font-body text-xs text-coach-red">{fieldErrors.teamId}</p>
          ) : (
            <div className="mb-3.5" />
          )}
        </>
      ) : (
        <>
          <label
            className="mb-1.5 block font-body text-xs uppercase text-coach-t3"
            htmlFor="distribute-player"
          >
            Individual player
          </label>
          <select
            id="distribute-player"
            data-testid="distribute-player-select"
            value={playerId}
            onChange={function (event) {
              setPlayerId(event.target.value);
              setFieldErrors((current) => ({ ...current, playerId: undefined }));
            }}
            className={`mb-1 ${fieldClass(Boolean(fieldErrors.playerId))}`}
          >
            <option value="">Select player</option>
            {players.map(function (player) {
              return (
                <option key={player.profileId} value={player.profileId}>
                  {player.displayName ?? player.profileId}
                </option>
              );
            })}
          </select>
          {fieldErrors.playerId ? (
            <p className="mb-3.5 font-body text-xs text-coach-red">{fieldErrors.playerId}</p>
          ) : (
            <div className="mb-3.5" />
          )}
          {players.length === 0 ? (
            <p className="mb-3.5 font-body text-xs text-coach-t3" data-testid="distribute-no-roster">
              No roster players yet. Add the client to a team on Roster first.
            </p>
          ) : null}
        </>
      )}

      <Btn
        primary
        full
        disabled={saving || loading}
        data-testid="distribute-content-submit"
        onClick={handleDistribute}
      >
        {saving ? 'Sharing…' : 'Share content'}
      </Btn>
    </ScreenContainer>
  );
}
