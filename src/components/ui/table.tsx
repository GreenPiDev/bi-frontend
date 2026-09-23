import { clsx } from 'clsx';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import { tr } from '../../i18n/tr';
import { Button } from './button';

export type SortDirection = 'asc' | 'desc';
export interface TableSort {
  key: string;
  direction: SortDirection;
}

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  /** "Gosterilecek kolonlar" secicisinde (bkz. features/auth/use-column-visibility)
   * her zaman gorunur sayilir ve secici listesinde sunulmaz - Table'in kendisi bu
   * alani okumaz, sadece sayfalarin kolon listesini filtrelemesi icin tasinir. */
  required?: boolean;
  /** Verilirse bu kolon basligi tiklanabilir olur (asc -> desc -> varsayilan).
   * Deger, backend'in ListQuerySchema `sort` parametresinde bekledigi alan adidir
   * (bkz. bi-backend core/dto/list-query.dto.ts parseSort) - siralama sunucu
   * tarafinda yapilir, sayfalama boyunca dogru sonuc verir. */
  sortKey?: string;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyField: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  /** Aktif siralama (server-side) - sortKey tasiyan kolonlarla birlikte kullanilir. */
  sort?: TableSort | null;
  onSortChange?: (sort: TableSort | null) => void;
  /** Verilirse, ilgili satirin altina tum genislikte (colSpan) ek bir satir acilir -
   * denetim kaydi detayi, envanter/ekleme paneli gibi "satira tikla, altinda genislet"
   * desenleri icin (bkz. settings-page.tsx audit log, quote-form-page.tsx urun secici).
   * Acik/kapali durumu Table kendisi tutmaz, cagiran bilesenin state'inden okunur -
   * genelde onRowClick ile ayni id'yi toggle eder. */
  isRowExpanded?: (row: T, index: number) => boolean;
  renderExpandedRow?: (row: T, index: number) => ReactNode;
  /** Satira ek class eklemek icin (orn. genisletilmis/secili satiri kalici olarak
   * vurgulamak) - hover haricinde bir vurgu gerekmiyorsa gerek yok. */
  rowClassName?: (row: T, index: number) => string | undefined;
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
  sort,
  onSortChange,
  isRowExpanded,
  renderExpandedRow,
  rowClassName,
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

  function handleSortClick(column: TableColumn<T>) {
    if (!column.sortKey || !onSortChange) return;
    if (sort?.key !== column.sortKey) {
      onSortChange({ key: column.sortKey, direction: 'asc' });
    } else if (sort.direction === 'asc') {
      onSortChange({ key: column.sortKey, direction: 'desc' });
    } else {
      onSortChange(null);
    }
  }

  return (
    <div className="mt-6 overflow-hidden border border-app-border bg-app-surface">
      <table className="w-full text-left text-[clamp(0.8125rem,0.77rem+0.25vw,0.9375rem)]">
        <thead className="border-b border-app-border bg-app-primary uppercase text-[clamp(0.6875rem,0.65rem+0.2vw,0.8125rem)] text-white">
          <tr>
            {columns.map((column) => {
              const isActive = Boolean(column.sortKey) && sort?.key === column.sortKey;
              return (
                <th key={column.key} className={clsx('px-4 py-3 !text-white', column.className)}>
                  {column.sortKey ? (
                    <button
                      type="button"
                      onClick={() => handleSortClick(column)}
                      className="inline-flex items-center gap-1 uppercase hover:opacity-80"
                    >
                      {column.header}
                      {isActive && sort?.direction === 'asc' && <ChevronUp size={14} />}
                      {isActive && sort?.direction === 'desc' && <ChevronDown size={14} />}
                      {!isActive && <ChevronsUpDown size={14} className="opacity-60" />}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => {
            const expanded = isRowExpanded?.(row, index) ?? false;
            return (
              <Fragment key={keyField(row, index)}>
                <tr
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={clsx(
                    'bg-app-surface border-b border-app-border last:border-0',
                    onRowClick && 'cursor-pointer hover:bg-blue-50',
                    expanded && 'border-b-0',
                    rowClassName?.(row, index),
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={clsx('px-4 py-3 !text-app-text', column.className)}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
                {expanded && renderExpandedRow && (
                  <tr className="bg-app-bg border-b border-app-border last:border-0">
                    <td colSpan={columns.length} className="p-4">
                      {renderExpandedRow(row, index)}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
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
