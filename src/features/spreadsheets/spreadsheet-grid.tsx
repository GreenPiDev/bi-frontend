import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { createGridKeyDownHandler, type GridSelection } from './grid-keyboard';
import { buildColumnLayout, columnAt } from './spreadsheet-columns';
import {
  HEADER_HEIGHT,
  ROW_HEADER_WIDTH,
  ROW_HEIGHT,
  SpreadsheetGridCell,
} from './spreadsheet-grid-cell';
import { ColumnHeaders, RowHeaders } from './spreadsheet-grid-headers';
import { SpreadsheetCellInput } from './spreadsheet-cell-input';
import { cellKey, normalizeRange, type CellContent } from './spreadsheet-model';
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
  /** { "<col>": px } - tum kullanicilar icin ortak sutun genislikleri. */
  colWidths?: Record<string, number>;
  onColumnResize?: (col: number, width: number) => void;
  onColumnAutoFit?: (col: number) => void;
}

const NO_WIDTHS: Record<string, number> = {};

function visibleRowRange(offset: number, size: number, count: number) {
  const first = Math.max(0, Math.floor(offset / ROW_HEIGHT) - OVERSCAN);
  const last = Math.min(count - 1, Math.ceil((offset + size) / ROW_HEIGHT) + OVERSCAN);
  return { first, last };
}

function visibleColRange(offsets: number[], offset: number, size: number, count: number) {
  const first = Math.max(0, columnAt(offsets, offset) - OVERSCAN);
  const last = Math.min(count - 1, columnAt(offsets, offset + size) + OVERSCAN);
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
  const colWidths = props.colWidths ?? NO_WIDTHS;
  // Surukleme sirasinda canli onizleme; birakinca kaydedilir (onColumnResize).
  const [resizePreview, setResizePreview] = useState<{ col: number; width: number } | null>(null);
  const layout = useMemo(
    () =>
      buildColumnLayout(
        cols,
        resizePreview ? { ...colWidths, [resizePreview.col]: resizePreview.width } : colWidths,
      ),
    [cols, colWidths, resizePreview],
  );
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
    const left = layout.offsets[col] ?? 0;
    const width = layout.widths[col] ?? 0;
    if (top < body.scrollTop) body.scrollTop = top;
    else if (top + ROW_HEIGHT > body.scrollTop + body.clientHeight)
      body.scrollTop = top + ROW_HEIGHT - body.clientHeight;
    if (left < body.scrollLeft) body.scrollLeft = left;
    else if (left + width > body.scrollLeft + body.clientWidth)
      body.scrollLeft = left + width - body.clientWidth;
    // Yalnizca secim degisince kaydir - baskasi sutun genisligini degistirince degil.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const rowRange = visibleRowRange(scroll.top, viewport.height, rows);
  const colRange = visibleColRange(layout.offsets, scroll.left, viewport.width, cols);
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
          left={layout.offsets[col]}
          width={layout.widths[col]}
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

  return (
    <div className="relative h-[calc(100vh-330px)] min-h-[360px] overflow-hidden rounded-lg border border-app-border bg-white">
      <div
        className="absolute top-0 left-0 z-20 border-r border-b border-app-border bg-app-bg"
        style={{ width: ROW_HEADER_WIDTH, height: HEADER_HEIGHT }}
      />
      <ColumnHeaders
        first={colRange.first}
        last={colRange.last}
        layout={layout}
        activeLeft={range.left}
        activeRight={range.right}
        scrollLeft={scroll.left}
        canResize={canEdit && Boolean(props.onColumnResize)}
        onResizePreview={(col, width) => setResizePreview(width === null ? null : { col, width })}
        onResizeCommit={(col, width) => props.onColumnResize?.(col, width)}
        onAutoFit={(col) => props.onColumnAutoFit?.(col)}
      />
      <RowHeaders
        first={rowRange.first}
        last={rowRange.last}
        activeTop={range.top}
        activeBottom={range.bottom}
        scrollTop={scroll.top}
      />
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
        <div
          className="relative"
          style={{ width: layout.offsets[cols], height: rows * ROW_HEIGHT }}
        >
          {cells}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute border-2 border-app-brand bg-app-brand/10"
            style={{
              top: range.top * ROW_HEIGHT - 1,
              left: layout.offsets[range.left] - 1,
              width: layout.offsets[range.right + 1] - layout.offsets[range.left] + 1,
              height: (range.bottom - range.top + 1) * ROW_HEIGHT + 1,
            }}
          />
          {editing && (
            <SpreadsheetCellInput
              row={editing.row}
              col={editing.col}
              text={editing.text}
              left={layout.offsets[editing.col]}
              width={layout.widths[editing.col]}
              onChange={(text) => updateEditing({ ...editing, text })}
              onFinish={finishEdit}
            />
          )}
        </div>
      </div>
    </div>
  );
}
