import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clearChatHistory } from '../chatbot/chatbot-storage';
import {
  ApiError,
  changePassword,
  deleteAvatar,
  getProfile,
  login,
  logout,
  me,
  updateProfile,
  uploadAvatar,
  type AuthenticatedUser,
  type ChangePasswordInput,
  type LoginInput,
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

export function useUploadAvatarMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
    onSuccess: (profile) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, profile);
      void queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeleteAvatarMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteAvatar(),
    onSuccess: (profile) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, profile);
      void queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
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
