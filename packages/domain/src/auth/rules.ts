import type { AppSession } from './schema.js';

export function isAuthenticatedSession(session: AppSession | null | undefined): boolean {
  return session !== null && session !== undefined;
}
