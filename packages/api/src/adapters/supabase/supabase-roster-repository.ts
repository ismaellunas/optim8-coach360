import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildInviteLink,
  generateInviteCode,
  INVITE_EXPIRY_DAYS,
  normalizeInviteCode,
  type Team,
  type TeamInvitePreview,
  type TeamInviteWithLink,
} from '@coach360/domain';
import type { CreateInviteOptions, RosterRepository } from '../../ports/roster-repository.js';
import { mapTeamRow, TEAM_SELECT } from './mappers/team-mapper.js';
import {
  mapRosterMemberRow,
  mapTeamInvitePreviewRow,
  mapTeamInviteRow,
  ROSTER_MEMBER_SELECT,
  TEAM_INVITE_PREVIEW_SELECT,
  TEAM_INVITE_SELECT,
} from './mappers/roster-mapper.js';
import { mapRosterError } from './map-roster-error.js';

function inviteExpiresAt(): string {
  const expires = new Date();
  expires.setDate(expires.getDate() + INVITE_EXPIRY_DAYS);
  return expires.toISOString();
}

export class SupabaseRosterRepository implements RosterRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listMembers(teamId: string) {
    const { data, error } = await this.client
      .from('rosters')
      .select(ROSTER_MEMBER_SELECT)
      .eq('team_id', teamId)
      .neq('status', 'removed')
      .order('joined_at', { ascending: true });

    if (error) {
      throw mapRosterError(error, 'load');
    }

    return (data ?? []).map((row) =>
      mapRosterMemberRow(row as Parameters<typeof mapRosterMemberRow>[0]),
    );
  }

  async listMemberTeams(userId: string): Promise<Team[]> {
    const { data, error } = await this.client
      .from('rosters')
      .select(`team_id, teams(${TEAM_SELECT})`)
      .eq('profile_id', userId)
      .eq('status', 'active');

    if (error) {
      throw mapRosterError(error, 'load');
    }

    const teams: Team[] = [];
    for (const row of data ?? []) {
      const rawTeams = (row as { teams: unknown }).teams;
      const teamRow = Array.isArray(rawTeams) ? rawTeams[0] : rawTeams;
      if (teamRow) {
        teams.push(mapTeamRow(teamRow as Parameters<typeof mapTeamRow>[0]));
      }
    }
    return teams;
  }

  async createInvite(
    teamId: string,
    userId: string,
    options: CreateInviteOptions = {},
  ): Promise<TeamInviteWithLink> {
    const code = generateInviteCode();
    const invitedEmail = options.invitedEmail?.trim() || null;

    const { data, error } = await this.client
      .from('team_invites')
      .insert({
        team_id: teamId,
        code,
        created_by: userId,
        invited_email: invitedEmail,
        expires_at: inviteExpiresAt(),
      })
      .select(TEAM_INVITE_SELECT)
      .single();

    if (error) {
      throw mapRosterError(error, 'invite');
    }

    const inviteUrl = buildInviteLink(code, options.origin);
    return mapTeamInviteRow(data as Parameters<typeof mapTeamInviteRow>[0], inviteUrl);
  }

  async getInviteByCode(code: string): Promise<TeamInvitePreview | null> {
    const normalized = normalizeInviteCode(code);
    const { data, error } = await this.client
      .from('team_invites')
      .select(TEAM_INVITE_PREVIEW_SELECT)
      .eq('code', normalized)
      .maybeSingle();

    if (error) {
      throw mapRosterError(error, 'load');
    }

    if (!data) {
      return null;
    }

    return mapTeamInvitePreviewRow(data as Parameters<typeof mapTeamInvitePreviewRow>[0]);
  }

  async acceptInvite(code: string, userId: string): Promise<{ teamId: string }> {
    void userId;
    const normalized = normalizeInviteCode(code);
    const { data, error } = await this.client.rpc('accept_team_invite', {
      p_code: normalized,
    });

    if (error) {
      throw mapRosterError(error, 'accept');
    }

    if (!data) {
      throw mapRosterError(new Error('invite_not_found'), 'accept');
    }

    return { teamId: String(data) };
  }

  async addPlayerByEmail(teamId: string, userId: string, email: string) {
    void userId;
    const { data: profileId, error } = await this.client.rpc('add_player_to_roster_by_email', {
      p_team_id: teamId,
      p_email: email.trim(),
    });

    if (error) {
      throw mapRosterError(error, 'add');
    }

    if (!profileId) {
      throw mapRosterError(new Error('player_not_found'), 'add');
    }

    const { data: memberRow, error: loadError } = await this.client
      .from('rosters')
      .select(ROSTER_MEMBER_SELECT)
      .eq('team_id', teamId)
      .eq('profile_id', profileId)
      .maybeSingle();

    if (loadError) {
      throw mapRosterError(loadError, 'load');
    }

    if (!memberRow) {
      throw mapRosterError(new Error('roster_load_failed'), 'add');
    }

    return mapRosterMemberRow(memberRow as Parameters<typeof mapRosterMemberRow>[0]);
  }
}
