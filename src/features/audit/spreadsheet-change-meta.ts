export interface SpreadsheetCellChangeEntry {
  cell: string;
  oldValue: string | null;
  newValue: string | null;
  oldBgColor: string | null;
  newBgColor: string | null;
  oldFontColor: string | null;
  newFontColor: string | null;
}

export interface SpreadsheetChangeMeta {
  spreadsheetName?: string;
  sheetName?: string;
  changeCount?: number;
  truncated?: boolean;
  forced?: boolean;
  changes: SpreadsheetCellChangeEntry[];
}

/** SPREADSHEET_CELLS_UPDATED denetim kaydinin meta'si mi? (meta.changes dizisi) */
export function isSpreadsheetChangeMeta(meta: unknown): meta is SpreadsheetChangeMeta {
  return (
    typeof meta === 'object' &&
    meta !== null &&
    Array.isArray((meta as { changes?: unknown }).changes)
  );
}
