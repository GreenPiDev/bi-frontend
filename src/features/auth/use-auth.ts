import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acceptInvitation,
  ApiError,
  login,
  logout,
  me,
  register,
  type AcceptInvitationInput,
  type LoginInput,
  type RegisterInput,
  type SafeUser,
} from '../../lib/api';

export const AUTH_QUERY_KEY = ['auth', 'me'];

export function useMeQuery() {
  return useQuery<SafeUser | null>({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      try {
        return await me();
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          return null;
        }
        throw error;
      }
    },
    retry: false,
    staleTime: 60_000,
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => login(input),
    onSuccess: (result) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, result.user);
    },
  });
}

export function useRegisterMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) => register(input),
    onSuccess: (result) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, result.user);
    },
  });
}

export function useAcceptInvitationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ token, input }: { token: string; input: AcceptInvitationInput }) =>
      acceptInvitation(token, input),
    onSuccess: (result) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, result.user);
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
    },
  });
}
