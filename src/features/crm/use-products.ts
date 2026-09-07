import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createProduct,
  deleteProduct,
  deleteProductImage,
  getProduct,
  listProducts,
  updateProduct,
  uploadProductImage,
  type ProductInput,
} from '../../lib/api';

export const PRODUCTS_QUERY_KEY = ['products'];

export function useProductsQuery(params: { page?: number; q?: string } = {}) {
  return useQuery({
    queryKey: [...PRODUCTS_QUERY_KEY, params],
    queryFn: () => listProducts(params),
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

export function useUploadProductImageMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadProductImage(id, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['products', id] });
    },
  });
}

export function useDeleteProductImageMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteProductImage(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['products', id] });
    },
  });
}
