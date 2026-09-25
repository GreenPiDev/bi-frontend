import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createProductCategoryOption,
  deleteProductCategoryOption,
  listProductCategoryOptions,
  updateProductCategoryOption,
} from '../../lib/api';

const PRODUCT_CATEGORY_OPTIONS_QUERY_KEY = ['product-categories'];

export function useProductCategoryOptionsQuery() {
  return useQuery({
    queryKey: PRODUCT_CATEGORY_OPTIONS_QUERY_KEY,
    queryFn: () => listProductCategoryOptions(),
  });
}

export function useCreateProductCategoryOptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (label: string) => createProductCategoryOption(label),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: PRODUCT_CATEGORY_OPTIONS_QUERY_KEY }),
  });
}

export function useUpdateProductCategoryOptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, label }: { id: string; label: string }) =>
      updateProductCategoryOption(id, label),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: PRODUCT_CATEGORY_OPTIONS_QUERY_KEY }),
  });
}

export function useDeleteProductCategoryOptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProductCategoryOption(id),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: PRODUCT_CATEGORY_OPTIONS_QUERY_KEY }),
  });
}
