import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createIbanOption,
  deleteIbanOption,
  listIbanOptions,
  updateIbanOption,
  type IbanOptionInput,
} from '../../lib/api';

const IBAN_OPTIONS_QUERY_KEY = ['iban-options'];

export function useIbanOptionsQuery() {
  return useQuery({
    queryKey: IBAN_OPTIONS_QUERY_KEY,
    queryFn: () => listIbanOptions(),
  });
}

export function useCreateIbanOptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: IbanOptionInput) => createIbanOption(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: IBAN_OPTIONS_QUERY_KEY }),
  });
}

export function useUpdateIbanOptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: IbanOptionInput }) =>
      updateIbanOption(id, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: IBAN_OPTIONS_QUERY_KEY }),
  });
}

export function useDeleteIbanOptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteIbanOption(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: IBAN_OPTIONS_QUERY_KEY }),
  });
}
