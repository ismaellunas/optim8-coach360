import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@coach360/domain';
import { mapProfileToUser } from './mappers/user-mapper.js';

export async function loadProfileUser(
  client: SupabaseClient,
  userId: string,
  email: string,
): Promise<User> {
  const { data, error } = await client
    .from('profiles')
    .select('id, role, display_name, is_suspended')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('profile_not_found');
  }

  return mapProfileToUser(data, email);
}
