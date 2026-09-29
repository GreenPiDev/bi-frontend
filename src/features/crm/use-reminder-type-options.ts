import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createReminderTypeOption,
  deleteReminderTypeOption,
  listReminderTypeOptions,
  updateReminderTypeOption,
} from '../../lib/api';

const REMINDER_TYPE_OPTIONS_QUERY_KEY = ['reminder-type-options'];

export function useReminderTypeOptionsQuery() {
  return useQuery({
    queryKey: REMINDER_TYPE_OPTIONS_QUERY_KEY,
    queryFn: () => listReminderTypeOptions(),
  });
}

export function useCreateReminderTypeOptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (label: string) => createReminderTypeOption(label),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: REMINDER_TYPE_OPTIONS_QUERY_KEY }),
  });
}

export function useUpdateReminderTypeOptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, label }: { id: string; label: string }) =>
      updateReminderTypeOption(id, label),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: REMINDER_TYPE_OPTIONS_QUERY_KEY }),
  });
}

export function useDeleteReminderTypeOptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteReminderTypeOption(id),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: REMINDER_TYPE_OPTIONS_QUERY_KEY }),
  });
}
