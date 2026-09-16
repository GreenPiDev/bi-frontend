import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDepartmentOption,
  deleteDepartmentOption,
  listDepartmentOptions,
} from '../../lib/api';

const DEPARTMENT_OPTIONS_QUERY_KEY = ['department-options'];

export function useDepartmentOptionsQuery() {
  return useQuery({
    queryKey: DEPARTMENT_OPTIONS_QUERY_KEY,
    queryFn: () => listDepartmentOptions(),
  });
}

export function useCreateDepartmentOptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (label: string) => createDepartmentOption(label),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: DEPARTMENT_OPTIONS_QUERY_KEY }),
  });
}

export function useDeleteDepartmentOptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDepartmentOption(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: DEPARTMENT_OPTIONS_QUERY_KEY }),
  });
}
