import type { KeyboardEvent } from 'react';
import type { CellPosition } from './spreadsheet-model';

export interface GridSelection {
  anchor: CellPosition;
  focus: CellPosition;
}

interface GridKeyboardOptions {
  selection: GridSelection;
  rows: number;
  cols: number;
  canEdit: boolean;
  onSelectionChange: (selection: GridSelection) => void;
  onStartEdit: (initialText?: string) => void;
  onClearSelection: () => void;
}

const ARROW_DELTAS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(max - 1, value));
}

/** Izgara odaktayken (duzenleme modunda degilken) Excel benzeri klavye davranisi. */
export function createGridKeyDownHandler(options: GridKeyboardOptions) {
  const { selection, rows, cols, canEdit } = options;

  function move(deltaRow: number, deltaCol: number, extend: boolean) {
    const next = {
      row: clamp(selection.focus.row + deltaRow, rows),
      col: clamp(selection.focus.col + deltaCol, cols),
    };
    options.onSelectionChange({ anchor: extend ? selection.anchor : next, focus: next });
  }

  return (event: KeyboardEvent<HTMLDivElement>) => {
    const arrow = ARROW_DELTAS[event.key];
    if (arrow) {
      event.preventDefault();
      move(arrow[0], arrow[1], event.shiftKey);
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      move(0, event.shiftKey ? -1 : 1, false);
      return;
    }
    if (!canEdit) return;
    if (event.key === 'Enter' || event.key === 'F2') {
      event.preventDefault();
      options.onStartEdit();
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      options.onClearSelection();
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      options.onStartEdit(event.key);
    }
  };
}
