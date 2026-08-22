import { describe, expect, it } from 'vitest';
import type { QueryResult } from '../../../lib/api';
import {
  buildBarOption,
  buildPieOption,
  toCategoriesAndSeries,
} from './query-result-to-echarts-option';

const theme = {
  seriesColors: ['#2a78d6', '#008300'],
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  muted: '#898781',
};

function makeResult(): QueryResult {
  return {
    columns: [
      { name: 'sehir', type: 'STRING', label: 'Şehir' },
      { name: 'toplam', type: 'NUMBER', label: 'Toplam' },
    ],
    rows: [
      ['İstanbul', 100],
      ['Ankara', 50],
    ],
    rowCount: 2,
    executionMs: 5,
    truncated: false,
  };
}

describe('toCategoriesAndSeries', () => {
  it('boyut kolonlarini kategori, olcu kolonlarini seri olarak ayirir', () => {
    const { categories, series } = toCategoriesAndSeries(makeResult(), 1);
    expect(categories).toEqual(['İstanbul', 'Ankara']);
    expect(series).toEqual([{ name: 'Toplam', data: [100, 50] }]);
  });

  it('bos deger icin em-dash doner', () => {
    const result = makeResult();
    result.rows = [[null, 10]];
    const { categories } = toCategoriesAndSeries(result, 1);
    expect(categories).toEqual(['—']);
  });
});

describe('buildBarOption', () => {
  it('tek eksen kullanir (dual-axis yok) ve seri renklerini temadan alir', () => {
    const option = buildBarOption(makeResult(), 1, theme) as {
      color: string[];
      series: { type: string }[];
      yAxis: unknown;
    };
    expect(option.color).toEqual(theme.seriesColors);
    expect(Array.isArray(option.yAxis)).toBe(false);
    expect(option.series).toHaveLength(1);
    expect(option.series[0].type).toBe('bar');
  });
});

describe('buildPieOption', () => {
  it('kategori basina bir dilim uretir', () => {
    const option = buildPieOption(makeResult(), 1, theme) as {
      series: { data: { name: string; value: number }[] }[];
    };
    expect(option.series[0].data).toEqual([
      { name: 'İstanbul', value: 100 },
      { name: 'Ankara', value: 50 },
    ]);
  });
});
