import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  exportEntity,
  previewAccountImportMapped,
  previewAccountImportRaw,
  previewImport,
  previewInteractionImportMapped,
  previewInteractionImportRaw,
  runAccountImport,
  runImport,
  runInteractionImport,
  type ImportEntity,
} from '../../lib/api';
import { ACCOUNTS_QUERY_KEY } from './use-accounts';
import { CONTACTS_QUERY_KEY } from './use-contacts';
import { INTERACTIONS_QUERY_KEY } from './use-interactions';

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

export function usePreviewAccountImportRawMutation() {
  return useMutation({
    mutationFn: (file: File) => previewAccountImportRaw(file),
  });
}

export function usePreviewAccountImportMappedMutation() {
  return useMutation({
    mutationFn: ({ file, headerRowIndex }: { file: File; headerRowIndex: number }) =>
      previewAccountImportMapped(file, headerRowIndex),
  });
}

export function useRunAccountImportMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      headerRowIndex,
      mapping,
      attributeColumns,
    }: {
      file: File;
      headerRowIndex: number;
      mapping: Record<string, string>;
      attributeColumns: string[];
    }) => runAccountImport(file, headerRowIndex, mapping, attributeColumns),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
    },
  });
}

export function usePreviewInteractionImportRawMutation() {
  return useMutation({
    mutationFn: (file: File) => previewInteractionImportRaw(file),
  });
}

export function usePreviewInteractionImportMappedMutation() {
  return useMutation({
    mutationFn: ({ file, headerRowIndex }: { file: File; headerRowIndex: number }) =>
      previewInteractionImportMapped(file, headerRowIndex),
  });
}

export function useRunInteractionImportMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      headerRowIndex,
      mapping,
      attributeColumns,
    }: {
      file: File;
      headerRowIndex: number;
      mapping: Record<string, string>;
      attributeColumns: string[];
    }) => runInteractionImport(file, headerRowIndex, mapping, attributeColumns),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: INTERACTIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
    },
  });
}
