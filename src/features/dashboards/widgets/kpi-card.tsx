import type { QueryResult } from '../../../lib/api';

const numberFormatter = new Intl.NumberFormat('tr-TR');
const currencyFormatter = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
});

interface KpiCardProps {
  result: QueryResult;
  format?: string;
}

export function KpiCard({ result, format }: KpiCardProps) {
  // Boyut secilmis bir KPI'da sutunlar once boyut sonra olcu sirasinda gelir (bkz.
  // query-builder.ts) - ilk NUMBER tipli sutunu (her zaman bir olcudur, boyut degil)
  // hedef almak, boyut degerini (metin) sayiya cevirmeye calisip NaN uretmeyi onler.
  const measureIndex = result.columns.findIndex((c) => c.type === 'NUMBER');
  const columnIndex = measureIndex >= 0 ? measureIndex : 0;
  const column = result.columns[columnIndex];
  const rawValue = result.rows[0]?.[columnIndex];
  const value = typeof rawValue === 'number' ? rawValue : Number(rawValue ?? 0);
  const formatted =
    format === 'currency' ? currencyFormatter.format(value) : numberFormatter.format(value);

  return (
    <div className="flex h-full flex-col justify-center gap-1 px-2">
      <span className="text-3xl font-bold text-app-text">{formatted}</span>
      {column && <span className="text-sm font-medium text-app-muted">{column.label}</span>}
    </div>
  );
}
