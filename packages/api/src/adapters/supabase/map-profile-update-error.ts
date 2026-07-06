import type { PostgrestError } from '@supabase/supabase-js';

export function mapProfileUpdateError(error: PostgrestError | null): Error {
  if (!error) {
    return new Error('profile_update_failed');
  }

  if (error.code === 'PGRST116') {
    return new Error('profile_not_found');
  }

  return new Error(error.message);
}
