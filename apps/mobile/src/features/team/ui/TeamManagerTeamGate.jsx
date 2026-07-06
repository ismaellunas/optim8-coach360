import { useCallback, useEffect, useState } from 'react';
import { useRepositories } from '@coach360/api';
import { needsTeamManagerTeamSetup } from '@coach360/domain';
import { useAuth } from '@/features/auth/model/use-auth.js';
import { TeamProfileForm } from './TeamProfileForm.jsx';

export function TeamManagerTeamGate({ children }) {
  const { session } = useAuth();
  const repos = useRepositories();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const userId = session?.user.id;
  const isTeamManager = session?.user.role === 'team_manager';

  const loadTeams = useCallback(
    async function () {
      if (!userId || !isTeamManager) {
        setTeams([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const nextTeams = await repos.teams.listForUser(userId);
        setTeams(nextTeams);
      } catch (cause) {
        setTeams([]);
        setError(cause instanceof Error ? cause.message : 'team_load_failed');
      } finally {
        setLoading(false);
      }
    },
    [isTeamManager, repos.teams, userId],
  );

  useEffect(function () {
    loadTeams();
  }, [loadTeams]);

  async function handleCreateTeam(input, logoFile) {
    if (!userId) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await repos.teams.createTeam(userId, input, logoFile);
      await loadTeams();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'team_create_failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isTeamManager) {
    return children;
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6 text-coach-t2">
        Loading team setup…
      </div>
    );
  }

  if (error && needsTeamManagerTeamSetup(teams)) {
    return (
      <div className="px-6 py-10 text-center">
        <p className="mb-4 font-body text-sm text-coach-red">{error}</p>
        <button
          type="button"
          onClick={loadTeams}
          className="cursor-pointer rounded-xl border-none bg-coach-orange-glow px-5 py-3 font-display text-sm font-semibold uppercase tracking-wider text-coach-orange"
        >
          Retry
        </button>
      </div>
    );
  }

  if (needsTeamManagerTeamSetup(teams)) {
    return (
      <TeamProfileForm
        mode="create"
        canManageAgeRange
        submitting={submitting}
        error={error}
        onSubmit={handleCreateTeam}
      />
    );
  }

  return children;
}
