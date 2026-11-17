import { clsx } from 'clsx';
import { type HTMLAttributes, type KeyboardEvent, type ReactNode, useEffect, useRef } from 'react';
import type { TableColumn } from './table';

interface SheetTableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyField: (row: T, index: number) => string;
  /** Satir numarasi kolonunda (ilk kolon) gosterilecek icerik - verilmezse 1'den
   * baslayan sira numarasi. Cagiran surukleme tutamaci gibi ek icerik ekleyebilir. */
  renderRowHeader?: (row: T, index: number) => ReactNode;
  rowClassName?: (row: T, index: number) => string | undefined;
  rowDropHandlers?: (
    row: T,
    index: number,
  ) => Pick<HTMLAttributes<HTMLTableRowElement>, 'onDragOver' | 'onDrop'>;
  /** Son satirdaki bir metin hucresinde Enter'a basilinca cagrilir (yeni satir ekler);
   * yeni satir render edilince odak ayni kolondaki hucreye tasinir. Verilmezse son
   * satirda Enter hicbir sey yapmaz. */
  onAppendRow?: () => void;
  className?: string;
}

const FOCUSABLE_SELECTOR = 'input:not([disabled]), select:not([disabled])';

/**
 * Muhasebe/Excel uygulamalarindaki gibi "hucre ızgarası" gorunumlu, duzenlenebilir
 * tablo - `Table`'in aksine satirlar kart/liste degil, ince cizgili bir ızgaradir ve
 * hucre icindeki form alanlari kenarliksiz, hucreyi tamamen doldurur (stil:
 * index.css `.sheet-table`). Kolon tanimi `Table` ile aynidir (`TableColumn`), bu
 * yuzden ayni kolon listesi iki gorunum arasinda paylasilabilir.
 *
 * Klavye: metin hucrelerinde Enter / Yukari / Asagi oklari ayni kolonda bir ust/alt
 * satira gecer (Tab/Shift+Tab tarayici varsayilani ile soldan saga ilerler). Acik bir
 * acilir liste (autocomplete) oklari kendisi kullaniyorsa (`preventDefault`) gezinme
 * yapilmaz; native `<select>`'lerde oklar degeri degistirdigi icin gezinme yoktur.
 */
export function SheetTable<T>({
  columns,
  data,
  keyField,
  renderRowHeader,
  rowClassName,
  rowDropHandlers,
  onAppendRow,
  className,
}: SheetTableProps<T>) {
  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  // Son satirda Enter ile yeni satir eklenince, satir render edildikten sonra odaklanacak
  // kolon - render'i etkilemedigi icin state degil ref.
  const pendingFocusColumnRef = useRef<string | null>(null);

  function focusCell(rowIndex: number, columnKey: string): boolean {
    const cell = tbodyRef.current?.querySelector<HTMLElement>(
      `td[data-row="${rowIndex}"][data-col="${columnKey}"]`,
    );
    const target = cell?.querySelector<HTMLInputElement | HTMLSelectElement>(FOCUSABLE_SELECTOR);
    if (!target) return false;
    target.focus();
    if (target instanceof HTMLInputElement) target.select();
    return true;
  }

  useEffect(() => {
    const columnKey = pendingFocusColumnRef.current;
    if (columnKey === null) return;
    pendingFocusColumnRef.current = null;
    const cell = tbodyRef.current?.querySelector<HTMLElement>(
      `td[data-row="${data.length - 1}"][data-col="${columnKey}"]`,
    );
    cell?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus();
  }, [data.length]);

  function handleKeyDown(event: KeyboardEvent<HTMLTableSectionElement>) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (!(event.target instanceof HTMLInputElement)) return;
    const cell = event.target.closest<HTMLElement>('td[data-row]');
    const rowIndex = Number(cell?.dataset.row);
    const columnKey = cell?.dataset.col;
    if (!cell || Number.isNaN(rowIndex) || !columnKey) return;

    const isDown = event.key === 'ArrowDown' || (event.key === 'Enter' && !event.shiftKey);
    const isUp = event.key === 'ArrowUp' || (event.key === 'Enter' && event.shiftKey);
    if (!isDown && !isUp) return;

    // Enter dis <form>'u submit etmesin - tabloda Enter her zaman satir gezinmesidir.
    event.preventDefault();
    if (isUp) {
      focusCell(rowIndex - 1, columnKey);
      return;
    }
    if (focusCell(rowIndex + 1, columnKey)) return;
    if (event.key === 'Enter' && onAppendRow) {
      pendingFocusColumnRef.current = columnKey;
      onAppendRow();
    }
  }

  return (
    <div className={clsx('sheet-table overflow-x-auto border border-app-border', className)}>
      <table className="w-full min-w-[960px] table-fixed border-collapse text-sm">
        <thead>
          <tr>
            <th className="sheet-row-header w-10" aria-label="#">
              #
            </th>
            {columns.map((column) => (
              <th key={column.key} className={column.className}>
                {column.headerNode ?? column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody ref={tbodyRef} onKeyDown={handleKeyDown}>
          {data.map((row, index) => (
            <tr
              key={keyField(row, index)}
              {...rowDropHandlers?.(row, index)}
              className={clsx('group/sheet-row', rowClassName?.(row, index))}
            >
              <td className="sheet-row-header">
                {renderRowHeader ? renderRowHeader(row, index) : index + 1}
              </td>
              {columns.map((column) => (
                <td
                  key={column.key}
                  data-row={index}
                  data-col={column.key}
                  className={column.className}
                >
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
