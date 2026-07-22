import { useCallback, useEffect, useState } from 'react';
import {
  achievementFromProgress,
  buildInsightAttachment,
  canSharePeerContentToChannel,
  formatInsightShareMessage,
  summarizePlayerProgress,
} from '@coach360/domain';
import { useRepositories } from '@coach360/api';
import { useAuth } from '@/features/auth/model/use-auth.js';
import {
  Button as Btn,
  Card,
  Field,
  PageHeader,
  ScreenContainer,
} from '@/shared/ui/primitives.jsx';

/**
 * STORY-8.3 — share achievement or tip to a team chat channel (OQ-18.2 team-only).
 */
export function PeerShareSheet({ mode, onBack, onShared }) {
  const { session } = useAuth();
  const repos = useRepositories();
  const userId = session?.user.id;

  const [teamChannels, setTeamChannels] = useState([]);
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [tipTitle, setTipTitle] = useState('Training tip');
  const [tipBody, setTipBody] = useState('');
  const [achievementPreview, setAchievementPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(
    async function () {
      if (!userId) {
        setTeamChannels([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const conversations = await repos.messaging.listConversations(userId);
        const teams = (conversations ?? []).filter(function (c) {
          return canSharePeerContentToChannel(c.type);
        });
        setTeamChannels(teams);
        setSelectedChannelId(teams[0]?.id ?? '');

        if (mode === 'achievement') {
          const completions = await repos.sessionContent.listPlayerProgress(userId);
          const summary = summarizePlayerProgress(completions ?? []);
          setAchievementPreview(achievementFromProgress(summary));
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'peer_share_load_failed');
        setTeamChannels([]);
      } finally {
        setLoading(false);
      }
    },
    [mode, repos.messaging, repos.sessionContent, userId],
  );

  useEffect(
    function () {
      load();
    },
    [load],
  );

  async function handleSend() {
    if (!selectedChannelId || sending) {
      return;
    }
    setSending(true);
    setError(null);
    try {
      if (mode === 'achievement') {
        const attachment = achievementPreview ?? achievementFromProgress({
          drillsCompleted: 0,
          itemsCompleted: 0,
          totalReps: 0,
          totalDurationMinutes: 0,
        });
        await repos.messaging.sendChannelMessage({
          channelId: selectedChannelId,
          messageType: 'achievement',
          body: attachment.title,
          attachment,
        });
      } else {
        const formatted = formatInsightShareMessage(tipTitle, tipBody);
        if (!formatted) {
          throw new Error('peer_share_tip_required');
        }
        const attachment = buildInsightAttachment({
          title: tipTitle.trim(),
          tip: tipBody.trim(),
        });
        await repos.messaging.sendChannelMessage({
          channelId: selectedChannelId,
          messageType: 'insight',
          body: formatted,
          attachment,
        });
      }
      onShared?.();
      onBack?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'peer_share_send_failed');
    } finally {
      setSending(false);
    }
  }

  const title = mode === 'achievement' ? 'SHARE ACHIEVEMENT' : 'SHARE TIP';

  return (
    <ScreenContainer data-testid="peer-share-sheet">
      <PageHeader title={title} onBack={onBack} />

      {loading ? (
        <p className="font-body text-sm text-coach-t2">Loading teams…</p>
      ) : null}

      {!loading && error ? (
        <p className="mb-3 font-body text-sm text-coach-red" data-testid="peer-share-error">
          {error}
        </p>
      ) : null}

      {!loading && teamChannels.length === 0 ? (
        <Card data-testid="peer-share-no-team">
          <div className="font-body text-sm text-coach-t2">
            Join a team to share with teammates. Peer shares go to team chat only.
          </div>
        </Card>
      ) : null}

      {!loading && teamChannels.length > 0 ? (
        <>
          <label
            className="mb-1.5 block font-body text-xs uppercase text-coach-t3"
            htmlFor="peer-share-team"
          >
            Team chat
          </label>
          <select
            id="peer-share-team"
            data-testid="peer-share-team-select"
            value={selectedChannelId}
            onChange={function (event) {
              setSelectedChannelId(event.target.value);
            }}
            className="mb-4 box-border w-full rounded-xl border border-coach-border bg-coach-card px-4 py-3 font-body text-sm text-coach-t1 outline-none"
          >
            {teamChannels.map(function (channel) {
              return (
                <option key={channel.id} value={channel.id}>
                  {channel.title || 'Team chat'}
                </option>
              );
            })}
          </select>

          {mode === 'achievement' && achievementPreview ? (
            <Card className="mb-4" data-testid="peer-share-achievement-preview">
              <div className="font-body text-xs uppercase text-coach-t3">Achievement</div>
              <div className="mt-1 font-display text-lg font-bold text-coach-t1">
                {achievementPreview.title}
              </div>
              {achievementPreview.metricLabel ? (
                <div className="mt-1 font-body text-xs text-coach-t2">
                  {achievementPreview.metricLabel}: {achievementPreview.metricValue}
                </div>
              ) : null}
            </Card>
          ) : null}

          {mode === 'insight' ? (
            <div className="mb-4" data-testid="peer-share-insight-form">
              <Field
                id="peer-share-tip-title"
                label="Title"
                value={tipTitle}
                onChange={function (event) {
                  setTipTitle(event.target.value);
                }}
                placeholder="Tip title"
              />
              <Field
                id="peer-share-tip-body"
                label="Tip"
                value={tipBody}
                onChange={function (event) {
                  setTipBody(event.target.value);
                }}
                placeholder="Share a tip or challenge with teammates"
              />
            </div>
          ) : null}

          <div data-testid="peer-share-send">
            <Btn
              primary
              full
              disabled={sending || !selectedChannelId}
              onClick={handleSend}
            >
              {sending ? 'Posting…' : 'Post to team chat'}
            </Btn>
          </div>
        </>
      ) : null}
    </ScreenContainer>
  );
}
