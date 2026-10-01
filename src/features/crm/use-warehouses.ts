import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createWarehouse,
  deleteWarehouse,
  listWarehouses,
  updateWarehouse,
  type WarehouseInput,
} from '../../lib/api';

export const WAREHOUSES_QUERY_KEY = ['warehouses'];

export function useWarehousesQuery(params: { page?: number; pageSize?: number; q?: string } = {}) {
  return useQuery({
    queryKey: [...WAREHOUSES_QUERY_KEY, params],
    queryFn: () => listWarehouses(params),
  });
}

export function useCreateWarehouseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: WarehouseInput) => createWarehouse(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: WAREHOUSES_QUERY_KEY });
    },
  });
}

export function useUpdateWarehouseMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<WarehouseInput>) => updateWarehouse(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: WAREHOUSES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['warehouses', id] });
    },
  });
}

export function useDeleteWarehouseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWarehouse(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: WAREHOUSES_QUERY_KEY });
    },
  });
}
