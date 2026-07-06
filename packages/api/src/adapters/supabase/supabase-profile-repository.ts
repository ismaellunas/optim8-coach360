import type { SupabaseClient } from '@supabase/supabase-js';
import {
  coachProfileInputSchema,
  playerProfileInputSchema,
  teamManagerProfileInputSchema,
  type CoachProfileInput,
  type PlayerProfileInput,
  type Profile,
  type TeamManagerProfileInput,
} from '@coach360/domain';
import type { ProfileRepository } from '../../ports/profile-repository.js';
import { mapProfileRow, PROFILE_SELECT } from './mappers/profile-mapper.js';
import { mapProfileUpdateError } from './map-profile-update-error.js';

export class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getById(id: string): Promise<Profile | null> {
    const { data, error } = await this.client
      .from('profiles')
      .select(PROFILE_SELECT)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return null;
    }

    return mapProfileRow(data);
  }

  async updateCoachProfile(id: string, input: CoachProfileInput): Promise<Profile> {
    const parsed = coachProfileInputSchema.parse(input);
    const now = new Date().toISOString();

    const { data, error } = await this.client
      .from('profiles')
      .update({
        coach_context: parsed.coachContext,
        bio: parsed.bio ?? null,
        profile_completed_at: now,
      })
      .eq('id', id)
      .select(PROFILE_SELECT)
      .maybeSingle();

    if (error) {
      throw mapProfileUpdateError(error);
    }

    if (!data) {
      throw new Error('profile_not_found');
    }

    return mapProfileRow(data);
  }

  async updatePlayerProfile(id: string, input: PlayerProfileInput): Promise<Profile> {
    const parsed = playerProfileInputSchema.parse(input);
    const now = new Date().toISOString();

    const { data, error } = await this.client
      .from('profiles')
      .update({
        age: parsed.age,
        position: parsed.position,
        avatar_url: parsed.avatarUrl ?? null,
        profile_completed_at: now,
      })
      .eq('id', id)
      .select(PROFILE_SELECT)
      .maybeSingle();

    if (error) {
      throw mapProfileUpdateError(error);
    }

    if (!data) {
      throw new Error('profile_not_found');
    }

    return mapProfileRow(data);
  }

  async updateTeamManagerProfile(id: string, input: TeamManagerProfileInput): Promise<Profile> {
    const parsed = teamManagerProfileInputSchema.parse(input);

    const { data, error } = await this.client
      .from('profiles')
      .update({
        bio: parsed.bio ?? null,
      })
      .eq('id', id)
      .select(PROFILE_SELECT)
      .maybeSingle();

    if (error) {
      throw mapProfileUpdateError(error);
    }

    if (!data) {
      throw new Error('profile_not_found');
    }

    return mapProfileRow(data);
  }

  async enterTeamSetupPath(id: string, input?: TeamManagerProfileInput): Promise<Profile> {
    const parsed = input ? teamManagerProfileInputSchema.parse(input) : null;
    const now = new Date().toISOString();

    const { data, error } = await this.client
      .from('profiles')
      .update({
        bio: parsed?.bio ?? null,
        team_setup_path_entered_at: now,
        profile_completed_at: now,
      })
      .eq('id', id)
      .select(PROFILE_SELECT)
      .maybeSingle();

    if (error) {
      throw mapProfileUpdateError(error);
    }

    if (!data) {
      throw new Error('profile_not_found');
    }

    return mapProfileRow(data);
  }

  async uploadAvatar(id: string, file: Blob, fileName: string): Promise<string> {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${id}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await this.client.storage
      .from('avatars')
      .upload(path, file, { upsert: true });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = this.client.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  }
}
