import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createUser,
  getUserStats,
  listUsers,
  resetUserPassword,
  updateUserActive,
  updateUserRole,
  type CreateUserInput,
} from '../../lib/api';

const USERS_QUERY_KEY = ['users'];

export function useUsersQuery(includeInactive = false) {
  return useQuery({
    queryKey: [...USERS_QUERY_KEY, { includeInactive }],
    queryFn: () => listUsers(includeInactive),
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

export function useUserStatsQuery(userId: string) {
  return useQuery({
    queryKey: ['user-stats', userId],
    queryFn: () => getUserStats(userId),
    enabled: !!userId,
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

export function useUpdateUserActiveMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      updateUserActive(userId, isActive),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY }),
  });
}
