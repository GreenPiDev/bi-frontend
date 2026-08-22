import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAlert,
  deleteAlert,
  listAlerts,
  updateAlert,
  type CreateAlertInput,
  type UpdateAlertInput,
} from '../../lib/api';

const ALERTS_QUERY_KEY = ['alerts'];

export function useAlertsQuery() {
  return useQuery({
    queryKey: ALERTS_QUERY_KEY,
    queryFn: () => listAlerts(),
  });
}

export function useCreateAlertMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAlertInput) => createAlert(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ALERTS_QUERY_KEY }),
  });
}

export function useUpdateAlertMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAlertInput }) => updateAlert(id, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ALERTS_QUERY_KEY }),
  });
}

export function useDeleteAlertMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAlert(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ALERTS_QUERY_KEY }),
  });
}
