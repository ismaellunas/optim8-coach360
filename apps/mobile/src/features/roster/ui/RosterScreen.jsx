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

const MOCK_PLAYERS = [
  { n: 'Jaylen Carter', tm: 'U14 Eagles', pos: 'PG', g: '3/4' },
  { n: 'Marcus Johnson', tm: 'U16 Hawks', pos: 'SF', g: '2/5' },
  { n: 'Deon Williams', tm: 'U14 Eagles', pos: 'SG', g: '3/3' },
];

export function RosterScreen({ user, tryA }) {
  const { session } = useAuth();
  const repos = useRepositories();
  const userId = session?.user.id;
  const canManageAgeRange = session?.user.role === 'team_manager';

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
      try {
        const nextTeams = await repos.teams.listForUser(userId);
        setTeams(nextTeams);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'team_load_failed');
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
        <Card className="p-6 text-center">
          <div className="font-display text-[32px] font-bold tracking-[4px] text-coach-orange">
            EGL-2026
          </div>
          <div className="mt-2 font-body text-xs text-coach-t3">Share this code with players</div>
        </Card>
        <Btn primary full>
          Copy Invite Link
        </Btn>
        <div className="h-4" />
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
        {['teams', 'players'].map(function (t) {
          return (
            <button
              key={t}
              type="button"
              onClick={function () { setTab(t); }}
              className={`flex-1 cursor-pointer rounded-[10px] border-none py-2.5 font-display text-[13px] font-semibold uppercase ${tab === t ? 'bg-coach-orange text-white' : 'bg-transparent text-coach-t3'}`}
            >
              {t}
            </button>
          );
        })}
      </div>
      {tab === 'teams' ? (
        <div>
          {loading ? (
            <p className="font-body text-sm text-coach-t2">Loading teams…</p>
          ) : null}
          {!loading && error && teams.length === 0 ? (
            <p className="mb-3 font-body text-sm text-coach-red">{error}</p>
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
                  ) : null}
                  <div className="flex-1">
                    <div className="font-display text-lg font-bold text-coach-t1">{team.name}</div>
                    <div className="mt-1 font-body text-xs text-coach-t3">
                      {formatTeamProfileSummary(team)}
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
          {user?.role !== 'team_manager' ? (
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
        MOCK_PLAYERS.map(function (p, i) {
          return (
            <Card key={i} className="flex items-center gap-3.5">
              <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-gradient-to-br from-coach-orange to-coach-orange-light font-display text-[15px] font-bold text-white">
                {p.n
                  .split(' ')
                  .map(function (x) { return x[0]; })
                  .join('')}
              </div>
              <div className="flex-1">
                <div className="font-body text-sm font-semibold text-coach-t1">{p.n}</div>
                <div className="font-body text-xs text-coach-t3">
                  {p.tm + ' - ' + p.pos}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm font-semibold text-coach-yellow">{p.g}</div>
                <div className="font-body text-[10px] text-coach-t3">Goals</div>
              </div>
            </Card>
          );
        })
      )}
      <div className="h-[100px]" />
    </div>
  );
}
