import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@coach360/api';

export const userListQueryKey = ['admin', 'users'] as const;

export function useUserListQuery() {
  const repos = useRepositories();
  return useQuery({
    queryKey: userListQueryKey,
    queryFn: () => repos.users.list(),
  });
}
