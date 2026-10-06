import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  exportEntity,
  type ExportFormat,
  previewAccountImportMapped,
  previewAccountImportRaw,
  previewContactImportMapped,
  previewContactImportRaw,
  previewInteractionImportMapped,
  previewInteractionImportRaw,
  runAccountImport,
  runContactImport,
  runInteractionImport,
  type ImportEntity,
} from '../../lib/api';
import { ACCOUNTS_QUERY_KEY } from './use-accounts';
import { CONTACTS_QUERY_KEY } from './use-contacts';
import { INTERACTIONS_QUERY_KEY } from './use-interactions';

export function useExportEntityMutation(entity: ImportEntity) {
  return useMutation({
    mutationFn: (format: ExportFormat) => exportEntity(entity, format),
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

export function usePreviewContactImportRawMutation() {
  return useMutation({
    mutationFn: (file: File) => previewContactImportRaw(file),
  });
}

export function usePreviewContactImportMappedMutation() {
  return useMutation({
    mutationFn: ({ file, headerRowIndex }: { file: File; headerRowIndex: number }) =>
      previewContactImportMapped(file, headerRowIndex),
  });
}

export function useRunContactImportMutation() {
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
    }) => runContactImport(file, headerRowIndex, mapping, attributeColumns),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONTACTS_QUERY_KEY });
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
