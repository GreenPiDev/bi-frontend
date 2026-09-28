import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  bulkMoveProducts,
  createProduct,
  deleteProduct,
  getProduct,
  getProductAttributeKeys,
  listProducts,
  updateProduct,
  type ProductInput,
} from '../../lib/api';

export const PRODUCTS_QUERY_KEY = ['products'];

export function useProductsQuery(
  params: {
    page?: number;
    pageSize?: number;
    q?: string;
    productListId?: string;
    brand?: string;
    category?: string;
    attr?: Record<string, string>;
  } = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: [...PRODUCTS_QUERY_KEY, params],
    queryFn: () => listProducts(params),
    enabled: options.enabled ?? true,
  });
}

export function useProductAttributeKeysQuery() {
  return useQuery({
    queryKey: ['products', 'attribute-keys'],
    queryFn: () => getProductAttributeKeys(),
  });
}

export function useProductQuery(id: string) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => getProduct(id),
    enabled: Boolean(id),
  });
}

export function useCreateProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProductInput) => createProduct(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
    },
  });
}

export function useUpdateProductMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<ProductInput>) => updateProduct(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['products', id] });
    },
  });
}

export function useDeleteProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
    },
  });
}

export function useBulkMoveProductsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      productIds,
      targetProductListId,
    }: {
      productIds: string[];
      targetProductListId: string;
    }) => bulkMoveProducts(productIds, targetProductListId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
    },
  });
}
