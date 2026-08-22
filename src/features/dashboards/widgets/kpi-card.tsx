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
  const column = result.columns[0];
  const rawValue = result.rows[0]?.[0];
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
