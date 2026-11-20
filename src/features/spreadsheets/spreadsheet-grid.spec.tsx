import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { GridSelection } from './grid-keyboard';
import { SpreadsheetGrid } from './spreadsheet-grid';
import { EMPTY_CELL, type CellContent } from './spreadsheet-model';

const CELLS: Record<string, CellContent> = {
  '0:0': { value: 'Ürün', bgColor: '#FFFF00', fontColor: '#FF0000' },
  '1:0': { value: 'Kablo', bgColor: null, fontColor: null },
};

function renderGrid(overrides: Partial<Parameters<typeof SpreadsheetGrid>[0]> = {}) {
  const onCommitValue = vi.fn();
  const onSelectionChange = vi.fn();
  const selection: GridSelection = { anchor: { row: 0, col: 0 }, focus: { row: 0, col: 0 } };
  render(
    <SpreadsheetGrid
      rows={20}
      cols={5}
      canEdit
      selection={selection}
      getCell={(row, col) => CELLS[`${row}:${col}`] ?? EMPTY_CELL}
      isDraft={(row, col) => row === 1 && col === 0}
      conflicts={new Map()}
      onSelectionChange={onSelectionChange}
      onCommitValue={onCommitValue}
      onClearSelection={vi.fn()}
      {...overrides}
    />,
  );
  return { onCommitValue, onSelectionChange };
}

function cell(row: number, col: number): HTMLElement {
  const element = document.querySelector<HTMLElement>(`[data-cell="${row}:${col}"]`);
  if (!element) throw new Error(`cell ${row}:${col} not rendered`);
  return element;
}

describe('SpreadsheetGrid', () => {
  it('hucre degerini ve renklerini gosterir, taslak hucreyi isaretler', () => {
    renderGrid();
    expect(cell(0, 0)).toHaveTextContent('Ürün');
    expect(cell(0, 0)).toHaveStyle({ backgroundColor: '#FFFF00', color: '#FF0000' });
    expect(cell(1, 0).style.boxShadow).toContain('#F59E0B');
    expect(cell(0, 0).style.boxShadow).toBe('');
  });

  it('cift tiklayip Enter ile degeri kaydeder ve bir alta gecer', async () => {
    const user = userEvent.setup();
    const { onCommitValue, onSelectionChange } = renderGrid();
    await user.dblClick(cell(0, 0));
    const input = screen.getByRole('textbox', { name: 'A1' });
    await user.clear(input);
    await user.type(input, 'Şalter{Enter}');
    expect(onCommitValue).toHaveBeenCalledTimes(1);
    expect(onCommitValue).toHaveBeenCalledWith(0, 0, 'Şalter');
    expect(onSelectionChange).toHaveBeenLastCalledWith({
      anchor: { row: 1, col: 0 },
      focus: { row: 1, col: 0 },
    });
  });

  it('Escape ile duzenlemeyi iptal eder, kaydetmez', async () => {
    const user = userEvent.setup();
    const { onCommitValue } = renderGrid();
    await user.dblClick(cell(0, 0));
    await user.type(screen.getByRole('textbox', { name: 'A1' }), 'x{Escape}');
    expect(onCommitValue).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('salt-okunur modda duzenleme acilmaz', async () => {
    const user = userEvent.setup();
    renderGrid({ canEdit: false });
    await user.dblClick(cell(0, 0));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('grid'), { key: 'a' });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('yazmaya baslayinca secili hucrede duzenleme acar', () => {
    renderGrid();
    fireEvent.keyDown(screen.getByRole('grid'), { key: 'k' });
    expect(screen.getByRole('textbox', { name: 'A1' })).toHaveValue('k');
  });
});

describe('SpreadsheetGrid column resize', () => {
  function handle(col: number): HTMLElement {
    const element = document.querySelector<HTMLElement>(`[data-col-resize="${col}"]`);
    if (!element) throw new Error(`resize handle ${col} not rendered`);
    return element;
  }

  it('applies shared column widths to cells', () => {
    renderGrid({ colWidths: { '0': 250 } });
    expect(cell(0, 0).style.width).toBe('250px');
    expect(cell(0, 1).style.left).toBe('250px');
  });

  it('drag on the header border saves the new width', () => {
    const onColumnResize = vi.fn();
    renderGrid({ onColumnResize, onColumnAutoFit: vi.fn() });
    fireEvent.mouseDown(handle(0), { button: 0, clientX: 100 });
    fireEvent.mouseMove(document, { clientX: 160 });
    expect(cell(0, 0).style.width).toBe('180px');
    fireEvent.mouseUp(document);
    expect(onColumnResize).toHaveBeenCalledWith(0, 180);
  });

  it('double click on the header border auto-fits the column', () => {
    const onColumnAutoFit = vi.fn();
    const onColumnResize = vi.fn();
    renderGrid({ onColumnResize, onColumnAutoFit });
    fireEvent.doubleClick(handle(2));
    expect(onColumnAutoFit).toHaveBeenCalledWith(2);
    expect(onColumnResize).not.toHaveBeenCalled();
  });

  it('read-only users get no resize handles', () => {
    renderGrid({ canEdit: false, onColumnResize: vi.fn() });
    expect(document.querySelector('[data-col-resize]')).toBeNull();
  });
});
