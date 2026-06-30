import { appRoleSchema, type User } from './schema.js';

export type AdminAccessDeniedReason =
  | 'not_authenticated'
  | 'not_admin'
  | 'suspended'
  | 'invalid_role';

export type AdminAccessResult =
  | { ok: true; user: User }
  | { ok: false; reason: AdminAccessDeniedReason };

export function canAccessAdmin(user: User | null | undefined): AdminAccessResult {
  if (!user) {
    return { ok: false, reason: 'not_authenticated' };
  }

  const roleResult = appRoleSchema.safeParse(user.role);
  if (!roleResult.success) {
    return { ok: false, reason: 'invalid_role' };
  }

  if (user.isSuspended) {
    return { ok: false, reason: 'suspended' };
  }

  if (roleResult.data !== 'admin') {
    return { ok: false, reason: 'not_admin' };
  }

  return { ok: true, user };
}

export function assertAdminAccess(user: User | null | undefined): asserts user is User {
  const result = canAccessAdmin(user);
  if (!result.ok) {
    throw new Error(`admin_access_denied:${result.reason}`);
  }
}
