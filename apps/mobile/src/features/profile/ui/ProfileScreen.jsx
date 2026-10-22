import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRepositories } from '@coach360/api';
import {
  featureAccessLevel,
  playerProgressFeaturesForAccess,
  summarizePlayerProgress,
} from '@coach360/domain';
import { useAuth } from '@/features/auth/model/use-auth.js';
import {
  Button,
  Card,
  Field,
  PageHeader,
  ScreenContainer,
} from '@/shared/ui/primitives.jsx';

export function ProfileScreen({ user, go, onSignOut }) {
  const { session } = useAuth();
  const repos = useRepositories();
  const playerId = session?.user.id;
  const userId = playerId;
  const isPlayer = user?.role === 'player';
  const isCoach = user?.role === 'coach';
  const isTeamManager = user?.role === 'team_manager';
  const [completions, setCompletions] = useState([]);
  const [loadingProgress, setLoadingProgress] = useState(false);

  const [profile, setProfile] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editAge, setEditAge] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editBio, setEditBio] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState(null);

  const loadProfile = useCallback(
    async function () {
      if (!userId) {
        setProfile(null);
        return;
      }
      try {
        const row = await repos.profiles.getById(userId);
        setProfile(row);
        setEditAge(row?.age != null ? String(row.age) : '');
        setEditPosition(row?.position ?? '');
        setEditBio(row?.bio ?? '');
      } catch {
        setProfile(null);
      }
    },
    [repos.profiles, userId],
  );

  useEffect(
    function () {
      loadProfile();
    },
    [loadProfile],
  );

  async function handleSaveProfile(event) {
    event.preventDefault();
    if (!userId) return;
    setSavingProfile(true);
    setProfileError(null);
    try {
      if (isPlayer) {
        const age = Number.parseInt(editAge, 10);
        if (!Number.isFinite(age) || !editPosition.trim()) {
          setProfileError('Enter a valid age and position.');
          return;
        }
        const updated = await repos.profiles.updatePlayerProfile(userId, {
          age,
          position: editPosition.trim(),
          avatarUrl: profile?.avatarUrl ?? null,
        });
        setProfile(updated);
      } else if (isCoach) {
        const updated = await repos.profiles.updateCoachProfile(userId, {
          coachContext: profile?.coachContext ?? 'independent',
          bio: editBio.trim(),
        });
        setProfile(updated);
      } else if (isTeamManager) {
        const updated = await repos.profiles.updateTeamManagerProfile(userId, {
          bio: editBio.trim(),
        });
        setProfile(updated);
      }
      setEditingProfile(false);
    } catch (cause) {
      setProfileError(cause instanceof Error ? cause.message : 'profile_save_failed');
    } finally {
      setSavingProfile(false);
    }
  }

  const accessLevel = user
    ? featureAccessLevel(user.role, user.tier, 'viewProgress')
    : 'none';
  const features = playerProgressFeaturesForAccess(accessLevel);

  const loadProgress = useCallback(
    async function () {
      if (!isPlayer || !playerId || accessLevel === 'none') {
        setCompletions([]);
        return;
      }

      setLoadingProgress(true);
      try {
        const rows = await repos.sessionContent.listPlayerProgress(playerId);
        setCompletions(rows);
      } catch {
        setCompletions([]);
      } finally {
        setLoadingProgress(false);
      }
    },
    [accessLevel, isPlayer, playerId, repos.sessionContent],
  );

  useEffect(
    function () {
      loadProgress();
    },
    [loadProgress],
  );

  const summary = useMemo(
    function () {
      return summarizePlayerProgress(completions);
    },
    [completions],
  );

  return (
    <ScreenContainer>
      <PageHeader title="PROFILE" onBack={function () { go('home'); }} />
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gradient-to-br from-coach-orange to-coach-orange-light font-display text-[28px] font-bold text-white">
          {user.name[0]}
        </div>
        <div className="font-display text-[22px] font-bold text-coach-t1">{user.name}</div>
        <div className="font-body text-[13px] capitalize text-coach-t3">
          {user.role + ' - ' + user.tier + ' tier'}
        </div>
        {user.email && <div className="mt-1 font-body text-xs text-coach-t3">{user.email}</div>}
      </div>

      {isPlayer && features.canViewCompletionCount ? (
        <Card className="mb-3" data-testid="profile-progress-summary">
          <div className="mb-1 font-body text-xs uppercase text-coach-t3">Training progress</div>
          {loadingProgress ? (
            <p className="font-body text-sm text-coach-t2">Loading…</p>
          ) : (
            <>
              <div className="flex items-baseline justify-between">
                <span className="font-display text-2xl font-bold text-coach-t1">
                  {summary.drillsCompleted} drills
                </span>
                {features.canViewSessionPercent ? (
                  <span className="font-mono text-sm text-coach-orange" data-testid="profile-items-completed">
                    {summary.itemsCompleted} items
                  </span>
                ) : null}
              </div>
              {accessLevel === 'readonly' ? (
                <p className="mt-2 font-body text-xs text-coach-t3">
                  Basic tier — upgrade to Pro for full stats and coach feedback.
                </p>
              ) : null}
            </>
          )}
        </Card>
      ) : null}

      <Card onClick={function () { go('subscription'); }}>
        <span className="font-body text-sm text-coach-t1">Manage Subscription</span>
      </Card>

      {editingProfile ? (
        <Card data-testid="profile-edit-form">
          <form onSubmit={handleSaveProfile}>
            {isPlayer ? (
              <>
                <Field
                  label="Age"
                  id="profile-edit-age"
                  type="number"
                  value={editAge}
                  onChange={function (event) { setEditAge(event.target.value); }}
                />
                <Field
                  label="Position"
                  id="profile-edit-position"
                  value={editPosition}
                  onChange={function (event) { setEditPosition(event.target.value); }}
                />
              </>
            ) : (
              <Field
                label="Bio"
                id="profile-edit-bio"
                value={editBio}
                onChange={function (event) { setEditBio(event.target.value); }}
              />
            )}
            {profileError ? <p className="mb-3 font-body text-sm text-coach-red">{profileError}</p> : null}
            <div className="flex gap-2.5">
              <Button
                small
                type="button"
                onClick={function () { setEditingProfile(false); setProfileError(null); }}
              >
                Cancel
              </Button>
              <Button small primary type="submit" disabled={savingProfile}>
                {savingProfile ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Card onClick={function () { setEditingProfile(true); }} data-testid="profile-edit-trigger">
          <span className="font-body text-sm text-coach-t1">Edit Profile</span>
        </Card>
      )}

      <Card className="flex items-center justify-between" data-testid="profile-notifications">
        <span className="font-body text-sm text-coach-t2">Notifications</span>
        <span className="font-body text-[11px] uppercase text-coach-t3">Coming soon</span>
      </Card>

      <Card onClick={onSignOut}>
        <span className="font-body text-sm text-coach-red">Sign Out</span>
      </Card>
    </ScreenContainer>
  );
}
