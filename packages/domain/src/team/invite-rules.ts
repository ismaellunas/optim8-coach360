import type { InviteStatus, TeamInvite } from './schema.js';

export const INVITE_EXPIRY_DAYS = 14;

const INVITE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export type InviteValidationError =
  | 'invite_not_found'
  | 'invite_expired'
  | 'invite_revoked'
  | 'invite_consumed';

/** Q11.2 interim default — multi-team membership allowed until stakeholder confirms. */
export function allowsMultipleTeamMembership(): boolean {
  return true;
}

export function generateInviteCode(length = 8): string {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    const index = Math.floor(Math.random() * INVITE_CODE_CHARS.length);
    code += INVITE_CODE_CHARS[index];
  }
  return code;
}

export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}

export function buildInviteLink(code: string, origin = 'https://coach360.app'): string {
  const base = origin.replace(/\/$/, '');
  return `${base}/join?invite=${encodeURIComponent(normalizeInviteCode(code))}`;
}

export function validateTeamInvite(
  invite: Pick<TeamInvite, 'status' | 'expiresAt'> | null | undefined,
  now: Date = new Date(),
): InviteValidationError | null {
  if (!invite) {
    return 'invite_not_found';
  }
  if (invite.status === 'revoked') {
    return 'invite_revoked';
  }
  if (invite.status === 'consumed') {
    return 'invite_consumed';
  }
  if (new Date(invite.expiresAt) < now) {
    return 'invite_expired';
  }
  return null;
}

export function mapInviteErrorMessage(error: InviteValidationError): string {
  switch (error) {
    case 'invite_not_found':
      return 'This invite code is not valid. Check the code and try again.';
    case 'invite_expired':
      return 'This invite has expired. Ask your coach for a new link or code.';
    case 'invite_revoked':
      return 'This invite is no longer active. Ask your coach for a new invite.';
    case 'invite_consumed':
      return 'This invite has already been used. Ask your coach for a new code.';
    default:
      return 'We could not use this invite. Please try again.';
  }
}

export function isInviteStatus(value: string): value is InviteStatus {
  return value === 'active' || value === 'revoked' || value === 'consumed';
}
