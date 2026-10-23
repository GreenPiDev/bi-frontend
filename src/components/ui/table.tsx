import { clsx } from 'clsx';
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Fragment, type ReactNode, useEffect, useState } from 'react';
import { tr } from '../../i18n/tr';
import { IconActionButton } from './icon-action-button';
import { Tooltip } from './tooltip';

export interface TableBulkAction {
  key: string;
  icon: LucideIcon;
  tooltip: string;
  onClick: () => void;
  disabled?: boolean;
}

// suresi index.css'teki .animate-bulk-bar-out ile esit olmali.
const BULK_BAR_EXIT_ANIMATION_MS = 200;

export type SortDirection = 'asc' | 'desc';
export interface TableSort {
  key: string;
  direction: SortDirection;
}

export interface TableColumn<T> {
  key: string;
  header: string;
  /** Verilirse basligin gorsel icerigi olarak `header` yerine bu render edilir
   * (ornek: "Tumunu sec" checkbox'i bir kolon basliginda) - `header` yine de
   * kolon secici (useColumnVisibility) gibi metin bekleyen yerler icin string
   * olarak kalir. */
  headerNode?: ReactNode;
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
  /** Verilirse, satir cmd/ctrl+click veya orta-tik ile yeni sekmede acilabilir hale
   * gelir (native <a href> tarayici davranisini taklit eder - <tr> gecerli sekilde
   * <a> ile sarilamadigi icin bu, window.open ile elle yapilir). Normal sol-tik hala
   * onRowClick'i cagirir, bu prop onRowClick'in yerini almaz, yanina eklenir. */
  getRowHref?: (row: T) => string | null | undefined;
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
  /** Kolon sayisi ekrana sigmayabilecek tablolar icin (orn. dataset onizlemesi): tabloyu
   * konteynir genisligine sikistirmak yerine dogal genisliginde birakip yatay scroll
   * verir. Varsayilan false - mevcut sabit genislikli liste sayfalarinin davranisi
   * degismez. */
  scrollX?: boolean;
  /** Kolonlari icerige gore degil, esit araliklarla (table-layout: fixed) dagitir -
   * az sayida, sabit genislikte kolonu olan tablolar icin (orn. siparis kalemleri). */
  fixedLayout?: boolean;
  /** Dis sarmalayicinin varsayilan `mt-6` ust bosluguna ek/yerine gececek class. */
  className?: string;
  /** Verilirse, secili satir(lar) oldugunda (bulkActionsVisible=true) tablonun
   * hemen ustune, onunla AYNI border kutusunu paylasan lacivert bir ikon-buton
   * cubugu eklenir - "cekmece" gibi tablonun arkasindan yukari kayarak acilir,
   * kapanista ayni yonde geri kayar (bkz. index.css animate-bulk-bar-in/out).
   * Toplu secim/aksiyon gerektiren tum liste ve detay sayfalarinda (siparis
   * kalemleri, mesajlar...) ayni bilesen kullanilir - sayfa sadece ikon/tooltip/
   * onClick listesini saglar. */
  bulkActions?: TableBulkAction[];
  /** bulkActions cubugunun gorunur olup olmadigi - genelde `selectedIds.size > 0`.
   * false'a dustugunde cubuk aninda kaybolmaz, kapanis animasyonu bitene kadar
   * (BULK_BAR_EXIT_ANIMATION_MS) DOM'da kalmaya devam eder. */
  bulkActionsVisible?: boolean;
  /** Verilirse, bulkActions cubugunun ikonlarinin saginda "X öge seçildi" metni
   * gosterilir - genelde `selectedIds.size`. */
  selectedCount?: number;
}

/** Projedeki tüm liste ekranlarının (firmalar, kişiler, Faz 11a'nın yeni ekranları...)
 * ortak tablo iskeleti - satır tıklama, yükleniyor/boş durumları dahil. */
export function Table<T>({
  columns,
  data,
  keyField,
  onRowClick,
  getRowHref,
  isLoading,
  loadingMessage = tr.common.loading,
  emptyMessage,
  sort,
  onSortChange,
  isRowExpanded,
  renderExpandedRow,
  rowClassName,
  scrollX = false,
  fixedLayout = false,
  className,
  bulkActions,
  bulkActionsVisible = false,
  selectedCount,
}: TableProps<T>) {
  const [isBulkBarClosing, setIsBulkBarClosing] = useState(false);
  const [prevBulkActionsVisible, setPrevBulkActionsVisible] = useState(bulkActionsVisible);

  // bulkActionsVisible degistigi render icinde (bir efekt yerine) kapanis
  // animasyonunu tetikler - Pagination'daki "render sirasinda state ayarlama"
  // deseniyle ayni (bkz. asagisi), gereksiz ekstra render/flaş yaratmaz.
  if (bulkActionsVisible !== prevBulkActionsVisible) {
    setPrevBulkActionsVisible(bulkActionsVisible);
    setIsBulkBarClosing(!bulkActionsVisible && prevBulkActionsVisible);
  }

  const isBulkBarMounted = bulkActionsVisible || isBulkBarClosing;

  useEffect(() => {
    if (!isBulkBarClosing) return;
    const timeoutId = window.setTimeout(() => {
      setIsBulkBarClosing(false);
    }, BULK_BAR_EXIT_ANIMATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [isBulkBarClosing]);

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
    <div
      className={clsx(
        className ?? 'mt-6',
        'border border-app-border bg-app-surface',
        scrollX ? 'overflow-x-auto' : 'overflow-hidden',
      )}
    >
      {isBulkBarMounted && bulkActions && bulkActions.length > 0 && (
        <div
          className={clsx(
            'flex items-center gap-1 border-b border-white bg-app-brand px-2 py-1.5',
            isBulkBarClosing ? 'animate-bulk-bar-out' : 'animate-bulk-bar-in',
          )}
        >
          {bulkActions.map((action) => (
            <IconActionButton
              key={action.key}
              icon={action.icon}
              tooltip={action.tooltip}
              onClick={action.onClick}
              disabled={action.disabled}
              className="border border-white text-white hover:bg-white/10 hover:text-white"
            />
          ))}
          {selectedCount !== undefined && (
            <span className="ml-2 text-sm font-medium text-white">
              {tr.common.selectedCount(selectedCount)}
            </span>
          )}
        </div>
      )}
      <table
        className={clsx(
          'text-left text-[clamp(0.8125rem,0.77rem+0.25vw,0.9375rem)]',
          scrollX ? 'w-max min-w-full' : 'w-full',
          fixedLayout && 'table-fixed',
        )}
      >
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
                      {column.headerNode ?? column.header}
                      {isActive && sort?.direction === 'asc' && <ChevronUp size={18} />}
                      {isActive && sort?.direction === 'desc' && <ChevronDown size={18} />}
                      {!isActive && <ChevronsUpDown size={18} className="opacity-60" />}
                    </button>
                  ) : (
                    (column.headerNode ?? column.header)
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => {
            const expanded = isRowExpanded?.(row, index) ?? false;
            const href = getRowHref?.(row);
            return (
              <Fragment key={keyField(row, index)}>
                <tr
                  onClick={(event) => {
                    if (href && (event.metaKey || event.ctrlKey)) {
                      event.preventDefault();
                      window.open(href, '_blank', 'noopener,noreferrer');
                      return;
                    }
                    onRowClick?.(row);
                  }}
                  onAuxClick={(event) => {
                    // Orta-tik (tekerlek) - eventin default'u yeni sekmede acmaz,
                    // native <a> davranisini taklit etmek icin elle acmak gerekiyor.
                    if (href && event.button === 1) {
                      event.preventDefault();
                      window.open(href, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  className={clsx(
                    'bg-app-surface border-b border-app-border last:border-0',
                    (onRowClick || href) && 'cursor-pointer hover:bg-blue-50',
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
  /** Verilirse "Sayfa X / Y" yanina toplam kayit sayisi da eklenir (orn. liste
   * sayfalarindaki `meta.total`). Verilmezse eski davranis (sadece sayfa bilgisi) korunur. */
  total?: number;
  /** Verilirse sayfa numarasi duz metin degil, bir input + "Git" butonu olarak
   * gosterilir - kullanici sayi yazip "Git"e basana kadar sayfa degismez (input'a
   * yazarken otomatik gitmez). Verilmezse eski davranis (sadece metin) korunur. */
  onPageChange?: (page: number) => void;
}

export function Pagination({
  page,
  totalPages,
  onPrevious,
  onNext,
  total,
  onPageChange,
}: PaginationProps) {
  const [renderedPage, setRenderedPage] = useState(page);
  const [inputValue, setInputValue] = useState(String(page));

  // Sayfa disaridan (onceki/sonraki, filtre sifirlama...) degisince input'u senkronla -
  // render sirasinda state ayarlama (React'in onerdigi desen), setState'i effect icinde
  // cagirip gereksiz ekstra render yaratmamak icin.
  if (renderedPage !== page) {
    setRenderedPage(page);
    setInputValue(String(page));
  }

  const parsedInputPage = Number(inputValue);
  // Yalnizca gecerli bir sayfa numarasi *ve* su an bulundugumuz sayfadan farkli bir
  // deger yazilmissa "Git" butonu aktif olur - ayni sayfaya gereksiz gitmeyi onler.
  const canGoToTypedPage =
    Number.isInteger(parsedInputPage) &&
    parsedInputPage >= 1 &&
    parsedInputPage <= Math.max(totalPages, 1) &&
    parsedInputPage !== page;

  function goToTypedPage() {
    if (!canGoToTypedPage) {
      setInputValue(String(page));
      return;
    }
    onPageChange?.(parsedInputPage);
  }

  const pagerButtonClassName = (enabled: boolean) =>
    clsx(
      'inline-flex h-5 items-center justify-center self-center rounded border border-[#1e2a4a] px-1.5 text-[#1e2a4a] transition-colors',
      enabled ? 'cursor-pointer hover:bg-[#1e2a4a]/10' : 'cursor-not-allowed opacity-40',
    );

  return (
    <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm text-app-muted">
      {onPageChange ? (
        <div className="flex items-center gap-2">
          <span>{tr.common.pageInputLabel}</span>
          <input
            type="number"
            min={1}
            max={Math.max(totalPages, 1)}
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                goToTypedPage();
              }
            }}
            aria-label={tr.common.pageInputAria}
            className="w-16 rounded border border-app-border bg-app-surface px-2 py-1 text-center text-app-text [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="inline-flex items-center">
            {tr.common.pageTotalSuffix(totalPages)}
            {total !== undefined && ` · ${tr.common.totalRecords(total)}`}
          </span>
          <Tooltip content={tr.common.goToPage}>
            <button
              type="button"
              onClick={goToTypedPage}
              disabled={!canGoToTypedPage}
              aria-label={tr.common.goToPage}
              className={pagerButtonClassName(canGoToTypedPage)}
            >
              <ArrowRight size={14} />
            </button>
          </Tooltip>
        </div>
      ) : (
        <span>
          {total === undefined
            ? tr.common.pageOf(page, totalPages)
            : tr.common.pageOfWithTotal(page, totalPages, total)}
        </span>
      )}
      <div className="flex items-center gap-2 justify-self-center">
        <Tooltip content={tr.common.previousPageTooltip}>
          <button
            type="button"
            disabled={page <= 1}
            onClick={onPrevious}
            aria-label={tr.common.previousPageTooltip}
            className={pagerButtonClassName(page > 1)}
          >
            <ChevronLeft size={14} />
          </button>
        </Tooltip>
        <Tooltip content={tr.common.nextPageTooltip}>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={onNext}
            aria-label={tr.common.nextPageTooltip}
            className={pagerButtonClassName(page < totalPages)}
          >
            <ChevronRight size={14} />
          </button>
        </Tooltip>
      </div>
      <div />
    </div>
  );
}
