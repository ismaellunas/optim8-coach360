import { useState } from 'react';
import { useRepositories } from '@coach360/api';
import { useAuth } from '@/features/auth/model/use-auth.js';
import { CoachProfileForm } from './CoachProfileForm.jsx';
import { PlayerProfileForm } from './PlayerProfileForm.jsx';
import { TeamManagerProfileFlow } from './TeamManagerProfileFlow.jsx';

function formatProfileError(message, onProfileMissing) {
  if (message === 'profile_not_found') {
    return 'Your session is out of date. Sign out and sign in again (or create a new account after a database reset).';
  }
  return message;
}

async function handleProfileError(cause, setError, onProfileMissing) {
  const message = cause instanceof Error ? cause.message : 'profile_save_failed';
  if (message === 'profile_not_found' && onProfileMissing) {
    await onProfileMissing();
    return;
  }
  setError(formatProfileError(message, onProfileMissing));
}

export function ProfileSetupFlow({ onComplete, onProfileMissing }) {
  const { session } = useAuth();
  const repos = useRepositories();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const userId = session?.user.id;
  const role = session?.user.role;

  if (!userId || !role) {
    return null;
  }

  async function handleCoach(input) {
    setSubmitting(true);
    setError(null);
    try {
      const profile = await repos.profiles.updateCoachProfile(userId, input);
      onComplete(profile);
    } catch (cause) {
      await handleProfileError(cause, setError, onProfileMissing);
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePlayer({ age, position, photoFile }) {
    setSubmitting(true);
    setError(null);
    try {
      let avatarUrl = null;
      if (photoFile) {
        avatarUrl = await repos.profiles.uploadAvatar(userId, photoFile, photoFile.name);
      }
      const profile = await repos.profiles.updatePlayerProfile(userId, {
        age,
        position,
        avatarUrl,
      });
      onComplete(profile);
    } catch (cause) {
      await handleProfileError(cause, setError, onProfileMissing);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEnterTeamSetupPath(input) {
    setSubmitting(true);
    setError(null);
    try {
      const profile = await repos.profiles.enterTeamSetupPath(userId, input);
      onComplete(profile);
    } catch (cause) {
      await handleProfileError(cause, setError, onProfileMissing);
    } finally {
      setSubmitting(false);
    }
  }

  if (role === 'coach') {
    return (
      <CoachProfileForm submitting={submitting} error={error} onSubmit={handleCoach} />
    );
  }

  if (role === 'player') {
    return (
      <PlayerProfileForm
        submitting={submitting}
        error={error}
        onSubmit={handlePlayer}
      />
    );
  }

  if (role === 'team_manager') {
    return (
      <TeamManagerProfileFlow
        submitting={submitting}
        error={error}
        onEnterTeamSetupPath={handleEnterTeamSetupPath}
      />
    );
  }

  return null;
}
