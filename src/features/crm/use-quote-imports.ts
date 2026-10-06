import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  previewQuoteImportMapped,
  previewQuoteImportRaw,
  runQuoteImport,
  type NumberFormat,
} from '../../lib/api';
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
