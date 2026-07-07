import type { PostgrestError } from '@supabase/supabase-js';

type TeamErrorContext = 'create' | 'update' | 'logo' | 'load';

function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as PostgrestError).message === 'string'
  );
}

function isRlsViolation(message: string, code?: string): boolean {
  return code === '42501' || /row-level security policy/i.test(message);
}

function isUniqueViolation(message: string, code?: string): boolean {
  return (
    code === '23505' ||
    /duplicate key value violates unique constraint/i.test(message) ||
    /unique constraint/i.test(message)
  );
}

function mapUniqueViolation(message: string): string {
  if (/rosters_team_id_profile_id/i.test(message)) {
    return 'You are already on this team roster.';
  }
  if (/teams_/i.test(message)) {
    return 'A team with these details already exists. Open Roster to manage it, or choose a different team name.';
  }
  return 'This record already exists. Refresh the page or change the conflicting value and try again.';
}

function mapZodValidationMessage(message: string): string | null {
  if (message.includes('age_range_invalid')) {
    return 'Minimum age must be less than or equal to maximum age.';
  }
  if (message.includes('season_range_invalid')) {
    return 'Season start must be on or before season end.';
  }
  if (message.includes('invalid_format') && message.includes('season')) {
    return 'Enter valid season dates or leave both season fields blank.';
  }
  return null;
}

export function mapTeamError(error: unknown, context: TeamErrorContext = 'create'): Error {
  if (!error) {
    return new Error('We could not save your team. Please try again.');
  }

  const postgrest = isPostgrestError(error) ? error : null;
  const message = postgrest?.message ?? (error instanceof Error ? error.message : String(error));
  const code = postgrest?.code;

  const zodMessage = mapZodValidationMessage(message);
  if (zodMessage) {
    return new Error(zodMessage);
  }

  if (isUniqueViolation(message, code)) {
    return new Error(mapUniqueViolation(message));
  }

  if (isRlsViolation(message, code)) {
    if (context === 'logo') {
      return new Error(
        'Your team profile was saved, but the logo could not be uploaded. Open Roster → Manage to add a logo later.',
      );
    }
    return new Error(
      'You do not have permission to save this team. Sign out, sign in again, and retry. If this continues, contact support.',
    );
  }

  if (code === 'PGRST116' || message === 'team_not_found') {
    return new Error('This team could not be found. It may have been removed.');
  }

  if (context === 'load') {
    return new Error('We could not load your teams. Check your connection and try again.');
  }

  if (message === 'team_create_failed' || message === 'team_update_failed' || message === 'team_load_failed') {
    return new Error('We could not save your team. Please check your entries and try again.');
  }

  return new Error(message);
}
