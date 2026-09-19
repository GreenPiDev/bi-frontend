import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  previewProductImportMapped,
  previewProductImportRaw,
  runProductImport,
  type NumberFormat,
} from '../../lib/api';
import { PRODUCTS_QUERY_KEY } from './use-products';

export function usePreviewProductImportRawMutation() {
  return useMutation({
    mutationFn: (file: File) => previewProductImportRaw(file),
  });
}

export function usePreviewProductImportMappedMutation() {
  return useMutation({
    mutationFn: ({ file, headerRowIndex }: { file: File; headerRowIndex: number }) =>
      previewProductImportMapped(file, headerRowIndex),
  });
}

export function useRunProductImportMutation(productListId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      headerRowIndex,
      mapping,
      attributeColumns,
      numberFormat,
    }: {
      file: File;
      headerRowIndex: number;
      mapping: Record<string, string>;
      attributeColumns: string[];
      numberFormat: NumberFormat;
    }) =>
      runProductImport(
        productListId,
        file,
        headerRowIndex,
        mapping,
        attributeColumns,
        numberFormat,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
    },
  });
}
