import { useCallback, useEffect, useState } from 'react';
import { useRepositories } from '@coach360/api';
import { computeObjectiveProgress, filterUpcomingSessions } from '@coach360/domain';
import { useAuth } from '@/features/auth/model/use-auth.js';
import { Card, PageHeader, ScreenContainer } from '@/shared/ui/primitives.jsx';

/**
 * STORY-7.3 (resolved, option c) — team-scoped operational view for the team
 * manager role. Deliberately NOT a copy of the player-shaped ProgressScreen:
 * no individual drill completions, skill assessments, or coach feedback —
 * those require the coach role or explicit consent (minors).
 *
 * Scoped to data this repo actually has today: roster size, upcoming
 * sessions, and team objectives. Attendance/RSVP rates and "who hasn't
 * opened the app" engagement signals from the original resolved answer are
 * NOT built here — no attendance/RSVP/last-active tracking exists anywhere
 * in this schema; that's new instrumentation, not a wiring fix. Flagged as
 * a follow-up, not guessed at.
 */
export function TeamProgressScreen({ user, go }) {
  const { session } = useAuth();
  const repos = useRepositories();
  const userId = session?.user.id;

  const [team, setTeam] = useState(null);
  const [rosterCount, setRosterCount] = useState(0);
  const [sessions, setSessions] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTeamProgress = useCallback(
    async function () {
      if (!userId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const teams = await repos.teams.listForUser(userId);
        const activeTeam = teams[0] ?? null;
        setTeam(activeTeam);

        const [members, sessionRows, objectiveRows] = await Promise.all([
          activeTeam ? repos.rosters.listMembers(activeTeam.id) : Promise.resolve([]),
          repos.sessions.listForUser(userId),
          repos.objectives.listForUser(userId, 'team'),
        ]);

        setRosterCount(
          members.filter(function (member) {
            return member.rosterRole === 'player' && member.status === 'active';
          }).length,
        );
        setSessions(sessionRows ?? []);
        setObjectives((objectiveRows ?? []).filter(function (o) {
          return o.scope === 'team';
        }));
      } catch {
        setTeam(null);
        setRosterCount(0);
        setSessions([]);
        setObjectives([]);
      } finally {
        setLoading(false);
      }
    },
    [userId, repos.teams, repos.rosters, repos.sessions, repos.objectives],
  );

  useEffect(
    function () {
      loadTeamProgress();
    },
    [loadTeamProgress],
  );

  const upcoming = filterUpcomingSessions(sessions);

  return (
    <ScreenContainer data-testid="team-progress-screen">
      <PageHeader title="TEAM PROGRESS" user={user} onBack={function () { go('home'); }} />

      {loading ? <p className="font-body text-sm text-coach-t2">Loading team progress…</p> : null}

      {!loading ? (
        <>
          <Card className="mb-3" data-testid="team-progress-roster">
            <div className="mb-1 font-body text-xs uppercase text-coach-t3">Roster</div>
            <div className="font-display text-2xl font-bold text-coach-t1">
              {rosterCount} {rosterCount === 1 ? 'player' : 'players'}
            </div>
            {team ? (
              <div className="mt-1 font-body text-xs text-coach-t3">{team.name}</div>
            ) : null}
          </Card>

          <Card
            className="mb-3"
            onClick={function () { go('schedule'); }}
            data-testid="team-progress-sessions"
          >
            <div className="mb-1 font-body text-xs uppercase text-coach-t3">Upcoming sessions</div>
            <div className="font-display text-2xl font-bold text-coach-t1">{upcoming.length}</div>
          </Card>

          <div className="mb-2.5 font-display text-sm font-semibold uppercase text-coach-t1">
            Team objectives
          </div>
          {objectives.length > 0 ? (
            objectives.map(function (objective) {
              const pct = computeObjectiveProgress(
                objective.currentCompletions,
                objective.targetCompletions,
              );
              return (
                <Card key={objective.id} className="mb-2.5" data-testid="team-progress-objective">
                  <div className="mb-2 flex justify-between">
                    <span className="font-body text-[13px] text-coach-t1">{objective.title}</span>
                    <span className="font-mono text-[13px] text-coach-orange">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-sm bg-coach-border">
                    <div
                      className="h-full rounded-sm bg-coach-orange"
                      style={{ width: pct + '%' }}
                    />
                  </div>
                </Card>
              );
            })
          ) : (
            <Card
              className="p-6 text-center"
              onClick={function () { go('objectives'); }}
              data-testid="team-progress-objectives-empty"
            >
              <p className="font-body text-sm text-coach-t2">No team objectives set yet.</p>
            </Card>
          )}
        </>
      ) : null}
    </ScreenContainer>
  );
}
