import { useCallback, useEffect, useState } from 'react';
import { useRepositories } from '@coach360/api';
import { formatTeamProfileSummary } from '@coach360/domain';
import { useAuth } from '@/features/auth/model/use-auth.js';
import { TeamProfileForm } from '@/features/team/ui/TeamProfileForm.jsx';
import {
  Button as Btn,
  Card,
  DashedBtn,
  PageHeader,
  ScreenContainer,
} from '@/shared/ui/primitives.jsx';

const TEAM_ACCENTS = ['#FF6B2C', '#60A5FA', '#34D399'];

function EmptyState({ title, description }) {
  return (
    <Card className="p-6 text-center">
      <p className="font-display text-base font-semibold text-coach-t1">{title}</p>
      <p className="mt-2 font-body text-sm leading-relaxed text-coach-t2">{description}</p>
    </Card>
  );
}

export function RosterScreen({ user, tryA }) {
  const { session } = useAuth();
  const repos = useRepositories();
  const userId = session?.user.id;
  const canManageAgeRange = session?.user.role === 'team_manager';
  const isCoach = user?.role === 'coach';

  const [tab, setTab] = useState('teams');
  const [sub, setSub] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
        const nextTeams = await repos.teams.listForUser(userId);
        setTeams(nextTeams);
      } catch (cause) {
        setTeams([]);
        setError(cause instanceof Error ? cause.message : 'We could not load your teams.');
      } finally {
        setLoading(false);
      }
    },
    [repos.teams, userId],
  );

  useEffect(function () {
    loadTeams();
  }, [loadTeams]);

  const editingTeam =
    sub?.type === 'edit' ? teams.find((team) => team.id === sub.teamId) ?? null : null;

  async function handleCreateTeam(input, logoFile) {
    if (!userId) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await repos.teams.createTeam(userId, input, logoFile);
      await loadTeams();
      setSub(null);
      setTab('teams');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'team_create_failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateTeam(input, logoFile) {
    if (!userId || !editingTeam) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await repos.teams.updateTeam(editingTeam.id, userId, input, logoFile);
      await loadTeams();
      setSub(null);
      setTab('teams');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'team_update_failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (sub?.type === 'create') {
    return (
      <ScreenContainer className="pb-6">
        <PageHeader title="CREATE TEAM" onBack={function () { setSub(null); setError(null); }} />
        <TeamProfileForm
          mode="create"
          canManageAgeRange={canManageAgeRange}
          submitting={submitting}
          error={error}
          onSubmit={handleCreateTeam}
          onCancel={function () {
            setSub(null);
            setError(null);
          }}
        />
      </ScreenContainer>
    );
  }

  if (sub?.type === 'edit' && editingTeam) {
    return (
      <ScreenContainer className="pb-6">
        <PageHeader title="EDIT TEAM" onBack={function () { setSub(null); setError(null); }} />
        <TeamProfileForm
          mode="edit"
          initialTeam={editingTeam}
          canManageAgeRange={canManageAgeRange}
          submitting={submitting}
          error={error}
          onSubmit={handleUpdateTeam}
          onCancel={function () {
            setSub(null);
            setError(null);
          }}
        />
      </ScreenContainer>
    );
  }

  if (sub === 'invite') {
    return (
      <ScreenContainer>
        <PageHeader title="INVITE PLAYERS" onBack={function () { setSub(null); }} />
        <EmptyState
          title="Player invites coming soon"
          description="Invite links and roster joins will arrive in a future update. For now, manage your team profile from the Teams tab."
        />
        <Btn full onClick={function () { setSub(null); }}>
          Back to roster
        </Btn>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <PageHeader
        title="ROSTER"
        trailing={user ? <span className="font-body text-xs text-coach-t3">{user.name}</span> : null}
      />
      <div className="mb-4 flex rounded-xl bg-coach-card p-1">
        {[
          { id: 'teams', label: 'Teams' },
          { id: 'players', label: 'Players' },
        ].map(function (item) {
          return (
            <button
              key={item.id}
              type="button"
              onClick={function () { setTab(item.id); }}
              className={`flex-1 cursor-pointer rounded-[10px] border-none py-2.5 font-display text-[13px] font-semibold uppercase ${tab === item.id ? 'bg-coach-orange text-white' : 'bg-transparent text-coach-t3'}`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {tab === 'teams' ? (
        <div>
          {loading ? (
            <p className="font-body text-sm text-coach-t2">Loading teams…</p>
          ) : null}
          {!loading && error ? (
            <p className="mb-3 font-body text-sm text-coach-red">{error}</p>
          ) : null}
          {!loading && teams.length === 0 && !error ? (
            <EmptyState
              title="No teams yet"
              description={
                isCoach
                  ? 'Create a team to organize players, season dates, and your logo. This is optional — you can also work with individual players.'
                  : 'Your teams will appear here once they are created.'
              }
            />
          ) : null}
          {teams.map(function (team, index) {
            const accent = TEAM_ACCENTS[index % TEAM_ACCENTS.length];
            return (
              <Card key={team.id} className="border-l-[3px]" style={{ borderLeftColor: accent }}>
                <div className="flex items-start gap-3">
                  {team.logoUrl ? (
                    <img
                      src={team.logoUrl}
                      alt=""
                      className="h-10 w-10 rounded-full border border-coach-border object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-coach-border bg-coach-surface font-display text-sm font-bold text-coach-t3">
                      {team.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-display text-lg font-bold text-coach-t1">{team.name}</div>
                    <div className="mt-1 font-body text-xs text-coach-t3">
                      {formatTeamProfileSummary(team) || 'Team profile'}
                    </div>
                  </div>
                </div>
                <div className="mt-2.5 flex gap-2">
                  <Btn
                    small
                    onClick={function () {
                      tryA('invitePlayers', function () { setSub('invite'); });
                    }}
                  >
                    Invite
                  </Btn>
                  <Btn
                    small
                    onClick={function () {
                      tryA('teamManage', function () {
                        setSub({ type: 'edit', teamId: team.id });
                        setError(null);
                      });
                    }}
                  >
                    Manage
                  </Btn>
                </div>
              </Card>
            );
          })}
          {isCoach ? (
            <DashedBtn
              onClick={function () {
                tryA('teamManage', function () {
                  setSub({ type: 'create' });
                  setError(null);
                });
              }}
            >
              + Create Team
            </DashedBtn>
          ) : null}
        </div>
      ) : (
        <EmptyState
          title="No players on your roster yet"
          description="Player roster management and invites are not available in this release. Create a team first, then check back after player invite support ships."
        />
      )}
    </ScreenContainer>
  );
}
