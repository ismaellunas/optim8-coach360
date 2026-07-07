import { useCallback, useEffect, useState } from 'react';
import { useRepositories } from '@coach360/api';
import { formatTeamProfileSummary } from '@coach360/domain';
import { useAuth } from '@/features/auth/model/use-auth.js';
import { TeamProfileForm } from '@/features/team/ui/TeamProfileForm.jsx';

const TEAM_ACCENTS = ['#FF6B2C', '#60A5FA', '#34D399'];

function IconBack() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function Btn({ children, primary, small, disabled, onClick, full }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      className={[
        'rounded-xl border-none font-display font-semibold uppercase tracking-wider',
        small ? 'px-3.5 py-2 text-xs' : 'px-5 py-3 text-sm',
        full ? 'w-full' : '',
        disabled
          ? 'cursor-default bg-coach-border text-coach-t3 opacity-50'
          : 'cursor-pointer',
        !disabled && primary ? 'bg-coach-orange text-white' : '',
        !disabled && !primary ? 'bg-coach-orange-glow text-coach-orange' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  );
}

function Card({ children, className = '', style }) {
  return (
    <div
      className={`mb-2.5 rounded-[14px] border border-coach-border bg-coach-card p-4 ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

function DashedBtn({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full cursor-pointer rounded-xl border-2 border-dashed border-coach-border bg-transparent px-3.5 py-3.5 font-display text-[13px] font-semibold uppercase text-coach-t3"
    >
      {children}
    </button>
  );
}

function PageHeader({ title, user, onBack }) {
  return (
    <div className="flex items-center justify-between pb-2 pt-4">
      <div className="flex items-center gap-2.5">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="cursor-pointer border-none bg-transparent text-coach-orange"
          >
            <IconBack />
          </button>
        ) : null}
        <div className="font-display text-2xl font-bold tracking-wide text-coach-t1">{title}</div>
      </div>
      {user ? (
        <div className="font-body text-xs text-coach-t3">{user.name}</div>
      ) : null}
    </div>
  );
}

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
      <div>
        <div className="px-5">
          <PageHeader title="CREATE TEAM" onBack={function () { setSub(null); setError(null); }} />
        </div>
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
      </div>
    );
  }

  if (sub?.type === 'edit' && editingTeam) {
    return (
      <div>
        <div className="px-5">
          <PageHeader title="EDIT TEAM" onBack={function () { setSub(null); setError(null); }} />
        </div>
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
      </div>
    );
  }

  if (sub === 'invite') {
    return (
      <div className="px-5">
        <PageHeader title="INVITE PLAYERS" onBack={function () { setSub(null); }} />
        <EmptyState
          title="Player invites coming soon"
          description="Invite links and roster joins will arrive in a future update. For now, manage your team profile from the Teams tab."
        />
        <Btn full onClick={function () { setSub(null); }}>
          Back to roster
        </Btn>
        <div className="h-[100px]" />
      </div>
    );
  }

  return (
    <div className="px-5">
      <PageHeader title="ROSTER" user={user} />
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
      <div className="h-[100px]" />
    </div>
  );
}
