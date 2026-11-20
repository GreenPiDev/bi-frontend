import { describe, expect, it } from 'vitest';
import {
  autoFitWidth,
  buildColumnLayout,
  clampColWidth,
  columnAt,
  DEFAULT_COL_WIDTH,
  MAX_COL_WIDTH,
  MIN_COL_WIDTH,
} from './spreadsheet-columns';

describe('spreadsheet-columns', () => {
  it('builds widths/offsets with shared overrides', () => {
    const layout = buildColumnLayout(3, { '1': 200 });
    expect(layout.widths).toEqual([DEFAULT_COL_WIDTH, 200, DEFAULT_COL_WIDTH]);
    expect(layout.offsets).toEqual([0, 120, 320, 440]);
  });

  it('finds the column at an x position', () => {
    const { offsets } = buildColumnLayout(3, { '1': 200 });
    expect(columnAt(offsets, 0)).toBe(0);
    expect(columnAt(offsets, 119)).toBe(0);
    expect(columnAt(offsets, 120)).toBe(1);
    expect(columnAt(offsets, 319)).toBe(1);
    expect(columnAt(offsets, 5000)).toBe(2);
  });

  it('clamps widths', () => {
    expect(clampColWidth(1)).toBe(MIN_COL_WIDTH);
    expect(clampColWidth(99_999)).toBe(MAX_COL_WIDTH);
    expect(clampColWidth(150.6)).toBe(151);
  });

  it('auto-fits to the longest value, default when column is empty', () => {
    const short = autoFitWidth(['Kablo']);
    const long = autoFitWidth(['Kablo', 'NYY 3x2,5 mm² Enerji Kablosu (100 m makara)']);
    expect(long).toBeGreaterThan(short);
    expect(autoFitWidth([])).toBe(DEFAULT_COL_WIDTH);
  });
});
