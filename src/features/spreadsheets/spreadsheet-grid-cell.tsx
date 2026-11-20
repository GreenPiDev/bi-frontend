import { memo } from 'react';
import { tr } from '../../i18n/tr';
import type { CellConflictInfo } from './use-spreadsheet-editor';

export const ROW_HEIGHT = 28;
export const HEADER_HEIGHT = 28;
export const ROW_HEADER_WIDTH = 56;

const NUMERIC_PATTERN = /^-?[\d.,]+%?$/;
const DRAFT_COLOR = '#F59E0B';
const CONFLICT_COLOR = '#DC2626';

interface SpreadsheetGridCellProps {
  row: number;
  col: number;
  left: number;
  width: number;
  value: string | null;
  bgColor: string | null;
  fontColor: string | null;
  isDraft: boolean;
  conflict: CellConflictInfo | undefined;
  onMouseDown: (row: number, col: number, shiftKey: boolean) => void;
  onMouseEnter: (row: number, col: number) => void;
  onDoubleClick: (row: number, col: number) => void;
}

/** Tek bir hucre - binlerce kez render edildigi icin memo'lu ve sadece duz div. */
export const SpreadsheetGridCell = memo(function SpreadsheetGridCell({
  row,
  col,
  left,
  width,
  value: rawValue,
  bgColor,
  fontColor,
  isDraft,
  conflict,
  onMouseDown,
  onMouseEnter,
  onDoubleClick,
}: SpreadsheetGridCellProps) {
  const value = rawValue ?? '';
  const marker = conflict ? CONFLICT_COLOR : isDraft ? DRAFT_COLOR : null;
  const title = conflict
    ? tr.spreadsheets.conflict.cellTooltip(
        conflict.updatedByName,
        conflict.value ?? tr.spreadsheets.conflict.emptyValue,
      )
    : value || undefined;

  return (
    <div
      role="gridcell"
      data-cell={`${row}:${col}`}
      title={title}
      onMouseDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        onMouseDown(row, col, event.shiftKey);
      }}
      onMouseEnter={() => onMouseEnter(row, col)}
      onDoubleClick={() => onDoubleClick(row, col)}
      className="absolute truncate border-r border-b border-app-border/70 px-1.5 text-sm leading-[27px] select-none"
      style={{
        top: row * ROW_HEIGHT,
        left,
        width,
        height: ROW_HEIGHT,
        backgroundColor: bgColor ?? undefined,
        color: fontColor ?? undefined,
        textAlign: NUMERIC_PATTERN.test(value) ? 'right' : 'left',
        boxShadow: marker ? `inset 0 0 0 2px ${marker}` : undefined,
      }}
    >
      {value}
      {marker && (
        <span
          aria-hidden="true"
          className="absolute top-0 right-0 h-0 w-0 border-t-[7px] border-l-[7px] border-l-transparent"
          style={{ borderTopColor: marker }}
        />
      )}
    </div>
  );
});
