import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createReport,
  deleteReport,
  listReports,
  updateReport,
  type CreateReportInput,
  type UpdateReportInput,
} from '../../lib/api';

const REPORTS_QUERY_KEY = ['reports'];

export function useReportsQuery() {
  return useQuery({
    queryKey: REPORTS_QUERY_KEY,
    queryFn: () => listReports(),
  });
}

export function useCreateReportMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReportInput) => createReport(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: REPORTS_QUERY_KEY }),
  });
}

export function useUpdateReportMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateReportInput }) =>
      updateReport(id, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: REPORTS_QUERY_KEY }),
  });
}

export function useDeleteReportMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteReport(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: REPORTS_QUERY_KEY }),
  });
}
