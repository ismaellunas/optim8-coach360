import { describe, it, expect } from 'vitest';
import { mapTeamError } from '../../packages/api/src/adapters/supabase/map-team-error.js';

describe('mapTeamError', () => {
  it('maps unique constraint violations to a friendly duplicate message', () => {
    const error = mapTeamError(
      {
        code: '23505',
        message:
          'duplicate key value violates unique constraint "teams_name_created_by_key" on table "teams"',
      },
      'create',
    );

    expect(error.message).toMatch(/already exists/i);
    expect(error.message).not.toMatch(/row-level security/i);
    expect(error.message).not.toMatch(/unique constraint/i);
  });

  it('maps roster duplicate unique violations', () => {
    const error = mapTeamError(
      {
        code: '23505',
        message: 'duplicate key value violates unique constraint "rosters_team_id_profile_id_key"',
      },
      'create',
    );

    expect(error.message).toBe('You are already on this team roster.');
  });

  it('maps RLS violations on create to a permission message', () => {
    const error = mapTeamError(
      {
        code: '42501',
        message: 'new row violates row-level security policy for table "teams"',
      },
      'create',
    );

    expect(error.message).toMatch(/permission/i);
    expect(error.message).not.toMatch(/row-level security policy/i);
  });

  it('maps RLS violations on logo upload to a partial-save message', () => {
    const error = mapTeamError(
      {
        code: '42501',
        message: 'new row violates row-level security policy for table "objects"',
      },
      'logo',
    );

    expect(error.message).toMatch(/team profile was saved/i);
    expect(error.message).toMatch(/logo/i);
  });

  it('maps zod validation messages', () => {
    expect(mapTeamError(new Error('age_range_invalid')).message).toMatch(/Minimum age/);
    expect(mapTeamError(new Error('season_range_invalid')).message).toMatch(/Season start/);
  });
});
