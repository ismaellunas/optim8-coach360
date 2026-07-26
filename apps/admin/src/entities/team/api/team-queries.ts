import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@coach360/api';
import type { TeamProfileInput } from '@coach360/domain';

export const allTeamsQueryKey = ['admin', 'teams'] as const;
export const teamMembersQueryKey = (teamId: string) =>
  ['admin', 'teams', teamId, 'members'] as const;

export function useAllTeamsQuery() {
  const repos = useRepositories();
  return useQuery({
    queryKey: allTeamsQueryKey,
    queryFn: () => repos.teams.listAll(),
  });
}

export function useTeamMembersQuery(teamId: string | null) {
  const repos = useRepositories();
  return useQuery({
    queryKey: teamMembersQueryKey(teamId ?? ''),
    queryFn: () => repos.rosters.listMembers(teamId as string),
    enabled: teamId !== null,
  });
}

export function useAdminUpdateTeamMutation() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { teamId: string; input: TeamProfileInput }) =>
      repos.teams.adminUpdate(args.teamId, args.input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: allTeamsQueryKey });
    },
  });
}

export function useSetTeamArchivedMutation() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { teamId: string; archived: boolean }) =>
      repos.teams.setArchived(args.teamId, args.archived),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: allTeamsQueryKey });
    },
  });
}

export function useAdminAssignCoachMutation() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { teamId: string; email: string }) =>
      repos.rosters.adminAssignCoachByEmail(args.teamId, args.email),
    onSuccess: async (_data, args) => {
      await queryClient.invalidateQueries({ queryKey: teamMembersQueryKey(args.teamId) });
    },
  });
}

export function useAdminUnassignCoachMutation() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { teamId: string; profileId: string }) =>
      repos.rosters.adminUnassignCoach(args.teamId, args.profileId),
    onSuccess: async (_data, args) => {
      await queryClient.invalidateQueries({ queryKey: teamMembersQueryKey(args.teamId) });
    },
  });
}
