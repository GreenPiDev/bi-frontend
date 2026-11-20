/** Sutun genislikleri: varsayilan + tablo bazinda ortak override'lar (backend colWidths). */
export const DEFAULT_COL_WIDTH = 120;
export const MIN_COL_WIDTH = 30;
export const MAX_COL_WIDTH = 1000;
/** Otomatik sigdirmada metnin iki yanina eklenen bosluk (hucre px-1.5 + kenarlik). */
const AUTO_FIT_PADDING = 16;
const CELL_FONT = '14px ui-sans-serif, system-ui, sans-serif';

export interface ColumnLayout {
  widths: number[];
  /** offsets[i] = i. sutunun sol kenari; offsets[cols] = toplam genislik. */
  offsets: number[];
}

export function clampColWidth(width: number): number {
  return Math.round(Math.min(MAX_COL_WIDTH, Math.max(MIN_COL_WIDTH, width)));
}

export function buildColumnLayout(cols: number, colWidths: Record<string, number>): ColumnLayout {
  const widths = new Array<number>(cols);
  const offsets = new Array<number>(cols + 1);
  offsets[0] = 0;
  for (let col = 0; col < cols; col++) {
    widths[col] = colWidths[String(col)] ?? DEFAULT_COL_WIDTH;
    offsets[col + 1] = offsets[col] + widths[col];
  }
  return { widths, offsets };
}

/** x konumunu iceren sutun (ikili arama). */
export function columnAt(offsets: number[], x: number): number {
  let low = 0;
  let high = offsets.length - 2;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (offsets[mid] <= x) low = mid;
    else high = mid - 1;
  }
  return Math.max(0, low);
}

let measureContext: CanvasRenderingContext2D | null | undefined;

function textWidth(text: string): number {
  if (measureContext === undefined) {
    measureContext =
      typeof document === 'undefined'
        ? null
        : (document.createElement('canvas').getContext('2d') ?? null);
    if (measureContext) {
      const bodyFont =
        typeof getComputedStyle === 'function' ? getComputedStyle(document.body).fontFamily : '';
      measureContext.font = bodyFont ? `14px ${bodyFont}` : CELL_FONT;
    }
  }
  // Canvas yoksa (test ortami) karakter basina yaklasik 7.5 px.
  return measureContext ? measureContext.measureText(text).width : text.length * 7.5;
}

/** Excel'deki sutun kenarina cift tiklama: en uzun degere gore genislik. */
export function autoFitWidth(values: Iterable<string>): number {
  let max = 0;
  for (const value of values) {
    if (value) max = Math.max(max, textWidth(value));
  }
  return clampColWidth(max === 0 ? DEFAULT_COL_WIDTH : max + AUTO_FIT_PADDING);
}
