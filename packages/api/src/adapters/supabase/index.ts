import {
  createSupabaseClient,
  type CreateSupabaseClientOptions,
  type SupabaseEnv,
} from './create-supabase-client.js';
import { SupabaseAppAuthRepository } from './supabase-app-auth-repository.js';
import { SupabaseAuthRepository } from './supabase-auth-repository.js';

export {
  createSupabaseClient,
  type CreateSupabaseClientOptions,
  type SupabaseEnv,
} from './create-supabase-client.js';
export { createMemoryAuthStorage } from './memory-auth-storage.js';
export { loadProfileUser } from './load-profile-user.js';
export { SupabaseAppAuthRepository } from './supabase-app-auth-repository.js';
export { SupabaseAuthRepository } from './supabase-auth-repository.js';
export { SupabaseProfileRepository } from './supabase-profile-repository.js';

export function createSharedSupabaseClient(
  env: SupabaseEnv,
  options?: CreateSupabaseClientOptions,
) {
  return createSupabaseClient(env, options);
}

export function createSupabaseAuthRepository(
  env: SupabaseEnv,
  options?: CreateSupabaseClientOptions,
) {
  return new SupabaseAuthRepository(createSupabaseClient(env, options));
}

export function createSupabaseAppAuthRepository(
  env: SupabaseEnv,
  options?: CreateSupabaseClientOptions,
) {
  return new SupabaseAppAuthRepository(createSupabaseClient(env, options));
}
