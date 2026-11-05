import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  browseBrandOptions,
  createBrandOption,
  deleteBrandOption,
  listBrandOptions,
  updateBrandOption,
} from '../../lib/api';

const BRAND_OPTIONS_QUERY_KEY = ['brand-options'];

export function useBrandOptionsQuery() {
  return useQuery({
    queryKey: BRAND_OPTIONS_QUERY_KEY,
    queryFn: () => listBrandOptions(),
  });
}

/** Infinite-scroll dropdown'ı için sayfalı + aramalı marka listesi. Sorgu anahtarı
 * `BRAND_OPTIONS_QUERY_KEY` ile başladığından, marka ekleme/güncelleme/silme ve
 * realtime invalidasyonu bunu da otomatik yeniler. */
export function useBrandOptionsBrowseQuery(q: string, pageSize: number) {
  return useInfiniteQuery({
    queryKey: [...BRAND_OPTIONS_QUERY_KEY, 'browse', q, pageSize],
    queryFn: ({ pageParam }) =>
      browseBrandOptions({ page: pageParam, pageSize, q: q || undefined }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.totalPages ? lastPage.meta.page + 1 : undefined,
  });
}

export function useCreateBrandOptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (label: string) => createBrandOption(label),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: BRAND_OPTIONS_QUERY_KEY }),
  });
}

export function useUpdateBrandOptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, label }: { id: string; label: string }) => updateBrandOption(id, label),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: BRAND_OPTIONS_QUERY_KEY }),
  });
}

export function useDeleteBrandOptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBrandOption(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: BRAND_OPTIONS_QUERY_KEY }),
  });
}
