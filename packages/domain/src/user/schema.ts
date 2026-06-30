import { z } from 'zod';

export const appRoleSchema = z.enum(['coach', 'player', 'team_manager', 'admin']);
export type AppRole = z.infer<typeof appRoleSchema>;

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: appRoleSchema,
  displayName: z.string().nullable(),
  isSuspended: z.boolean(),
});

export type User = z.infer<typeof userSchema>;

export const adminSessionSchema = z.object({
  user: userSchema,
  accessToken: z.string().min(1),
});

export type AdminSession = z.infer<typeof adminSessionSchema>;
