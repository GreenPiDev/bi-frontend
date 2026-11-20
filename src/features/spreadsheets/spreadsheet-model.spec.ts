import { describe, expect, it } from 'vitest';
import {
  cellAddress,
  columnLetter,
  mergeCompactCells,
  normalizeRange,
  rangeAddress,
} from './spreadsheet-model';

describe('spreadsheet-model', () => {
  it('Excel sutun harflerini uretir', () => {
    expect(columnLetter(0)).toBe('A');
    expect(columnLetter(25)).toBe('Z');
    expect(columnLetter(26)).toBe('AA');
    expect(cellAddress(11, 1)).toBe('B12');
  });

  it('secim araligini normalize edip adresler', () => {
    const range = normalizeRange({ row: 4, col: 2 }, { row: 1, col: 0 });
    expect(range).toEqual({ top: 1, left: 0, bottom: 4, right: 2 });
    expect(rangeAddress(range)).toBe('A2:C5');
    expect(rangeAddress(normalizeRange({ row: 0, col: 0 }, { row: 0, col: 0 }))).toBe('A1');
  });

  it('gelen hucreleri birlestirir, eski surumu yok sayar', () => {
    const merged = mergeCompactCells(
      [
        [0, 0, 'a', null, null, 3],
        [0, 1, 'b', null, null, 1],
      ],
      [
        [0, 0, 'eski', null, null, 2],
        [0, 1, 'yeni', '#FFFF00', null, 2],
        [5, 5, 'ek', null, null, 1],
      ],
    );
    expect(merged).toEqual([
      [0, 0, 'a', null, null, 3],
      [0, 1, 'yeni', '#FFFF00', null, 2],
      [5, 5, 'ek', null, null, 1],
    ]);
  });
});
