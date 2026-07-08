import { useCallback, useEffect, useState } from 'react';
import { useRepositories } from '@coach360/api';
import { formatTeamProfileSummary } from '@coach360/domain';
import { useAuth } from '@/features/auth/model/use-auth.js';
import { Button as Btn, Card, PageHeader, ScreenContainer } from '@/shared/ui/primitives.jsx';
import { ManualAddPlayerForm } from './ManualAddPlayerForm.jsx';

export function TeamInviteScreen({ teamId, team, onBack }) {
  const { session } = useAuth();
  const repos = useRepositories();
  const userId = session?.user.id;

  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [manualError, setManualError] = useState(null);
  const [copied, setCopied] = useState(null);

  const loadInvite = useCallback(
    async function () {
      if (!userId || !teamId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
        const created = await repos.rosters.createInvite(teamId, userId, { origin });
        setInvite(created);
      } catch (cause) {
        setInvite(null);
        setError(cause instanceof Error ? cause.message : 'invite_create_failed');
      } finally {
        setLoading(false);
      }
    },
    [repos.rosters, teamId, userId],
  );

  useEffect(function () {
    loadInvite();
  }, [loadInvite]);

  async function handleCopy(value, label) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(function () {
        setCopied(null);
      }, 2000);
    } catch {
      setCopied(null);
    }
  }

  async function handleRegenerate() {
    setSubmitting(true);
    setError(null);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
      const created = await repos.rosters.createInvite(teamId, userId, { origin });
      setInvite(created);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'invite_create_failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleManualAdd(email) {
    setManualSubmitting(true);
    setManualError(null);
    try {
      await repos.rosters.addPlayerByEmail(teamId, userId, email);
    } catch (cause) {
      setManualError(cause instanceof Error ? cause.message : 'manual_add_failed');
      throw cause;
    } finally {
      setManualSubmitting(false);
    }
  }

  return (
    <ScreenContainer className="pb-6">
      <PageHeader title="INVITE PLAYERS" onBack={onBack} />
      {team ? (
        <Card className="mb-4 p-4">
          <div className="font-display text-lg font-bold text-coach-t1">{team.name}</div>
          <div className="mt-1 font-body text-xs text-coach-t3">
            {formatTeamProfileSummary(team) || 'Team profile'}
          </div>
        </Card>
      ) : null}

      {loading ? <p className="font-body text-sm text-coach-t2">Generating invite…</p> : null}
      {!loading && error ? <p className="mb-3 font-body text-sm text-coach-red">{error}</p> : null}

      {!loading && invite ? (
        <Card className="p-4">
          <p className="font-display text-sm font-semibold uppercase tracking-wider text-coach-orange">
            Share invite
          </p>
          <p className="mt-2 font-body text-sm text-coach-t2">
            Send this link or code to players. Invites expire in 14 days.
          </p>
          <div className="mt-4 rounded-xl border border-coach-border bg-coach-surface p-3">
            <p className="font-body text-[10px] uppercase text-coach-t3">Invite code</p>
            <p className="mt-1 font-display text-2xl font-bold tracking-[0.2em] text-coach-t1">
              {invite.code}
            </p>
            <Btn
              small
              className="mt-3"
              onClick={function () {
                handleCopy(invite.code, 'code');
              }}
            >
              {copied === 'code' ? 'Copied!' : 'Copy code'}
            </Btn>
          </div>
          <div className="mt-4 rounded-xl border border-coach-border bg-coach-surface p-3">
            <p className="font-body text-[10px] uppercase text-coach-t3">Invite link</p>
            <p className="mt-1 break-all font-body text-xs text-coach-t2">{invite.inviteUrl}</p>
            <Btn
              small
              className="mt-3"
              onClick={function () {
                handleCopy(invite.inviteUrl, 'link');
              }}
            >
              {copied === 'link' ? 'Copied!' : 'Copy link'}
            </Btn>
          </div>
          <Btn full className="mt-4" disabled={submitting} onClick={handleRegenerate}>
            {submitting ? 'Generating…' : 'Generate new invite'}
          </Btn>
        </Card>
      ) : null}

      <ManualAddPlayerForm
        submitting={manualSubmitting}
        error={manualError}
        onSubmit={handleManualAdd}
      />
    </ScreenContainer>
  );
}
