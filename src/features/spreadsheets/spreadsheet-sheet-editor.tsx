import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConfirmModal } from '../../components/ui/confirm-modal';
import { useToast } from '../../components/ui/toast-context';
import type { SpreadsheetSheet } from '../../lib/api';
import { tr } from '../../i18n/tr';
import type { GridSelection } from './grid-keyboard';
import { SpreadsheetConflictModal } from './spreadsheet-conflict-modal';
import { SpreadsheetGrid } from './spreadsheet-grid';
import {
  cellKey,
  normalizeRange,
  parseCellKey,
  rangeAddress,
  type CellContent,
} from './spreadsheet-model';
import { SpreadsheetToolbar } from './spreadsheet-toolbar';
import { useSpreadsheetEditor, type CellUpdate } from './use-spreadsheet-editor';

/** Backend'in tek kayitta kabul ettigi ust sinirla ayni (MAX_CHANGES_PER_SAVE). */
const MAX_RANGE_CELLS = 5000;
const MAX_ROWS = 50_000;
const MAX_COLS = 200;
const EXTRA_ROWS = 50;
const EXTRA_COLS = 5;
const MIN_COLS = 26;
const MIN_ROWS = 100;

interface SpreadsheetSheetEditorProps {
  spreadsheetId: string;
  sheet: SpreadsheetSheet;
  canEdit: boolean;
  onDirtyChange: (dirty: boolean) => void;
}

export function SpreadsheetSheetEditor({
  spreadsheetId,
  sheet,
  canEdit,
  onDirtyChange,
}: SpreadsheetSheetEditorProps) {
  const toast = useToast();
  const editor = useSpreadsheetEditor(spreadsheetId, sheet.id);
  const [selection, setSelection] = useState<GridSelection>({
    anchor: { row: 0, col: 0 },
    focus: { row: 0, col: 0 },
  });
  const [discardOpen, setDiscardOpen] = useState(false);
  const { pendingCount } = editor;

  useEffect(() => onDirtyChange(pendingCount > 0), [pendingCount, onDirtyChange]);

  // Sayfa boyutu: kayitli/taslak en uzak hucre + kullanicinin yeni satir/sutun
  // doldurabilmesi icin bir miktar bos alan.
  const { serverCells, drafts, updateCells } = editor;
  const { rows, cols } = useMemo(() => {
    let maxRow = sheet.rowCount - 1;
    let maxCol = sheet.colCount - 1;
    for (const key of [...serverCells.keys(), ...drafts.keys()]) {
      const { row, col } = parseCellKey(key);
      if (row > maxRow) maxRow = row;
      if (col > maxCol) maxCol = col;
    }
    return {
      rows: Math.min(MAX_ROWS, Math.max(MIN_ROWS, maxRow + 1 + EXTRA_ROWS)),
      cols: Math.min(MAX_COLS, Math.max(MIN_COLS, maxCol + 1 + EXTRA_COLS)),
    };
  }, [serverCells, drafts, sheet.rowCount, sheet.colCount]);

  const range = normalizeRange(selection.anchor, selection.focus);

  function updateSelection(patch: Partial<CellContent>) {
    const count = (range.bottom - range.top + 1) * (range.right - range.left + 1);
    if (count > MAX_RANGE_CELLS) {
      toast.error(tr.spreadsheets.toolbar.rangeTooLarge(MAX_RANGE_CELLS));
      return;
    }
    const updates: CellUpdate[] = [];
    for (let row = range.top; row <= range.bottom; row++) {
      for (let col = range.left; col <= range.right; col++) {
        updates.push({ row, col, patch });
      }
    }
    editor.updateCells(updates);
  }

  const handleCommitValue = useCallback(
    (row: number, col: number, value: string) => {
      updateCells([{ row, col, patch: { value: value === '' ? null : value } }]);
    },
    [updateCells],
  );
  const isDraft = useCallback(
    (row: number, col: number) => drafts.has(cellKey(row, col)),
    [drafts],
  );

  return (
    <div className="flex flex-col gap-3">
      <SpreadsheetToolbar
        canEdit={canEdit}
        selectionLabel={tr.spreadsheets.toolbar.selection(rangeAddress(range))}
        activeCell={editor.getCell(selection.focus.row, selection.focus.col)}
        pendingCount={pendingCount}
        isSaving={editor.isSaving}
        onBgColor={(bgColor) => updateSelection({ bgColor })}
        onFontColor={(fontColor) => updateSelection({ fontColor })}
        onSave={() => editor.save()}
        onDiscard={() => setDiscardOpen(true)}
      />

      {editor.cellsQuery.isPending ? (
        <p className="py-10 text-center text-sm text-app-muted">{tr.spreadsheets.detail.loading}</p>
      ) : editor.cellsQuery.isError ? (
        <p className="py-10 text-center text-sm text-app-danger">
          {tr.spreadsheets.detail.loadError}
        </p>
      ) : (
        <SpreadsheetGrid
          rows={rows}
          cols={cols}
          canEdit={canEdit}
          selection={selection}
          getCell={editor.getCell}
          isDraft={isDraft}
          conflicts={editor.conflicts}
          onSelectionChange={setSelection}
          onCommitValue={handleCommitValue}
          onClearSelection={() => updateSelection({ value: null })}
        />
      )}

      {editor.serverConflicts.length > 0 && (
        <SpreadsheetConflictModal
          conflicts={editor.serverConflicts}
          getMine={editor.getCell}
          isSaving={editor.isSaving}
          onTakeTheirs={editor.takeTheirs}
          onKeepMine={editor.keepMine}
          onClose={editor.dismissConflicts}
        />
      )}

      {discardOpen && (
        <ConfirmModal
          title={tr.spreadsheets.toolbar.discardConfirmTitle}
          message={tr.spreadsheets.toolbar.discardConfirm}
          confirmLabel={tr.spreadsheets.toolbar.discard}
          variant="danger"
          onConfirm={() => {
            editor.discard();
            setDiscardOpen(false);
          }}
          onCancel={() => setDiscardOpen(false)}
        />
      )}
    </div>
  );
}
