import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRepositories } from '@coach360/api';
import {
  featureAccessLevel,
  playerProgressFeaturesForAccess,
  summarizePlayerProgress,
} from '@coach360/domain';
import { useAuth } from '@/features/auth/model/use-auth.js';
import {
  Card,
  PageHeader,
  ScreenContainer,
} from '@/shared/ui/primitives.jsx';

export function ProfileScreen({ user, go, onSignOut }) {
  const { session } = useAuth();
  const repos = useRepositories();
  const playerId = session?.user.id;
  const isPlayer = user?.role === 'player';
  const [completions, setCompletions] = useState([]);
  const [loadingProgress, setLoadingProgress] = useState(false);

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
      <Card>
        <span className="font-body text-sm text-coach-t1">Edit Profile</span>
      </Card>
      <Card>
        <span className="font-body text-sm text-coach-t1">Notifications</span>
      </Card>
      <Card onClick={onSignOut}>
        <span className="font-body text-sm text-coach-red">Sign Out</span>
      </Card>
    </ScreenContainer>
  );
}
