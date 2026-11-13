import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  previewQuoteImportMapped,
  previewQuoteImportRaw,
  importQuoteItems,
  runQuoteImport,
  type NumberFormat,
} from '../../lib/api';
import { PRODUCT_LISTS_QUERY_KEY } from './use-product-lists';
import { PRODUCTS_QUERY_KEY } from './use-products';
import { QUOTES_QUERY_KEY } from './use-quotes';

export function usePreviewQuoteImportRawMutation() {
  return useMutation({
    mutationFn: (file: File) => previewQuoteImportRaw(file),
  });
}

export function usePreviewQuoteImportMappedMutation() {
  return useMutation({
    mutationFn: ({ file, headerRowIndex }: { file: File; headerRowIndex: number }) =>
      previewQuoteImportMapped(file, headerRowIndex),
  });
}

export function useRunQuoteImportMutation() {
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
    }) => runQuoteImport(file, headerRowIndex, mapping, attributeColumns, numberFormat),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUOTES_QUERY_KEY });
    },
  });
}

/** /teklifler/yeni "Excel'den İçe Aktar" - eşleşmeyen ürünler için backend yeni bir
 * ürün listesi + ürünler oluşturabildiği için ikisinin cache'i de tazelenir. */
export function useImportQuoteItemsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => importQuoteItems(file),
    onSuccess: (result) => {
      if (result.productList) {
        void queryClient.invalidateQueries({ queryKey: PRODUCT_LISTS_QUERY_KEY });
        void queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      }
    },
  });
}
