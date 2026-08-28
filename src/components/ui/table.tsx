import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { tr } from '../../i18n/tr';
import { Button } from './button';

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyField: (row: T) => string;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
}

/** Projedeki tüm liste ekranlarının (firmalar, kişiler, Faz 11a'nın yeni ekranları...)
 * ortak tablo iskeleti - satır tıklama, yükleniyor/boş durumları dahil. */
export function Table<T>({
  columns,
  data,
  keyField,
  onRowClick,
  isLoading,
  loadingMessage = tr.common.loading,
  emptyMessage,
}: TableProps<T>) {
  if (isLoading) {
    return <p className="mt-6 text-sm text-app-muted">{loadingMessage}</p>;
  }

  if (data.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-dashed border-app-border bg-app-surface p-8 text-center text-sm text-app-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-app-border bg-app-surface">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-app-border text-xs uppercase text-app-muted">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={clsx('px-4 py-3', column.className)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={keyField(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={clsx(
                'border-b border-app-border last:border-0',
                onRowClick && 'cursor-pointer hover:bg-app-bg',
              )}
            >
              {columns.map((column) => (
                <td key={column.key} className={clsx('px-4 py-3', column.className)}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface PaginationProps {
  page: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
}

export function Pagination({ page, totalPages, onPrevious, onNext }: PaginationProps) {
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-app-muted">
      <span>{tr.common.pageOf(page, totalPages)}</span>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" disabled={page <= 1} onClick={onPrevious}>
          {tr.common.previous}
        </Button>
        <Button type="button" variant="secondary" disabled={page >= totalPages} onClick={onNext}>
          {tr.common.next}
        </Button>
      </div>
    </div>
  );
}
