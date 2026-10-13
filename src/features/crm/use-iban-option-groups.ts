import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createIbanOptionGroup,
  deleteIbanOptionGroup,
  listIbanOptionGroups,
  updateIbanOptionGroup,
  type IbanOptionGroupInput,
} from '../../lib/api';
import { IBAN_OPTIONS_QUERY_KEY } from './use-iban-options';

export const IBAN_OPTION_GROUPS_QUERY_KEY = ['iban-option-groups'];

export function useIbanOptionGroupsQuery() {
  return useQuery({
    queryKey: IBAN_OPTION_GROUPS_QUERY_KEY,
    queryFn: () => listIbanOptionGroups(),
  });
}

/** Grup CRUD'u sonrasi IBAN dropdown'u da tazelenmeli - grup adi degisikligi
 * veya silinmesi IbanOption.group uzerinden dropdown'a yansir (bkz.
 * iban-select.tsx). */
function invalidateIbanQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: IBAN_OPTION_GROUPS_QUERY_KEY });
  void queryClient.invalidateQueries({ queryKey: IBAN_OPTIONS_QUERY_KEY });
}

export function useCreateIbanOptionGroupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: IbanOptionGroupInput) => createIbanOptionGroup(input),
    onSuccess: () => invalidateIbanQueries(queryClient),
  });
}

export function useUpdateIbanOptionGroupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: IbanOptionGroupInput }) =>
      updateIbanOptionGroup(id, input),
    onSuccess: () => invalidateIbanQueries(queryClient),
  });
}

export function useDeleteIbanOptionGroupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteIbanOptionGroup(id),
    onSuccess: () => invalidateIbanQueries(queryClient),
  });
}
