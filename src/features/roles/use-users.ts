import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createUser,
  listUsers,
  resetUserPassword,
  updateUserRole,
  type CreateUserInput,
} from '../../lib/api';

const USERS_QUERY_KEY = ['users'];

export function useUsersQuery() {
  return useQuery({
    queryKey: USERS_QUERY_KEY,
    queryFn: () => listUsers(),
  });
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => createUser(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY }),
  });
}

export function useResetUserPasswordMutation() {
  return useMutation({
    mutationFn: (userId: string) => resetUserPassword(userId),
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
