import { useEffect, useRef, type MouseEvent } from 'react';
import { tr } from '../../i18n/tr';
import { HEADER_HEIGHT, ROW_HEADER_WIDTH, ROW_HEIGHT } from './spreadsheet-grid-cell';
import { clampColWidth, type ColumnLayout } from './spreadsheet-columns';
import { columnLetter } from './spreadsheet-model';

const ACTIVE_CLASS = 'bg-app-brand/15 text-app-brand';
const HANDLE_WIDTH = 8;

interface ColumnHeadersProps {
  first: number;
  last: number;
  layout: ColumnLayout;
  activeLeft: number;
  activeRight: number;
  scrollLeft: number;
  canResize: boolean;
  /** Surukleme sirasinda canli onizleme (null = onizlemeyi kaldir). */
  onResizePreview: (col: number, width: number | null) => void;
  onResizeCommit: (col: number, width: number) => void;
  onAutoFit: (col: number) => void;
}

/**
 * Sutun basliklari + Excel'deki gibi sag kenardan genislik ayarlama: surukle =
 * istenen genislik, cift tikla = en uzun degere sigdir.
 */
export function ColumnHeaders(props: ColumnHeadersProps) {
  const { first, last, layout, activeLeft, activeRight, scrollLeft, canResize } = props;
  const cleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanupRef.current?.(), []);

  function startResize(event: MouseEvent<HTMLDivElement>, col: number) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = layout.widths[col];
    let width = startWidth;
    const onMove = (move: globalThis.MouseEvent) => {
      width = clampColWidth(startWidth + move.clientX - startX);
      props.onResizePreview(col, width);
    };
    const onUp = () => {
      cleanup();
      if (width !== startWidth) props.onResizeCommit(col, width);
      props.onResizePreview(col, null);
    };
    const cleanup = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      cleanupRef.current = null;
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    cleanupRef.current = cleanup;
  }

  const headers = [];
  for (let col = first; col <= last; col++) {
    const active = col >= activeLeft && col <= activeRight;
    headers.push(
      <div
        key={col}
        className={`absolute top-0 border-r border-app-border text-center text-xs leading-[28px] font-semibold ${active ? ACTIVE_CLASS : 'text-app-muted'}`}
        style={{ left: layout.offsets[col], width: layout.widths[col], height: HEADER_HEIGHT }}
      >
        {columnLetter(col)}
      </div>,
    );
    if (canResize) {
      headers.push(
        <div
          key={`resize-${col}`}
          role="separator"
          aria-orientation="vertical"
          aria-label={tr.spreadsheets.grid.resizeColumn(columnLetter(col))}
          title={tr.spreadsheets.grid.resizeHint}
          data-col-resize={col}
          onMouseDown={(event) => startResize(event, col)}
          onDoubleClick={() => props.onAutoFit(col)}
          className="absolute top-0 z-10 cursor-col-resize hover:bg-app-brand/40"
          style={{
            left: layout.offsets[col + 1] - HANDLE_WIDTH / 2,
            width: HANDLE_WIDTH,
            height: HEADER_HEIGHT,
          }}
        />,
      );
    }
  }

  return (
    <div
      className="absolute top-0 right-0 z-10 overflow-hidden border-b border-app-border bg-app-bg"
      style={{ left: ROW_HEADER_WIDTH, height: HEADER_HEIGHT }}
    >
      <div className="relative" style={{ transform: `translateX(${-scrollLeft}px)` }}>
        {headers}
      </div>
    </div>
  );
}

interface RowHeadersProps {
  first: number;
  last: number;
  activeTop: number;
  activeBottom: number;
  scrollTop: number;
}

export function RowHeaders({ first, last, activeTop, activeBottom, scrollTop }: RowHeadersProps) {
  const headers = [];
  for (let row = first; row <= last; row++) {
    const active = row >= activeTop && row <= activeBottom;
    headers.push(
      <div
        key={row}
        className={`absolute left-0 border-b border-app-border text-center text-xs leading-[28px] font-semibold ${active ? ACTIVE_CLASS : 'text-app-muted'}`}
        style={{ top: row * ROW_HEIGHT, width: ROW_HEADER_WIDTH, height: ROW_HEIGHT }}
      >
        {row + 1}
      </div>,
    );
  }
  return (
    <div
      className="absolute bottom-0 left-0 z-10 overflow-hidden border-r border-app-border bg-app-bg"
      style={{ top: HEADER_HEIGHT, width: ROW_HEADER_WIDTH }}
    >
      <div className="relative" style={{ transform: `translateY(${-scrollTop}px)` }}>
        {headers}
      </div>
    </div>
  );
}
