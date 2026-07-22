import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRepositories } from '@coach360/api';
import {
  canSharePeerKnowledge,
  featureAccessLevel,
  playerProgressFeaturesForAccess,
  summarizePlayerProgress,
} from '@coach360/domain';
import { useAuth } from '@/features/auth/model/use-auth.js';
import { PeerShareSheet } from '@/features/chat/ui/PeerShareSheet.jsx';
import {
  Button as Btn,
  Card,
  PageHeader,
  ScreenContainer,
} from '@/shared/ui/primitives.jsx';

function IconLock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

function PeerShareActions({ tryA, onShareAchievement, onShareInsight }) {
  return (
    <Card className="mb-4" data-testid="peer-share-actions">
      <div className="mb-2 font-body text-[13px] font-semibold text-coach-t1">Share with teammates</div>
      <div className="font-body text-xs text-coach-t2">
        Post achievements and tips to your team chat (Advanced+).
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <Btn
          primary
          full
          onClick={function () {
            tryA('peerShare', onShareAchievement);
          }}
        >
          <span data-testid="progress-share-achievement">Share achievement</span>
        </Btn>
        <Btn
          full
          onClick={function () {
            tryA('peerShare', onShareInsight);
          }}
        >
          <span data-testid="progress-share-insight">Share tip</span>
        </Btn>
      </div>
    </Card>
  );
}

export function ProgressScreen({ user, tryA }) {
  const { session } = useAuth();
  const repos = useRepositories();
  const playerId = session?.user.id;
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareMode, setShareMode] = useState(null);

  const accessLevel = user
    ? featureAccessLevel(user.role, user.tier, 'viewProgress')
    : 'none';
  const features = playerProgressFeaturesForAccess(accessLevel);
  const peerShareAllowed = user
    ? canSharePeerKnowledge(user.role, user.tier)
    : false;

  const loadProgress = useCallback(
    async function () {
      if (!playerId || accessLevel === 'none') {
        setCompletions([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const rows = await repos.sessionContent.listPlayerProgress(playerId);
        setCompletions(rows);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'player_progress_load_failed');
        setCompletions([]);
      } finally {
        setLoading(false);
      }
    },
    [accessLevel, playerId, repos.sessionContent],
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

  if (shareMode) {
    return (
      <PeerShareSheet
        mode={shareMode}
        onBack={function () {
          setShareMode(null);
        }}
        onShared={function () {
          setShareMode(null);
        }}
      />
    );
  }

  const shareActions = user?.role === 'player' ? (
    <PeerShareActions
      tryA={tryA}
      onShareAchievement={function () {
        setShareMode('achievement');
      }}
      onShareInsight={function () {
        setShareMode('insight');
      }}
    />
  ) : null;

  if (accessLevel === 'none') {
    return (
      <ScreenContainer>
        <PageHeader title="MY PROGRESS" user={user} />
        {shareActions}
        <div
          className="rounded-xl border border-coach-border bg-coach-card px-4 py-8 text-center"
          data-testid="progress-tier-locked"
        >
          <div className="mb-2 flex justify-center text-coach-t3">
            <IconLock />
          </div>
          <p className="mb-4 font-body text-sm text-coach-t2">
            Upgrade to Pro to unlock your full progress dashboard.
          </p>
          <Btn
            primary
            onClick={function () {
              tryA('viewProgress', function () {});
            }}
          >
            Upgrade
          </Btn>
        </div>
        {!peerShareAllowed ? (
          <p className="mt-3 font-body text-xs text-coach-t3" data-testid="peer-share-tier-hint">
            Peer sharing unlocks at Advanced.
          </p>
        ) : null}
      </ScreenContainer>
    );
  }

  const statCards = [
    features.canViewCompletionCount
      ? { label: 'Drills completed', value: String(summary.drillsCompleted), testId: 'progress-drills-completed' }
      : null,
    features.canViewFullDashboard
      ? { label: 'Practice minutes', value: `${summary.totalDurationMinutes}m`, testId: 'progress-practice-minutes' }
      : null,
    features.canViewFullDashboard && summary.totalReps > 0
      ? { label: 'Total reps logged', value: String(summary.totalReps), testId: 'progress-total-reps' }
      : null,
  ].filter(Boolean);

  return (
    <ScreenContainer data-testid="player-progress-screen">
      <PageHeader title="MY PROGRESS" user={user} />

      {shareActions}

      {accessLevel === 'readonly' ? (
        <Card
          className="mb-4 border border-coach-orange/20 bg-coach-orange-glow/40"
          data-testid="progress-basic-scope-banner"
        >
          <div className="font-body text-[13px] font-semibold text-coach-t1">Basic progress</div>
          <div className="font-body text-xs text-coach-t2">
            You can log drills and see completion counts. Upgrade to Pro for the full dashboard and trends.
          </div>
        </Card>
      ) : null}

      {loading ? (
        <p className="font-body text-sm text-coach-t2">Loading progress…</p>
      ) : null}

      {!loading && error ? (
        <p className="mb-3 font-body text-sm text-coach-red">{error}</p>
      ) : null}

      {!loading
        ? statCards.map(function (stat) {
            return (
              <Card key={stat.label} data-testid={stat.testId}>
                <div className="font-body text-xs uppercase text-coach-t3">{stat.label}</div>
                <div className="mt-1 font-display text-[28px] font-bold text-coach-t1">{stat.value}</div>
              </Card>
            );
          })
        : null}

      {features.canViewTrends ? (
        <div className="mb-2.5 mt-4 font-display text-base font-semibold uppercase text-coach-t1">
          Coach Feedback
        </div>
      ) : null}
      {features.canViewTrends ? (
        <Card className="border-l-[3px] border-l-coach-orange" data-testid="progress-coach-feedback">
          <div className="font-body text-[13px] leading-relaxed text-coach-t1">
            Complete more drills to receive coach feedback here.
          </div>
        </Card>
      ) : null}

      <div className="h-6" />
    </ScreenContainer>
  );
}
