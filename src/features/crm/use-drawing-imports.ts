import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  commitDrawingImport,
  previewDrawingImportFromPdf,
  type DrawingImportCommitInput,
} from '../../lib/api';
import { DRAWINGS_QUERY_KEY } from './use-drawings';

export function useDrawingImportPreviewMutation() {
  return useMutation({
    mutationFn: ({ quoteId, file }: { quoteId: string; file: File }) =>
      previewDrawingImportFromPdf(quoteId, file),
  });
}

export function useDrawingImportCommitMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DrawingImportCommitInput) => commitDrawingImport(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: DRAWINGS_QUERY_KEY });
    },
  });
}
