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

const POSITIONS = ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function roleLabel(role) {
  if (role === 'team' || role === 'team_manager') return 'Team manager';
  if (role === 'player') return 'Player';
  if (role === 'coach') return 'Coach';
  if (role === 'admin') return 'Admin';
  return 'Member';
}

function appRoleFromUser(sessionRole, legacyRole) {
  if (sessionRole) return sessionRole;
  if (legacyRole === 'team') return 'team_manager';
  return legacyRole ?? null;
}

export function ProfileScreen({ user, go, onSignOut }) {
  const { session, refreshSession } = useAuth();
  const repos = useRepositories();
  const playerId = session?.user.id;
  const userId = playerId;
  const appRole = appRoleFromUser(session?.user.role, user?.role);
  const isPlayer = appRole === 'player';
  const isCoach = appRole === 'coach';
  const isTeamManager = appRole === 'team_manager';
  const [completions, setCompletions] = useState([]);
  const [loadingProgress, setLoadingProgress] = useState(false);

  const [profile, setProfile] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editCoachContext, setEditCoachContext] = useState('independent');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
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

  useEffect(
    function () {
      return function () {
        if (photoPreview && photoPreview.startsWith('blob:')) {
          URL.revokeObjectURL(photoPreview);
        }
      };
    },
    [photoPreview],
  );

  function clearPhotoSelection() {
    setPhotoPreview(function (current) {
      if (current && current.startsWith('blob:')) URL.revokeObjectURL(current);
      return null;
    });
    setPhotoFile(null);
  }

  function openEditor() {
    setEditName(profile?.displayName || user?.name || '');
    setEditBio(profile?.bio || '');
    setEditAge(profile?.age != null ? String(profile.age) : '');
    setEditPosition(profile?.position || '');
    setEditCoachContext(profile?.coachContext === 'team' ? 'team' : 'independent');
    clearPhotoSelection();
    setProfileError(null);
    setEditingProfile(true);
  }

  function cancelEditor() {
    clearPhotoSelection();
    setProfileError(null);
    setEditingProfile(false);
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProfileError('Choose an image file.');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setProfileError('Photo must be 5 MB or smaller.');
      return;
    }
    setProfileError(null);
    setPhotoFile(file);
    setPhotoPreview(function (current) {
      if (current && current.startsWith('blob:')) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  }

  async function handleSaveProfile(event) {
    event.preventDefault();
    if (!userId) return;

    const displayName = editName.trim();
    const bio = editBio.trim();
    if (!displayName) {
      setProfileError('Enter your name.');
      return;
    }

    const age = Number.parseInt(editAge, 10);
    if (isPlayer && (!Number.isFinite(age) || age < 5 || age > 99 || !editPosition.trim())) {
      setProfileError('Enter a valid age (5–99) and position.');
      return;
    }

    setSavingProfile(true);
    setProfileError(null);
    try {
      let avatarUrl = profile?.avatarUrl ?? null;
      if (photoFile) {
        avatarUrl = await repos.profiles.uploadAvatar(userId, photoFile, photoFile.name);
      }

      let updated;
      if (isPlayer) {
        updated = await repos.profiles.updatePlayerProfile(userId, {
          age,
          position: editPosition.trim(),
          avatarUrl,
          bio,
          displayName,
        });
      } else if (isCoach) {
        updated = await repos.profiles.updateCoachProfile(userId, {
          coachContext: editCoachContext === 'team' ? 'team' : 'independent',
          bio,
          displayName,
          avatarUrl,
        });
      } else if (isTeamManager) {
        updated = await repos.profiles.updateTeamManagerProfile(userId, {
          bio,
          displayName,
          avatarUrl,
        });
      } else {
        updated = await repos.profiles.updateSelfProfile(userId, {
          displayName,
          bio,
          avatarUrl,
        });
      }

      setProfile(updated);
      clearPhotoSelection();
      setEditingProfile(false);
      try {
        await refreshSession();
      } catch {
        // Profile row is already saved. This screen reads the updated profile.
      }
    } catch (cause) {
      setProfileError(cause instanceof Error ? cause.message : 'Could not save your profile.');
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

  const shownName = (profile?.displayName || user?.name || '').trim() || 'Member';
  const shownAvatar = photoPreview || profile?.avatarUrl || null;
  const initial = shownName[0] || '?';

  return (
    <ScreenContainer>
      <PageHeader title="PROFILE" onBack={function () { go('home'); }} />
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-coach-orange to-coach-orange-light font-display text-[28px] font-bold text-white">
          {shownAvatar ? (
            <img src={shownAvatar} alt="" className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </div>
        <div className="font-display text-[22px] font-bold text-coach-t1">{shownName}</div>
        <div className="font-body text-[13px] text-coach-t3">
          {roleLabel(user?.role) + ' · ' + (user?.tier || 'basic') + ' tier'}
        </div>
        {user?.email ? <div className="mt-1 font-body text-xs text-coach-t3">{user.email}</div> : null}
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

      {isCoach ? (
        <Card onClick={function () { go('coach-library'); }} data-testid="profile-my-library">
          <span className="font-body text-sm text-coach-t1">My Library</span>
        </Card>
      ) : null}

      <Card onClick={function () { go('subscription'); }}>
        <span className="font-body text-sm text-coach-t1">Manage Subscription</span>
      </Card>

      {!editingProfile && profile ? (
        <Card data-testid="profile-details">
          <div className="mb-1 font-body text-xs uppercase text-coach-t3">About</div>
          <p className="font-body text-sm text-coach-t1">
            {profile.bio?.trim() ? profile.bio : 'No bio yet.'}
          </p>
          {isPlayer ? (
            <p className="mt-2 font-body text-xs text-coach-t3">
              {(profile.age != null ? 'Age ' + profile.age : 'Age not set')
                + ' · '
                + (profile.position || 'Position not set')}
            </p>
          ) : null}
          {isCoach ? (
            <p className="mt-2 font-body text-xs text-coach-t3">
              {profile.coachContext === 'team' ? 'Team coach' : 'Independent coach'}
            </p>
          ) : null}
        </Card>
      ) : null}

      {editingProfile ? (
        <Card data-testid="profile-edit-form">
          <form onSubmit={handleSaveProfile}>
            <div className="mb-3.5">
              <div className="mb-1.5 font-body text-xs uppercase text-coach-t3">Photo</div>
              <label className="block cursor-pointer rounded-[14px] border-2 border-dashed border-coach-border bg-coach-card p-4 text-center">
                <input
                  id="profile-edit-photo"
                  data-testid="profile-edit-photo"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handlePhotoChange}
                />
                <div className="font-body text-[13px] text-coach-t3">
                  {photoFile
                    ? photoFile.name
                    : shownAvatar
                      ? 'Tap to replace your photo'
                      : 'Tap to upload a photo'}
                </div>
              </label>
            </div>
            <Field
              label="Name"
              id="profile-edit-name"
              value={editName}
              maxLength={120}
              onChange={function (event) { setEditName(event.target.value); }}
            />
            <Field
              label="Email"
              id="profile-edit-email"
              value={user?.email || ''}
              readOnly
              hint="Email cannot be changed."
            />
            <Field
              label="Bio"
              id="profile-edit-bio"
              multiline
              value={editBio}
              maxLength={500}
              onChange={function (event) { setEditBio(event.target.value); }}
              placeholder="A short bio"
            />
            {isPlayer ? (
              <>
                <Field
                  label="Age"
                  id="profile-edit-age"
                  type="number"
                  min={5}
                  max={99}
                  value={editAge}
                  onChange={function (event) { setEditAge(event.target.value); }}
                />
                <Field
                  label="Position"
                  id="profile-edit-position"
                  value={editPosition}
                  maxLength={80}
                  list="profile-edit-positions"
                  onChange={function (event) { setEditPosition(event.target.value); }}
                />
                <datalist id="profile-edit-positions">
                  {POSITIONS.map(function (position) {
                    return <option key={position} value={position} />;
                  })}
                </datalist>
              </>
            ) : null}
            {isCoach ? (
              <div className="mb-3.5">
                <label
                  htmlFor="profile-edit-coach-context"
                  className="mb-1.5 block font-body text-xs uppercase text-coach-t3"
                >
                  Coaching setup
                </label>
                <select
                  id="profile-edit-coach-context"
                  value={editCoachContext}
                  onChange={function (event) { setEditCoachContext(event.target.value); }}
                  className="box-border w-full rounded-xl border border-coach-border bg-coach-card px-4 py-3.5 font-body text-base text-coach-t1 outline-none"
                >
                  <option value="independent">Independent coach</option>
                  <option value="team">Team coach</option>
                </select>
              </div>
            ) : null}
            {profileError ? <p className="mb-3 font-body text-sm text-coach-red">{profileError}</p> : null}
            <div className="flex gap-2.5">
              <Button small type="button" onClick={cancelEditor}>
                Cancel
              </Button>
              <Button small primary type="submit" disabled={savingProfile}>
                {savingProfile ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Card onClick={openEditor} data-testid="profile-edit-trigger">
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
