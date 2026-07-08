import { useCallback, useEffect, useState } from 'react';
import { useRepositories } from '@coach360/api';
import { formatTeamProfileSummary } from '@coach360/domain';
import { useAuth } from '@/features/auth/model/use-auth.js';
import { Card } from '@/shared/ui/primitives.jsx';

export function PlayerTeamContext({ onJoinTeam }) {
  const { session } = useAuth();
  const repos = useRepositories();
  const userId = session?.user.id;

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadTeams = useCallback(
    async function () {
      if (!userId) {
        setTeams([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const memberTeams = await repos.rosters.listMemberTeams(userId);
        setTeams(memberTeams);
      } catch (cause) {
        setTeams([]);
        setError(cause instanceof Error ? cause.message : 'team_load_failed');
      } finally {
        setLoading(false);
      }
    },
    [repos.rosters, userId],
  );

  useEffect(function () {
    loadTeams();
  }, [loadTeams]);

  if (loading) {
    return (
      <Card className="p-4">
        <p className="font-body text-sm text-coach-t2">Loading your teams…</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4">
        <p className="font-body text-sm text-coach-red">{error}</p>
      </Card>
    );
  }

  if (teams.length === 0) {
    return (
      <Card className="p-4">
        <p className="font-display text-sm font-semibold uppercase tracking-wider text-coach-t1">
          Your teams
        </p>
        <p className="mt-2 font-body text-sm text-coach-t2">
          You are not on a team roster yet. Join with an invite code from your coach.
        </p>
        {onJoinTeam ? (
          <button
            type="button"
            onClick={onJoinTeam}
            className="mt-3 cursor-pointer border-none bg-transparent p-0 font-body text-sm font-semibold text-coach-orange"
          >
            Enter invite code
          </button>
        ) : null}
      </Card>
    );
  }

  return (
    <div className="py-2">
      <p className="mb-2 font-display text-[13px] font-semibold uppercase tracking-widest text-coach-t3">
        Your teams
      </p>
      {teams.map(function (team) {
        return (
          <Card key={team.id} className="mb-2.5 p-4">
            <div className="font-display text-lg font-bold text-coach-t1">{team.name}</div>
            <div className="mt-1 font-body text-xs text-coach-t3">
              {formatTeamProfileSummary(team) || 'Team roster member'}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
