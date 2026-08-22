import { describe, expect, it } from 'vitest';
import type { QuerySpec } from '../../lib/api';
import {
  buildDrillDownFilters,
  mergeDashboardFilters,
  type DashboardFilter,
} from './dashboard-filters';

function baseSpec(overrides: Partial<QuerySpec> = {}): QuerySpec {
  return {
    datasetId: 'ds-1',
    measures: [{ field: 'tutar', agg: 'sum', alias: 'toplam' }],
    dimensions: [{ field: 'sehir' }],
    filters: [],
    orderBy: [],
    ...overrides,
  };
}

describe('mergeDashboardFilters', () => {
  it('bos filtre listesinde speci degistirmeden dondurur', () => {
    const spec = baseSpec();
    expect(mergeDashboardFilters(spec, [])).toBe(spec);
  });

  it('sadece ayni datasetId hedefleyen filtreleri ekler', () => {
    const spec = baseSpec({ datasetId: 'ds-1' });
    const filters: DashboardFilter[] = [
      {
        id: '1',
        datasetId: 'ds-1',
        datasetName: 'A',
        field: 'sehir',
        fieldLabel: 'Şehir',
        fieldType: 'STRING',
        op: 'eq',
        value: 'İstanbul',
        valueLabel: 'İstanbul',
      },
      {
        id: '2',
        datasetId: 'ds-other',
        datasetName: 'B',
        field: 'urun',
        fieldLabel: 'Ürün',
        fieldType: 'STRING',
        op: 'eq',
        value: 'X',
        valueLabel: 'X',
      },
    ];
    const merged = mergeDashboardFilters(spec, filters);
    expect(merged.filters).toEqual([{ field: 'sehir', op: 'eq', value: 'İstanbul' }]);
    expect(spec.filters).toEqual([]);
  });
});

describe('buildDrillDownFilters', () => {
  it('granularity olmayan boyut icin eq filtresi uretir', () => {
    const spec = baseSpec({ dimensions: [{ field: 'sehir' }] });
    const filters = buildDrillDownFilters(spec, ['İstanbul', 100]);
    expect(filters).toEqual([{ field: 'sehir', op: 'eq', value: 'İstanbul' }]);
  });

  it('null boyut degeri icin is_null uretir', () => {
    const spec = baseSpec({ dimensions: [{ field: 'sehir' }] });
    const filters = buildDrillDownFilters(spec, [null, 100]);
    expect(filters).toEqual([{ field: 'sehir', op: 'is_null' }]);
  });

  it('gunluk granularity icin [gte, lt) bucket araligi uretir', () => {
    const spec = baseSpec({ dimensions: [{ field: 'tarih', granularity: 'day' }] });
    const filters = buildDrillDownFilters(spec, ['2026-03-05T00:00:00.000Z', 100]);
    expect(filters).toEqual([
      { field: 'tarih', op: 'gte', value: '2026-03-05T00:00:00.000Z' },
      { field: 'tarih', op: 'lt', value: '2026-03-06T00:00:00.000Z' },
    ]);
  });

  it('aylik granularity icin bir sonraki ayin basina kadar aralik uretir', () => {
    const spec = baseSpec({ dimensions: [{ field: 'tarih', granularity: 'month' }] });
    const filters = buildDrillDownFilters(spec, ['2026-01-01T00:00:00.000Z', 100]);
    expect(filters).toEqual([
      { field: 'tarih', op: 'gte', value: '2026-01-01T00:00:00.000Z' },
      { field: 'tarih', op: 'lt', value: '2026-02-01T00:00:00.000Z' },
    ]);
  });

  it('yil sonu ay siniri dogru tasar (aralik yili degistirir)', () => {
    const spec = baseSpec({ dimensions: [{ field: 'tarih', granularity: 'month' }] });
    const filters = buildDrillDownFilters(spec, ['2026-12-01T00:00:00.000Z', 100]);
    expect(filters).toEqual([
      { field: 'tarih', op: 'gte', value: '2026-12-01T00:00:00.000Z' },
      { field: 'tarih', op: 'lt', value: '2027-01-01T00:00:00.000Z' },
    ]);
  });

  it('birden fazla boyut icin sirali filtre listesi uretir', () => {
    const spec = baseSpec({ dimensions: [{ field: 'sehir' }, { field: 'urun' }] });
    const filters = buildDrillDownFilters(spec, ['İstanbul', 'Kalem', 100]);
    expect(filters).toEqual([
      { field: 'sehir', op: 'eq', value: 'İstanbul' },
      { field: 'urun', op: 'eq', value: 'Kalem' },
    ]);
  });
});
