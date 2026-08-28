import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clearChatHistory } from '../chatbot/chatbot-storage';
import {
  acceptInvitation,
  ApiError,
  changePassword,
  getProfile,
  login,
  logout,
  me,
  register,
  updateProfile,
  type AcceptInvitationInput,
  type AuthenticatedUser,
  type ChangePasswordInput,
  type LoginInput,
  type RegisterInput,
  type UpdateProfileInput,
} from '../../lib/api';

export const AUTH_QUERY_KEY = ['auth', 'me'];
export const PROFILE_QUERY_KEY = ['users', 'me'];

export function useMeQuery() {
  return useQuery<AuthenticatedUser | null>({
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

export function useProfileQuery() {
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: getProfile,
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => updateProfile(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, profile);
      queryClient.setQueryData(AUTH_QUERY_KEY, profile);
    },
  });
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => changePassword(input),
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      clearChatHistory();
    },
  });
}
