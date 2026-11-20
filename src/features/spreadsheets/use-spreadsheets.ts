import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import {
  deleteSpreadsheet,
  getSpreadsheet,
  getSpreadsheetCells,
  listSpreadsheets,
  renameSpreadsheet,
  saveSpreadsheetChanges,
  updateSpreadsheetColumnWidths,
  uploadSpreadsheet,
  type SpreadsheetCellChange,
  type SpreadsheetColumnsUpdatedEvent,
  type SpreadsheetDetail,
} from '../../lib/api';
import { useRealtimeEvent } from '../../lib/realtime';

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

type ColWidths = Record<string, number>;

function setSheetColWidths(
  queryClient: QueryClient,
  id: string,
  sheetId: string,
  update: (old: ColWidths) => ColWidths,
) {
  queryClient.setQueryData<SpreadsheetDetail>([...SPREADSHEETS_QUERY_KEY, id], (old) =>
    old
      ? {
          ...old,
          sheets: old.sheets.map((sheet) =>
            sheet.id === sheetId ? { ...sheet, colWidths: update(sheet.colWidths ?? {}) } : sheet,
          ),
        }
      : old,
  );
}

/** Sutun genisligi aninda kaydedilir; ekran beklemeden (iyimser) guncellenir, hata
 * olursa tablo sunucudan yeniden cekilir. */
export function useUpdateColumnWidthsMutation(id: string, sheetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (widths: { col: number; width: number | null }[]) =>
      updateSpreadsheetColumnWidths(id, sheetId, widths),
    onMutate: (widths) =>
      setSheetColWidths(queryClient, id, sheetId, (old) => {
        const next = { ...old };
        for (const { col, width } of widths) {
          if (width === null) delete next[String(col)];
          else next[String(col)] = width;
        }
        return next;
      }),
    onSuccess: (result) => setSheetColWidths(queryClient, id, sheetId, () => result.colWidths),
    onError: () => queryClient.invalidateQueries({ queryKey: [...SPREADSHEETS_QUERY_KEY, id] }),
  });
}

const COLUMNS_UPDATED_EVENT = 'spreadsheets.columns.updated';

/** Baska bir kullanici sutun genisligini degistirince tabloyu acik olan herkese yansir. */
export function useSpreadsheetColumnsRealtimeSync(id: string) {
  const queryClient = useQueryClient();
  useRealtimeEvent<SpreadsheetColumnsUpdatedEvent>(COLUMNS_UPDATED_EVENT, (event) => {
    if (event.spreadsheetId !== id) return;
    setSheetColWidths(queryClient, id, event.sheetId, () => event.colWidths);
  });
}
