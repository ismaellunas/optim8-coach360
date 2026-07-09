import type { PostgrestError } from '@supabase/supabase-js';
import { mapInviteErrorMessage } from '@coach360/domain';

type RosterErrorContext = 'load' | 'invite' | 'accept' | 'add' | 'remove' | 'assign';

function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as PostgrestError).message === 'string'
  );
}

function isUniqueViolation(message: string, code?: string): boolean {
  return (
    code === '23505' ||
    /duplicate key value violates unique constraint/i.test(message) ||
    /unique constraint/i.test(message)
  );
}

function mapInviteRpcMessage(message: string): string | null {
  if (message === 'invite_not_found' || message.includes('invite_not_found')) {
    return mapInviteErrorMessage('invite_not_found');
  }
  if (message === 'invite_expired' || message.includes('invite_expired')) {
    return mapInviteErrorMessage('invite_expired');
  }
  if (message === 'invite_revoked' || message.includes('invite_revoked')) {
    return mapInviteErrorMessage('invite_revoked');
  }
  if (message === 'not_authenticated') {
    return 'Sign in to join this team, then try again.';
  }
  if (message === 'not_authorized') {
    return 'You do not have permission to manage this roster.';
  }
  if (message === 'player_not_found') {
    return 'No player account was found for that email. Share an invite link instead.';
  }
  if (message === 'coach_not_found') {
    return 'No coach account was found for that email.';
  }
  if (message === 'roster_member_not_found') {
    return 'That roster member could not be found.';
  }
  return null;
}

export function mapRosterError(error: unknown, context: RosterErrorContext = 'load'): Error {
  if (!error) {
    return new Error('We could not complete this roster action. Please try again.');
  }

  const postgrest = isPostgrestError(error) ? error : null;
  const message = postgrest?.message ?? (error instanceof Error ? error.message : String(error));
  const code = postgrest?.code;

  const inviteMessage = mapInviteRpcMessage(message);
  if (inviteMessage) {
    return new Error(inviteMessage);
  }

  if (isUniqueViolation(message, code) && /rosters_team_id_profile_id/i.test(message)) {
    return new Error('You are already on this team roster.');
  }

  if (context === 'load') {
    return new Error('We could not load roster data. Check your connection and try again.');
  }

  if (context === 'invite') {
    return new Error('We could not create an invite. Please try again.');
  }

  if (context === 'accept') {
    return new Error('We could not join this team. Check the invite code and try again.');
  }

  if (context === 'remove') {
    return new Error('We could not remove this player from the roster.');
  }

  if (context === 'assign') {
    return new Error('We could not assign that coach to the team.');
  }

  return new Error(message);
}
