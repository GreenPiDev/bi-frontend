import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { createGridKeyDownHandler, type GridSelection } from './grid-keyboard';
import {
  COL_WIDTH,
  HEADER_HEIGHT,
  ROW_HEADER_WIDTH,
  ROW_HEIGHT,
  SpreadsheetGridCell,
} from './spreadsheet-grid-cell';
import { cellKey, columnLetter, normalizeRange, type CellContent } from './spreadsheet-model';
import type { CellConflictInfo } from './use-spreadsheet-editor';

const OVERSCAN = 4;
const FALLBACK_VIEWPORT = { width: 960, height: 480 };

interface EditingState {
  row: number;
  col: number;
  text: string;
}

interface SpreadsheetGridProps {
  rows: number;
  cols: number;
  canEdit: boolean;
  selection: GridSelection;
  getCell: (row: number, col: number) => CellContent;
  isDraft: (row: number, col: number) => boolean;
  conflicts: Map<string, CellConflictInfo>;
  onSelectionChange: (selection: GridSelection) => void;
  onCommitValue: (row: number, col: number, value: string) => void;
  onClearSelection: () => void;
}

function visibleRange(offset: number, size: number, itemSize: number, count: number) {
  const first = Math.max(0, Math.floor(offset / itemSize) - OVERSCAN);
  const last = Math.min(count - 1, Math.ceil((offset + size) / itemSize) + OVERSCAN);
  return { first, last };
}

/**
 * Excel benzeri, satir+sutun sanallastirmali ızgara. Sabit hucre boyutlari sayesinde
 * yeni bir bagimlilik eklemeden on binlerce satirda yalnizca gorunen hucreler render
 * edilir. Baslik seritleri govdenin scroll'una transform ile senkronlanir.
 */
export function SpreadsheetGrid(props: SpreadsheetGridProps) {
  const { rows, cols, canEdit, selection, getCell, isDraft, conflicts } = props;
  const { onSelectionChange, onCommitValue } = props;
  const bodyRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [scroll, setScroll] = useState({ top: 0, left: 0 });
  const [viewport, setViewport] = useState(FALLBACK_VIEWPORT);
  const [editing, setEditing] = useState<EditingState | null>(null);
  // Hem Enter/Escape hem blur ayni duzenlemeyi bitirmeye calisabilir; ilk gelen kazanir
  // (Escape sonrasi gelen blur'un degeri yine de kaydetmesini engeller).
  const editingRef = useRef<EditingState | null>(null);
  const updateEditing = useCallback((next: EditingState | null) => {
    editingRef.current = next;
    setEditing(next);
  }, []);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      setViewport({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(body);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const stopDrag = () => {
      draggingRef.current = false;
    };
    document.addEventListener('mouseup', stopDrag);
    return () => document.removeEventListener('mouseup', stopDrag);
  }, []);

  // Secili hucre gorunur alanin disina ciktiysa (klavye ile gezinme) scroll'u kaydir.
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const { row, col } = selection.focus;
    const top = row * ROW_HEIGHT;
    const left = col * COL_WIDTH;
    if (top < body.scrollTop) body.scrollTop = top;
    else if (top + ROW_HEIGHT > body.scrollTop + body.clientHeight)
      body.scrollTop = top + ROW_HEIGHT - body.clientHeight;
    if (left < body.scrollLeft) body.scrollLeft = left;
    else if (left + COL_WIDTH > body.scrollLeft + body.clientWidth)
      body.scrollLeft = left + COL_WIDTH - body.clientWidth;
  }, [selection.focus]);

  const handleMouseDown = useCallback(
    (row: number, col: number, shiftKey: boolean) => {
      draggingRef.current = true;
      // Hucre mousedown'i preventDefault yaptigi icin input blur olmaz - acik
      // duzenleme burada kaydedilir.
      const open = editingRef.current;
      if (open) {
        updateEditing(null);
        onCommitValue(open.row, open.col, open.text);
      }
      bodyRef.current?.focus({ preventScroll: true });
      const focus = { row, col };
      onSelectionChange(shiftKey ? { anchor: selection.anchor, focus } : { anchor: focus, focus });
    },
    [onSelectionChange, onCommitValue, selection.anchor, updateEditing],
  );

  const handleMouseEnter = useCallback(
    (row: number, col: number) => {
      if (draggingRef.current) onSelectionChange({ anchor: selection.anchor, focus: { row, col } });
    },
    [onSelectionChange, selection.anchor],
  );

  const startEdit = useCallback(
    (row: number, col: number, initialText?: string) => {
      if (!canEdit) return;
      updateEditing({ row, col, text: initialText ?? getCell(row, col).value ?? '' });
    },
    [canEdit, getCell, updateEditing],
  );

  const handleDoubleClick = useCallback(
    (row: number, col: number) => startEdit(row, col),
    [startEdit],
  );

  function finishEdit(commit: boolean, move?: [number, number]) {
    const open = editingRef.current;
    if (!open) return;
    updateEditing(null);
    if (commit) onCommitValue(open.row, open.col, open.text);
    if (move) {
      const next = {
        row: Math.min(rows - 1, Math.max(0, open.row + move[0])),
        col: Math.min(cols - 1, Math.max(0, open.col + move[1])),
      };
      onSelectionChange({ anchor: next, focus: next });
    }
    bodyRef.current?.focus({ preventScroll: true });
  }

  // Isleyici olay aninda olusturulur (render sirasinda degil) - startEdit bir ref'e
  // yazdigi icin React Compiler render'da cagrilmasina izin vermiyor.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    createGridKeyDownHandler({
      selection,
      rows,
      cols,
      canEdit,
      onSelectionChange,
      onStartEdit: (text) => startEdit(selection.focus.row, selection.focus.col, text),
      onClearSelection: props.onClearSelection,
    })(event);
  }

  const rowRange = visibleRange(scroll.top, viewport.height, ROW_HEIGHT, rows);
  const colRange = visibleRange(scroll.left, viewport.width, COL_WIDTH, cols);
  const range = normalizeRange(selection.anchor, selection.focus);

  const cells = [];
  for (let row = rowRange.first; row <= rowRange.last; row++) {
    for (let col = colRange.first; col <= colRange.last; col++) {
      const content = getCell(row, col);
      cells.push(
        <SpreadsheetGridCell
          key={cellKey(row, col)}
          row={row}
          col={col}
          value={content.value}
          bgColor={content.bgColor}
          fontColor={content.fontColor}
          isDraft={isDraft(row, col)}
          conflict={conflicts.get(cellKey(row, col))}
          onMouseDown={handleMouseDown}
          onMouseEnter={handleMouseEnter}
          onDoubleClick={handleDoubleClick}
        />,
      );
    }
  }

  const colHeaders = [];
  for (let col = colRange.first; col <= colRange.last; col++) {
    const active = col >= range.left && col <= range.right;
    colHeaders.push(
      <div
        key={col}
        className={`absolute top-0 border-r border-app-border text-center text-xs leading-[28px] font-semibold ${active ? 'bg-app-brand/15 text-app-brand' : 'text-app-muted'}`}
        style={{ left: col * COL_WIDTH, width: COL_WIDTH, height: HEADER_HEIGHT }}
      >
        {columnLetter(col)}
      </div>,
    );
  }

  const rowHeaders = [];
  for (let row = rowRange.first; row <= rowRange.last; row++) {
    const active = row >= range.top && row <= range.bottom;
    rowHeaders.push(
      <div
        key={row}
        className={`absolute left-0 border-b border-app-border text-center text-xs leading-[28px] font-semibold ${active ? 'bg-app-brand/15 text-app-brand' : 'text-app-muted'}`}
        style={{ top: row * ROW_HEIGHT, width: ROW_HEADER_WIDTH, height: ROW_HEIGHT }}
      >
        {row + 1}
      </div>,
    );
  }

  return (
    <div className="relative h-[calc(100vh-330px)] min-h-[360px] overflow-hidden rounded-lg border border-app-border bg-white">
      <div
        className="absolute top-0 left-0 z-20 border-r border-b border-app-border bg-app-bg"
        style={{ width: ROW_HEADER_WIDTH, height: HEADER_HEIGHT }}
      />
      <div
        className="absolute top-0 right-0 z-10 overflow-hidden border-b border-app-border bg-app-bg"
        style={{ left: ROW_HEADER_WIDTH, height: HEADER_HEIGHT }}
      >
        <div className="relative" style={{ transform: `translateX(${-scroll.left}px)` }}>
          {colHeaders}
        </div>
      </div>
      <div
        className="absolute bottom-0 left-0 z-10 overflow-hidden border-r border-app-border bg-app-bg"
        style={{ top: HEADER_HEIGHT, width: ROW_HEADER_WIDTH }}
      >
        <div className="relative" style={{ transform: `translateY(${-scroll.top}px)` }}>
          {rowHeaders}
        </div>
      </div>
      <div
        ref={bodyRef}
        role="grid"
        aria-rowcount={rows}
        aria-colcount={cols}
        tabIndex={0}
        onKeyDown={editing ? undefined : handleKeyDown}
        onScroll={(event) =>
          setScroll({ top: event.currentTarget.scrollTop, left: event.currentTarget.scrollLeft })
        }
        className="absolute right-0 bottom-0 overflow-auto outline-none"
        style={{ top: HEADER_HEIGHT, left: ROW_HEADER_WIDTH }}
      >
        <div className="relative" style={{ width: cols * COL_WIDTH, height: rows * ROW_HEIGHT }}>
          {cells}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute border-2 border-app-brand bg-app-brand/10"
            style={{
              top: range.top * ROW_HEIGHT - 1,
              left: range.left * COL_WIDTH - 1,
              width: (range.right - range.left + 1) * COL_WIDTH + 1,
              height: (range.bottom - range.top + 1) * ROW_HEIGHT + 1,
            }}
          />
          {editing && (
            <input
              autoFocus
              aria-label={`${columnLetter(editing.col)}${editing.row + 1}`}
              value={editing.text}
              onChange={(event) => updateEditing({ ...editing, text: event.target.value })}
              onBlur={() => finishEdit(true)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  finishEdit(true, [1, 0]);
                } else if (event.key === 'Tab') {
                  event.preventDefault();
                  finishEdit(true, [0, event.shiftKey ? -1 : 1]);
                } else if (event.key === 'Escape') {
                  event.preventDefault();
                  finishEdit(false);
                }
              }}
              className="absolute z-10 border-2 border-app-brand bg-white px-1.5 text-sm text-app-text shadow-lg outline-none"
              style={{
                top: editing.row * ROW_HEIGHT - 1,
                left: editing.col * COL_WIDTH - 1,
                minWidth: COL_WIDTH + 1,
                height: ROW_HEIGHT + 1,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
