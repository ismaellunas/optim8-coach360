import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  coachProfileInputSchema,
  playerProfileInputSchema,
  selfProfileInputSchema,
  teamManagerProfileInputSchema,
} from '@coach360/domain';
import { REPO_ROOT } from '../helpers/supabase-test-env.js';

const PROFILE_SCREEN_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'profile',
  'ui',
  'ProfileScreen.jsx',
);

describe('profile self-edit — every role can change identity fields except email', () => {
  it('accepts name, bio, and photo on coach, player, and team manager updates', () => {
    const shared = {
      displayName: 'Alex Rivera',
      bio: 'Works with youth teams.',
      avatarUrl: 'https://example.com/avatar.jpg',
    };

    expect(
      coachProfileInputSchema.parse({ ...shared, coachContext: 'team' }).displayName,
    ).toBe('Alex Rivera');
    expect(
      playerProfileInputSchema.parse({ ...shared, age: 16, position: 'Point Guard' }).bio,
    ).toBe('Works with youth teams.');
    expect(teamManagerProfileInputSchema.parse(shared).avatarUrl).toBe(
      'https://example.com/avatar.jpg',
    );
    expect(selfProfileInputSchema.parse(shared).displayName).toBe('Alex Rivera');
    expect(selfProfileInputSchema.safeParse({ ...shared, email: 'a@b.com' }).data.email).toBe(
      undefined,
    );
  });

  it('profile screen edits name, bio, and photo for players, coaches, and team managers', () => {
    const screen = readFileSync(PROFILE_SCREEN_PATH, 'utf8');
    expect(screen).toMatch(/legacyRole === 'team'\) return 'team_manager'/);
    expect(screen).toMatch(/id="profile-edit-name"/);
    expect(screen).toMatch(/id="profile-edit-bio"/);
    expect(screen).toMatch(/data-testid="profile-edit-photo"/);
    expect(screen).toMatch(/id="profile-edit-email"/);
    expect(screen).toMatch(/readOnly/);
    expect(screen).toMatch(/Email cannot be changed/);
    expect(screen).toMatch(/repos\.profiles\.uploadAvatar\(userId, photoFile, photoFile\.name\)/);
    expect(screen).toMatch(/displayName,/);
    expect(screen).toMatch(/updatePlayerProfile\(userId, \{/);
    expect(screen).toMatch(/updateCoachProfile\(userId, \{/);
    expect(screen).toMatch(/updateTeamManagerProfile\(userId, \{/);
    expect(screen).not.toMatch(/updateUser\(\s*\{\s*email/);
  });
});
