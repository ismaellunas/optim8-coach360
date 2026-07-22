import {
  assertPlayerOnRosterForDistribution,
  assignContentInputSchema,
  type AssignContentInput,
  type SessionContentKind,
} from '@coach360/domain';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type {
  ContentAssignment,
  ContentAssignmentRepository,
} from '../../ports/content-assignment-repository.js';

const ASSIGNMENT_SELECT =
  'id, library_item_id, coach_id, team_id, player_id, created_at';

function mapWriteError(error: { code?: string; message: string }, fallback: string): string {
  if (error.code === '42501' || /row-level security/i.test(error.message)) {
    return 'non_roster_distribution_forbidden';
  }
  if (/non_roster_distribution_forbidden/.test(error.message)) {
    return 'non_roster_distribution_forbidden';
  }
  return `${fallback}:${error.message}`;
}

function mapAssignmentRow(
  row: {
    id: string;
    library_item_id: string;
    coach_id: string;
    team_id: string | null;
    player_id: string | null;
    created_at: string;
  },
  meta: {
    title: string;
    kind: SessionContentKind;
    coachDisplayName: string | null;
  },
): ContentAssignment {
  return {
    id: row.id,
    libraryItemId: row.library_item_id,
    coachId: row.coach_id,
    teamId: row.team_id,
    playerId: row.player_id,
    createdAt: row.created_at,
    title: meta.title,
    kind: meta.kind,
    coachDisplayName: meta.coachDisplayName,
  };
}

export class SupabaseContentAssignmentRepository implements ContentAssignmentRepository {
  constructor(private readonly client: SupabaseClient) {}

  private async requireUser(): Promise<User> {
    const { data, error } = await this.client.auth.getUser();
    if (error || !data.user) {
      throw new Error('unauthorized');
    }
    return data.user;
  }

  private async rosterPlayerIdsForCoach(coachId: string): Promise<string[]> {
    const { data: teams, error: teamError } = await this.client
      .from('teams')
      .select('id')
      .eq('created_by', coachId);
    if (teamError) {
      throw new Error(`content_assign_failed:${teamError.message}`);
    }

    const { data: coachRoster, error: coachRosterError } = await this.client
      .from('rosters')
      .select('team_id')
      .eq('profile_id', coachId)
      .in('roster_role', ['assistant_coach', 'manager'])
      .eq('status', 'active');
    if (coachRosterError) {
      throw new Error(`content_assign_failed:${coachRosterError.message}`);
    }

    const teamIds = [
      ...new Set([
        ...(teams ?? []).map((row) => row.id as string),
        ...(coachRoster ?? []).map((row) => row.team_id as string),
      ]),
    ];
    if (teamIds.length === 0) {
      return [];
    }

    const { data: members, error: memberError } = await this.client
      .from('rosters')
      .select('profile_id')
      .in('team_id', teamIds)
      .eq('roster_role', 'player')
      .eq('status', 'active');
    if (memberError) {
      throw new Error(`content_assign_failed:${memberError.message}`);
    }

    return [...new Set((members ?? []).map((row) => row.profile_id as string))];
  }

  async assign(coachId: string, input: AssignContentInput): Promise<ContentAssignment> {
    const user = await this.requireUser();
    if (user.id !== coachId) {
      throw new Error('unauthorized');
    }

    const parsed = assignContentInputSchema.parse(input);

    if (parsed.playerId) {
      const rosterIds = await this.rosterPlayerIdsForCoach(coachId);
      assertPlayerOnRosterForDistribution(parsed.playerId, rosterIds);
    }

    const { data, error } = await this.client
      .from('content_assignments')
      .insert({
        library_item_id: parsed.libraryItemId,
        coach_id: coachId,
        team_id: parsed.teamId ?? null,
        player_id: parsed.playerId ?? null,
      })
      .select(ASSIGNMENT_SELECT)
      .single();

    if (error || !data) {
      throw new Error(mapWriteError(error ?? { message: 'insert_failed' }, 'content_assign_failed'));
    }

    const { data: item } = await this.client
      .from('coach_library_items')
      .select('title, kind')
      .eq('id', data.library_item_id)
      .maybeSingle();

    const { data: coach } = await this.client
      .from('profiles')
      .select('display_name')
      .eq('id', coachId)
      .maybeSingle();

    return mapAssignmentRow(data, {
      title: item?.title ?? 'Assigned content',
      kind: (item?.kind as SessionContentKind) ?? 'drill',
      coachDisplayName: coach?.display_name ?? null,
    });
  }

  async listAssignedForPlayer(playerId: string): Promise<ContentAssignment[]> {
    const user = await this.requireUser();
    if (user.id !== playerId) {
      throw new Error('unauthorized');
    }

    const { data, error } = await this.client
      .from('content_assignments')
      .select(
        `
        ${ASSIGNMENT_SELECT},
        coach_library_items ( title, kind ),
        profiles!content_assignments_coach_id_fkey ( display_name )
      `,
      )
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`content_assign_load_failed:${error.message}`);
    }

    return (data ?? []).map((row) => {
      const itemRaw = (row as { coach_library_items?: unknown }).coach_library_items;
      const item = Array.isArray(itemRaw) ? itemRaw[0] : itemRaw;
      const coachRaw = (row as { profiles?: unknown }).profiles;
      const coach = Array.isArray(coachRaw) ? coachRaw[0] : coachRaw;
      return mapAssignmentRow(
        {
          id: row.id,
          library_item_id: row.library_item_id,
          coach_id: row.coach_id,
          team_id: row.team_id,
          player_id: row.player_id,
          created_at: row.created_at,
        },
        {
          title:
            item && typeof item === 'object' && 'title' in item
              ? String((item as { title: string }).title)
              : 'Assigned content',
          kind:
            item && typeof item === 'object' && 'kind' in item
              ? ((item as { kind: SessionContentKind }).kind)
              : 'drill',
          coachDisplayName:
            coach && typeof coach === 'object' && 'display_name' in coach
              ? ((coach as { display_name: string | null }).display_name)
              : null,
        },
      );
    });
  }
}
