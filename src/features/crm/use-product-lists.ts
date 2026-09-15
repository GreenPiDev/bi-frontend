import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createProductList,
  deleteProductList,
  getProductList,
  listProductLists,
  updateProductList,
  type ProductListInput,
} from '../../lib/api';

export const PRODUCT_LISTS_QUERY_KEY = ['product-lists'];

export function useProductListsQuery(params: { page?: number; q?: string } = {}) {
  return useQuery({
    queryKey: [...PRODUCT_LISTS_QUERY_KEY, params],
    queryFn: () => listProductLists(params),
  });
}

export function useProductListQuery(id: string) {
  return useQuery({
    queryKey: ['product-lists', id],
    queryFn: () => getProductList(id),
    enabled: Boolean(id),
  });
}

export function useCreateProductListMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProductListInput) => createProductList(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PRODUCT_LISTS_QUERY_KEY });
    },
  });
}

export function useUpdateProductListMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<ProductListInput>) => updateProductList(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PRODUCT_LISTS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['product-lists', id] });
    },
  });
}

export function useDeleteProductListMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProductList(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PRODUCT_LISTS_QUERY_KEY });
    },
  });
}
