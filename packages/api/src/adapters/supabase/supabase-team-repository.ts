import type { SupabaseClient } from '@supabase/supabase-js';
import { teamProfileInputSchema, type Team, type TeamProfileInput } from '@coach360/domain';
import type { TeamLogoFile, TeamRepository } from '../../ports/team-repository.js';
import { mapTeamRow, TEAM_SELECT } from './mappers/team-mapper.js';
import { mapTeamError } from './map-team-error.js';

function mapTeamInsert(input: TeamProfileInput) {
  const parsed = teamProfileInputSchema.parse(input);
  return {
    name: parsed.name,
    description: parsed.description ?? null,
    age_min: parsed.ageMin ?? null,
    age_max: parsed.ageMax ?? null,
    grade_level: parsed.gradeLevel ?? null,
    division: parsed.division ?? null,
    season_start: parsed.seasonStart ?? null,
    season_end: parsed.seasonEnd ?? null,
    logo_url: parsed.logoUrl ?? null,
  };
}

export class SupabaseTeamRepository implements TeamRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listForUser(userId: string): Promise<Team[]> {
    const { data, error } = await this.client
      .from('teams')
      .select(TEAM_SELECT)
      .eq('created_by', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw mapTeamError(error, 'load');
    }

    return (data ?? []).map((row) => mapTeamRow(row as Parameters<typeof mapTeamRow>[0]));
  }

  async getById(teamId: string): Promise<Team | null> {
    const { data, error } = await this.client
      .from('teams')
      .select(TEAM_SELECT)
      .eq('id', teamId)
      .maybeSingle();

    if (error) {
      throw mapTeamError(error, 'load');
    }

    if (!data) {
      return null;
    }

    return mapTeamRow(data as Parameters<typeof mapTeamRow>[0]);
  }

  async createTeam(
    userId: string,
    input: TeamProfileInput,
    logoFile?: TeamLogoFile,
  ): Promise<Team> {
    const payload = mapTeamInsert(input);

    const { data, error } = await this.client
      .from('teams')
      .insert({
        ...payload,
        created_by: userId,
      })
      .select(TEAM_SELECT)
      .single();

    if (error) {
      throw mapTeamError(error, 'create');
    }

    let team = mapTeamRow(data as Parameters<typeof mapTeamRow>[0]);

    if (logoFile) {
      try {
        const logoUrl = await this.uploadLogo(team.id, userId, logoFile.file, logoFile.fileName);
        team = await this.updateTeam(team.id, userId, { ...input, logoUrl });
      } catch (logoError) {
        throw mapTeamError(logoError, 'logo');
      }
    }

    return team;
  }

  async updateTeam(
    teamId: string,
    userId: string,
    input: TeamProfileInput,
    logoFile?: TeamLogoFile,
  ): Promise<Team> {
    const payload = mapTeamInsert(input);

    if (logoFile) {
      try {
        payload.logo_url = await this.uploadLogo(teamId, userId, logoFile.file, logoFile.fileName);
      } catch (logoError) {
        throw mapTeamError(logoError, 'logo');
      }
    }

    const { data, error } = await this.client
      .from('teams')
      .update(payload)
      .eq('id', teamId)
      .eq('created_by', userId)
      .select(TEAM_SELECT)
      .maybeSingle();

    if (error) {
      throw mapTeamError(error, 'update');
    }

    if (!data) {
      throw mapTeamError(new Error('team_not_found'), 'update');
    }

    return mapTeamRow(data as Parameters<typeof mapTeamRow>[0]);
  }

  async uploadLogo(teamId: string, userId: string, file: Blob, fileName: string): Promise<string> {
    void userId;
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${teamId}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await this.client.storage
      .from('team-logos')
      .upload(path, file, { upsert: true });

    if (uploadError) {
      throw mapTeamError(uploadError, 'logo');
    }

    const { data } = this.client.storage.from('team-logos').getPublicUrl(path);
    return data.publicUrl;
  }
}
