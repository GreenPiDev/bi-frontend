import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteSpreadsheet,
  getSpreadsheet,
  getSpreadsheetCells,
  listSpreadsheets,
  renameSpreadsheet,
  saveSpreadsheetChanges,
  uploadSpreadsheet,
  type SpreadsheetCellChange,
} from '../../lib/api';

export const SPREADSHEETS_QUERY_KEY = ['spreadsheets'] as const;

export function spreadsheetCellsQueryKey(id: string, sheetId: string) {
  return ['spreadsheets', id, 'sheets', sheetId, 'cells'] as const;
}

export function useSpreadsheetsQuery(params: { page: number; pageSize: number; q?: string }) {
  return useQuery({
    queryKey: [...SPREADSHEETS_QUERY_KEY, 'list', params],
    queryFn: () => listSpreadsheets(params),
    placeholderData: keepPreviousData,
  });
}

/** Denetim kaydi filtresindeki "Tablo" secicisi icin - tum listeyi (ilk 100) getirir. */
export function useAllSpreadsheetsQuery(enabled: boolean) {
  return useQuery({
    queryKey: [...SPREADSHEETS_QUERY_KEY, 'all'],
    queryFn: () => listSpreadsheets({ page: 1, pageSize: 100 }),
    enabled,
  });
}

export function useSpreadsheetQuery(id: string) {
  return useQuery({
    queryKey: [...SPREADSHEETS_QUERY_KEY, id],
    queryFn: () => getSpreadsheet(id),
    enabled: Boolean(id),
  });
}

export function useSpreadsheetCellsQuery(id: string, sheetId: string | undefined) {
  return useQuery({
    queryKey: spreadsheetCellsQueryKey(id, sheetId ?? ''),
    queryFn: () => getSpreadsheetCells(id, sheetId ?? ''),
    enabled: Boolean(id && sheetId),
    // Hucre verisi websocket ile guncel tutuluyor; arka planda yeniden cekmek
    // kullanicinin taslaklarini etkilemez ama gereksiz yuk olur.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

export function useUploadSpreadsheetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadSpreadsheet,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SPREADSHEETS_QUERY_KEY }),
  });
}

export function useRenameSpreadsheetMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => renameSpreadsheet(id, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SPREADSHEETS_QUERY_KEY }),
  });
}

export function useDeleteSpreadsheetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSpreadsheet,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SPREADSHEETS_QUERY_KEY }),
  });
}

export function useSaveSpreadsheetChangesMutation(id: string, sheetId: string) {
  return useMutation({
    mutationFn: (input: { changes: SpreadsheetCellChange[]; force?: boolean }) =>
      saveSpreadsheetChanges(id, sheetId, input),
  });
}
