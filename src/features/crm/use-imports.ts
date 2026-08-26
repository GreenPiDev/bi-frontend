import { useMutation, useQueryClient } from '@tanstack/react-query';
import { exportEntity, previewImport, runImport, type ImportEntity } from '../../lib/api';
import { ACCOUNTS_QUERY_KEY } from './use-accounts';
import { CONTACTS_QUERY_KEY } from './use-contacts';

export function usePreviewImportMutation() {
  return useMutation({
    mutationFn: (file: File) => previewImport(file),
  });
}

export function useRunImportMutation(entity: ImportEntity) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, mapping }: { file: File; mapping: Record<string, string> }) =>
      runImport(entity, file, mapping),
    onSuccess: () => {
      const key = entity === 'accounts' ? ACCOUNTS_QUERY_KEY : CONTACTS_QUERY_KEY;
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

export function useExportEntityMutation(entity: ImportEntity) {
  return useMutation({
    mutationFn: () => exportEntity(entity),
  });
}
