import type {
  DatasetFieldType,
  FilterOperator,
  FilterSpec,
  Granularity,
  QuerySpec,
} from '../../lib/api';

/** Dashboard seviyesinde uygulanan bir filtre - hangi veri kumesini hedeflediğini de tasir,
 * cunku bir panodaki widget'lar farkli veri kumelerinden gelebilir (CLAUDE.md SS8/F8). */
export interface DashboardFilter {
  id: string;
  datasetId: string;
  datasetName: string;
  field: string;
  fieldLabel: string;
  fieldType: DatasetFieldType;
  op: FilterOperator;
  value?: unknown;
  valueLabel: string;
}

/** Bir dashboard filtresini, yalnizca ayni veri kumesini kullanan widget'larin QuerySpec'ine ekler. */
export function mergeDashboardFilters(
  spec: QuerySpec,
  dashboardFilters: DashboardFilter[],
): QuerySpec {
  const applicable = dashboardFilters.filter((f) => f.datasetId === spec.datasetId);
  if (applicable.length === 0) return spec;
  const extra: FilterSpec[] = applicable.map((f) => ({ field: f.field, op: f.op, value: f.value }));
  return { ...spec, filters: [...spec.filters, ...extra] };
}

function addUnits(date: Date, granularity: Granularity): Date {
  const next = new Date(date);
  switch (granularity) {
    case 'day':
      next.setUTCDate(next.getUTCDate() + 1);
      return next;
    case 'week':
      next.setUTCDate(next.getUTCDate() + 7);
      return next;
    case 'month':
      next.setUTCMonth(next.getUTCMonth() + 1);
      return next;
    case 'quarter':
      next.setUTCMonth(next.getUTCMonth() + 3);
      return next;
    case 'year':
      next.setUTCFullYear(next.getUTCFullYear() + 1);
      return next;
  }
}

/** Tiklanan grafik verisinin arkasindaki ham satirlari getirmek icin gereken filtreleri kurar
 * (F9 drill-down). Granularity'li boyutlar bir zaman dilimini temsil eder; bucket baslangici
 * ile bir sonraki bucket'in baslangici arasindaki araligi [gte, lt) olarak ifade ederiz -
 * 'between' operatoru dahil ust sinir kullandigindan bucket sinirinda cift sayima yol acabilirdi. */
export function buildDrillDownFilters(querySpec: QuerySpec, row: readonly unknown[]): FilterSpec[] {
  return querySpec.dimensions.flatMap((dim, index): FilterSpec[] => {
    const value = row[index];
    if (value === null || value === undefined) {
      return [{ field: dim.field, op: 'is_null' }];
    }
    if (!dim.granularity) {
      return [{ field: dim.field, op: 'eq', value }];
    }
    const start = new Date(value as string);
    const end = addUnits(start, dim.granularity);
    return [
      { field: dim.field, op: 'gte', value: start.toISOString() },
      { field: dim.field, op: 'lt', value: end.toISOString() },
    ];
  });
}
