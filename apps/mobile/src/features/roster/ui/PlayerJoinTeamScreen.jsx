import { useState } from 'react';
import { useRepositories } from '@coach360/api';
import {
  mapInviteErrorMessage,
  normalizeInviteCode,
  validateTeamInvite,
} from '@coach360/domain';
import { useAuth } from '@/features/auth/model/use-auth.js';
import { Button as Btn, Card, Field, PageHeader, ScreenContainer } from '@/shared/ui/primitives.jsx';

export function PlayerJoinTeamScreen({ initialCode = '', onJoined, onBack }) {
  const { session } = useAuth();
  const repos = useRepositories();
  const userId = session?.user.id;

  const [code, setCode] = useState(initialCode);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState(null);

  async function handlePreview() {
    const normalized = normalizeInviteCode(code);
    if (!normalized) {
      setError(mapInviteErrorMessage('invite_not_found'));
      setPreview(null);
      return;
    }

    setPreviewing(true);
    setError(null);
    try {
      const invite = await repos.rosters.getInviteByCode(normalized);
      const validationError = validateTeamInvite(invite);
      if (validationError) {
        setPreview(null);
        setError(mapInviteErrorMessage(validationError));
        return;
      }
      setPreview(invite);
    } catch (cause) {
      setPreview(null);
      setError(cause instanceof Error ? cause.message : mapInviteErrorMessage('invite_not_found'));
    } finally {
      setPreviewing(false);
    }
  }

  async function handleAccept() {
    if (!userId) {
      return;
    }

    const normalized = normalizeInviteCode(code);
    setSubmitting(true);
    setError(null);
    try {
      const invite = await repos.rosters.getInviteByCode(normalized);
      const validationError = validateTeamInvite(invite);
      if (validationError) {
        setError(mapInviteErrorMessage(validationError));
        return;
      }
      const result = await repos.rosters.acceptInvite(normalized, userId);
      onJoined?.(result.teamId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : mapInviteErrorMessage('invite_not_found'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer className="pb-6">
      <PageHeader title="JOIN TEAM" onBack={onBack} />
      <Card className="p-4">
        <p className="font-body text-sm text-coach-t2">
          Enter the invite code from your coach or open the invite link they shared.
        </p>
        <div className="mt-4">
          <Field
            id="player-join-invite-code"
            label="Invite code"
            placeholder="ABCD1234"
            value={code}
            onChange={function (event) {
              setCode(event.target.value.toUpperCase());
              setPreview(null);
              setError(null);
            }}
          />
        </div>
        {error ? <p className="mb-3 font-body text-sm text-coach-red">{error}</p> : null}
        {preview ? (
          <div className="mb-4 rounded-xl border border-coach-border bg-coach-surface p-3">
            <p className="font-body text-[10px] uppercase text-coach-t3">Team</p>
            <p className="mt-1 font-display text-lg font-bold text-coach-t1">{preview.teamName}</p>
          </div>
        ) : null}
        <div className="flex gap-2">
          <Btn disabled={previewing || !code.trim()} onClick={handlePreview}>
            {previewing ? 'Checking…' : 'Check code'}
          </Btn>
          <Btn primary disabled={submitting || !code.trim()} onClick={handleAccept}>
            {submitting ? 'Joining…' : 'Join team'}
          </Btn>
        </div>
      </Card>
    </ScreenContainer>
  );
}
