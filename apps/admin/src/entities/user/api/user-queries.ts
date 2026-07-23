import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@coach360/api';
import type { UpdateUserInput } from '@coach360/api';

export const userListQueryKey = (search: string) => ['admin', 'users', search] as const;
export const userTeamsQueryKey = (userId: string) => ['admin', 'users', userId, 'teams'] as const;

export function useUserListQuery(search = '') {
  const repos = useRepositories();
  return useQuery({
    queryKey: userListQueryKey(search),
    queryFn: () => repos.users.list(search ? { search } : {}),
  });
}

export function useUserTeamsQuery(userId: string | null) {
  const repos = useRepositories();
  return useQuery({
    queryKey: userTeamsQueryKey(userId ?? ''),
    queryFn: () => repos.rosters.listMemberTeams(userId as string),
    enabled: userId !== null,
  });
}

export function useUpdateUserMutation() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; input: UpdateUserInput }) =>
      repos.users.updateUser(args.id, args.input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}
