import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAccount,
  deleteAccount,
  getAccount,
  listAccounts,
  updateAccount,
  type AccountInput,
} from '../../lib/api';

export const ACCOUNTS_QUERY_KEY = ['accounts'];

export function useAccountsQuery(params: { page?: number; q?: string } = {}) {
  return useQuery({
    queryKey: [...ACCOUNTS_QUERY_KEY, params],
    queryFn: () => listAccounts(params),
  });
}

export function useAccountQuery(id: string) {
  return useQuery({
    queryKey: ['accounts', id],
    queryFn: () => getAccount(id),
    enabled: Boolean(id),
  });
}

export function useCreateAccountMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AccountInput) => createAccount(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
    },
  });
}

export function useUpdateAccountMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<AccountInput>) => updateAccount(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['accounts', id] });
    },
  });
}

export function useDeleteAccountMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAccount(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
    },
  });
}
