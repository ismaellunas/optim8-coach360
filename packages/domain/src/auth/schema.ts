import { z } from 'zod';
import { userSchema } from '../user/schema.js';

export const signupRoleSchema = z.enum(['coach', 'player', 'team_manager']);
export type SignupRole = z.infer<typeof signupRoleSchema>;

export const appSessionSchema = z.object({
  user: userSchema,
  accessToken: z.string().min(1),
});

export type AppSession = z.infer<typeof appSessionSchema>;

export const signUpResultSchema = z.object({
  needsEmailVerification: z.boolean(),
  session: appSessionSchema.nullable(),
});

export type SignUpResult = z.infer<typeof signUpResultSchema>;

export const signUpInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: signupRoleSchema,
  displayName: z.string().trim().min(1).optional(),
});

export type SignUpInput = z.infer<typeof signUpInputSchema>;

export const appSignInInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type AppSignInInput = z.infer<typeof appSignInInputSchema>;

export const requestPasswordResetInputSchema = z.object({
  email: z.string().email(),
  redirectTo: z.string().url().optional(),
});

export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetInputSchema>;

export const establishRecoverySessionInputSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});

export type EstablishRecoverySessionInput = z.infer<typeof establishRecoverySessionInputSchema>;

export const completePasswordResetInputSchema = z.object({
  newPassword: z.string().min(6),
});

export type CompletePasswordResetInput = z.infer<typeof completePasswordResetInputSchema>;
