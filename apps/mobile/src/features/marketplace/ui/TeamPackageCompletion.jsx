import { useEffect, useState } from 'react';
import { useRepositories } from '@coach360/api';
import { Card } from '@/shared/ui/primitives.jsx';

/**
 * STORY-10.3 AC-4 — per-player completion for a coach's team purchase,
 * backed by list_team_purchase_completions (buyer-only RPC).
 */
export function TeamPackageCompletion({ purchaseId }) {
  const repos = useRepositories();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!purchaseId) {
      setPlayers([]);
      setLoading(false);
      return undefined;
    }
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await repos.marketplaceDrip.listTeamPurchaseCompletions(purchaseId);
        if (!cancelled) setPlayers(rows || []);
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'team_completions_load_failed');
          setPlayers([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [purchaseId, repos.marketplaceDrip]);

  return (
    <div className="mt-5" data-testid="team-package-completion">
      <div className="mb-2 font-display text-xs font-semibold uppercase tracking-wider text-coach-t3">
        Team completion
      </div>
      {loading ? (
        <div className="font-body text-sm text-coach-t3">Loading team progress…</div>
      ) : error ? (
        <div className="font-body text-xs text-coach-red">{error}</div>
      ) : players.length === 0 ? (
        <div className="font-body text-sm text-coach-t3">No team progress yet.</div>
      ) : (
        players.map((player) => (
          <Card
            key={player.profileId}
            className="flex items-center gap-3"
            data-testid="team-completion-row"
          >
            <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-coach-orange-glow font-display text-[13px] font-bold text-coach-orange">
              {(player.displayName || '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-body text-[13px] font-semibold text-coach-t1">
                {player.displayName || 'Player'}
              </div>
              <div className="mt-1.5 h-1.5 rounded-sm bg-coach-border">
                <div
                  className="h-full rounded-sm"
                  style={{
                    width: `${player.completionPercent}%`,
                    backgroundColor: player.completionPercent === 100 ? '#22C55E' : '#FF6B35',
                  }}
                />
              </div>
            </div>
            <span className="shrink-0 font-mono text-xs text-coach-t2">
              {player.completedModules}/{player.totalModules}
            </span>
          </Card>
        ))
      )}
    </div>
  );
}
