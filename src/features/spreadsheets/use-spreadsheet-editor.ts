import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { useToast } from '../../components/ui/toast-context';
import {
  ApiError,
  type SpreadsheetCompactCell,
  type SpreadsheetConflict,
  type SpreadsheetCellsUpdatedEvent,
} from '../../lib/api';
import { useRealtimeEvent } from '../../lib/realtime';
import { tr } from '../../i18n/tr';
import { useMeQuery } from '../auth/use-auth';
import {
  buildCellMap,
  cellKey,
  contentOf,
  mergeCompactCells,
  parseCellKey,
  sameContent,
  type CellContent,
} from './spreadsheet-model';
import {
  spreadsheetCellsQueryKey,
  useSaveSpreadsheetChangesMutation,
  useSpreadsheetCellsQuery,
} from './use-spreadsheets';

/** baseVersion, hucre ILK duzenlendiginde sunucudaki surumdur - sonradan websocket ile
 * gelen bir guncelleme bunu degistirmez, boylece kaydette catisma dogru yakalanir. */
interface Draft {
  content: CellContent;
  baseVersion: number;
}

export interface CellUpdate {
  row: number;
  col: number;
  patch: Partial<CellContent>;
}

export interface CellConflictInfo {
  updatedByName: string;
  value: string | null;
}

const CELLS_UPDATED_EVENT = 'spreadsheets.cells.updated';

function isConflictList(details: unknown): details is { conflicts: SpreadsheetConflict[] } {
  return (
    typeof details === 'object' &&
    details !== null &&
    Array.isArray((details as { conflicts?: unknown }).conflicts)
  );
}

export function useSpreadsheetEditor(spreadsheetId: string, sheetId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const meId = useMeQuery().data?.id;
  const cellsQuery = useSpreadsheetCellsQuery(spreadsheetId, sheetId);
  const saveMutation = useSaveSpreadsheetChangesMutation(spreadsheetId, sheetId);
  const serverCells = useMemo(() => buildCellMap(cellsQuery.data ?? []), [cellsQuery.data]);
  const [drafts, setDrafts] = useState<Map<string, Draft>>(() => new Map());
  const [serverConflicts, setServerConflicts] = useState<SpreadsheetConflict[]>([]);
  const [remoteEditors, setRemoteEditors] = useState<Map<string, string>>(() => new Map());

  const applyServerCells = useCallback(
    (cells: SpreadsheetCompactCell[]) => {
      queryClient.setQueryData<SpreadsheetCompactCell[]>(
        spreadsheetCellsQueryKey(spreadsheetId, sheetId),
        (old) => mergeCompactCells(old ?? [], cells),
      );
    },
    [queryClient, spreadsheetId, sheetId],
  );

  useRealtimeEvent<SpreadsheetCellsUpdatedEvent>(CELLS_UPDATED_EVENT, (event) => {
    if (event.spreadsheetId !== spreadsheetId || event.sheetId !== sheetId) return;
    applyServerCells(event.cells);
    if (event.updatedById === meId) return;
    setRemoteEditors((prev) => {
      const next = new Map(prev);
      for (const [row, col] of event.cells) next.set(cellKey(row, col), event.updatedByName);
      return next;
    });
    toast.info(tr.spreadsheets.realtime.updated(event.updatedByName, event.cells.length));
  });

  const getCell = useCallback(
    (row: number, col: number): CellContent => {
      const key = cellKey(row, col);
      return drafts.get(key)?.content ?? contentOf(serverCells.get(key));
    },
    [drafts, serverCells],
  );

  const updateCells = useCallback(
    (updates: CellUpdate[]) => {
      setDrafts((prev) => {
        const next = new Map(prev);
        for (const { row, col, patch } of updates) {
          const key = cellKey(row, col);
          const server = serverCells.get(key);
          const existing = next.get(key);
          const content = { ...(existing?.content ?? contentOf(server)), ...patch };
          // Sunucudaki degere geri donulduyse taslak gereksiz (kaydetmek zaten no-op olurdu).
          if (sameContent(content, contentOf(server))) {
            next.delete(key);
          } else {
            next.set(key, { content, baseVersion: existing?.baseVersion ?? server?.version ?? 0 });
          }
        }
        return next;
      });
    },
    [serverCells],
  );

  /** Kaydedilmemis taslagi olup, o arada baskasi tarafindan kaydedilmis hucreler. */
  const conflicts = useMemo(() => {
    const map = new Map<string, CellConflictInfo>();
    for (const [key, draft] of drafts) {
      const server = serverCells.get(key);
      if ((server?.version ?? 0) !== draft.baseVersion) {
        map.set(key, {
          updatedByName: remoteEditors.get(key) ?? '—',
          value: server?.value ?? null,
        });
      }
    }
    for (const c of serverConflicts) {
      map.set(cellKey(c.row, c.col), { updatedByName: c.updatedByName, value: c.value });
    }
    return map;
  }, [drafts, serverCells, remoteEditors, serverConflicts]);

  function save(force = false) {
    const sent = new Map(drafts);
    const changes = [...sent].map(([key, draft]) => ({
      ...parseCellKey(key),
      ...draft.content,
      baseVersion: draft.baseVersion,
    }));
    if (changes.length === 0) return;
    saveMutation.mutate(
      { changes, force },
      {
        onSuccess: (result) => {
          applyServerCells(result.cells);
          setDrafts((prev) => {
            const next = new Map(prev);
            for (const [key, draft] of sent) {
              if (next.get(key) === draft) next.delete(key);
            }
            return next;
          });
          setServerConflicts([]);
          toast.success(tr.spreadsheets.toolbar.saveSuccess(result.savedCount));
        },
        onError: (error) => {
          if (error instanceof ApiError && error.code === 'SPREADSHEET_CONFLICT') {
            setServerConflicts(isConflictList(error.details) ? error.details.conflicts : []);
            return;
          }
          toast.error(
            error instanceof ApiError ? error.message : tr.spreadsheets.toolbar.saveError,
          );
        },
      },
    );
  }

  /** "Onunkini al": catisan hucrelerdeki taslaklari atar, sunucudaki guncel degeri gosterir. */
  function takeTheirs() {
    applyServerCells(
      serverConflicts.map((c) => [c.row, c.col, c.value, c.bgColor, c.fontColor, c.version]),
    );
    setDrafts((prev) => {
      const next = new Map(prev);
      for (const key of conflicts.keys()) next.delete(key);
      return next;
    });
    setServerConflicts([]);
  }

  function discard() {
    setDrafts(new Map());
    setServerConflicts([]);
  }

  return {
    cellsQuery,
    serverCells,
    drafts,
    conflicts,
    serverConflicts,
    getCell,
    updateCells,
    save,
    takeTheirs,
    keepMine: () => save(true),
    dismissConflicts: () => setServerConflicts([]),
    discard,
    isSaving: saveMutation.isPending,
    pendingCount: drafts.size,
  };
}

export type SpreadsheetEditor = ReturnType<typeof useSpreadsheetEditor>;
