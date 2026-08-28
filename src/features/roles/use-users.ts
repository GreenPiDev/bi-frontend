import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inviteUser, listUsers, updateUserRole, type InviteUserInput } from '../../lib/api';

const USERS_QUERY_KEY = ['users'];

export function useUsersQuery() {
  return useQuery({
    queryKey: USERS_QUERY_KEY,
    queryFn: () => listUsers(),
  });
}

export function useInviteUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InviteUserInput) => inviteUser(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY }),
  });
}

export function useUpdateUserRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleIds }: { userId: string; roleIds: string[] }) =>
      updateUserRole(userId, roleIds),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY }),
  });
}
