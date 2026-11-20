import type { SpreadsheetCompactCell } from '../../lib/api';

export interface CellContent {
  value: string | null;
  bgColor: string | null;
  fontColor: string | null;
}

export interface ServerCell extends CellContent {
  version: number;
}

export interface CellPosition {
  row: number;
  col: number;
}

export interface CellRange {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

export const EMPTY_CELL: CellContent = { value: null, bgColor: null, fontColor: null };

export function cellKey(row: number, col: number): string {
  return `${row}:${col}`;
}

export function parseCellKey(key: string): CellPosition {
  const [row, col] = key.split(':').map(Number);
  return { row, col };
}

/** 0-based sutun indeksi -> Excel harfi (0 -> A, 26 -> AA). Backend'deki columnLetter
 * ile ayni (repolar arasi kasitli tekrar, bkz. CLAUDE.md §3). */
export function columnLetter(col: number): string {
  let n = col + 1;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

export function cellAddress(row: number, col: number): string {
  return `${columnLetter(col)}${row + 1}`;
}

export function rangeAddress(range: CellRange): string {
  const start = cellAddress(range.top, range.left);
  if (range.top === range.bottom && range.left === range.right) return start;
  return `${start}:${cellAddress(range.bottom, range.right)}`;
}

export function normalizeRange(a: CellPosition, b: CellPosition): CellRange {
  return {
    top: Math.min(a.row, b.row),
    left: Math.min(a.col, b.col),
    bottom: Math.max(a.row, b.row),
    right: Math.max(a.col, b.col),
  };
}

export function buildCellMap(cells: SpreadsheetCompactCell[]): Map<string, ServerCell> {
  const map = new Map<string, ServerCell>();
  for (const [row, col, value, bgColor, fontColor, version] of cells) {
    map.set(cellKey(row, col), { value, bgColor, fontColor, version });
  }
  return map;
}

/** Sunucudan gelen (kaydet yaniti / websocket) hucreleri mevcut kompakt listeye uygular.
 * Gelen hucrenin surumu mevcuttan eskiyse yok sayilir (gec gelen websocket olayi). */
export function mergeCompactCells(
  current: SpreadsheetCompactCell[],
  incoming: SpreadsheetCompactCell[],
): SpreadsheetCompactCell[] {
  const byKey = new Map(current.map((c) => [cellKey(c[0], c[1]), c]));
  for (const cell of incoming) {
    const key = cellKey(cell[0], cell[1]);
    const existing = byKey.get(key);
    if (!existing || existing[5] <= cell[5]) byKey.set(key, cell);
  }
  return [...byKey.values()];
}

export function sameContent(a: CellContent, b: CellContent): boolean {
  return a.value === b.value && a.bgColor === b.bgColor && a.fontColor === b.fontColor;
}

export function contentOf(cell: CellContent | undefined): CellContent {
  return cell
    ? { value: cell.value, bgColor: cell.bgColor, fontColor: cell.fontColor }
    : EMPTY_CELL;
}
