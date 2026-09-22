import { clsx } from 'clsx';
import { CalendarDays } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Calendar } from './calendar';

interface DateFieldProps {
  label: string;
  /** Native <input type="date"> ile ayni format: '' | 'YYYY-MM-DD'. */
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  hint?: string;
  error?: string;
}

function formatDateDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) {
    return '';
  }
  return `${day}.${month}.${year}`;
}

// Calendar bileseninin sabit genisligi (calendar.tsx'teki `w-72`) ile ayni - takvim ekranin
// sag kenarindan tasarsa sola kaydirmak icin kullanilir.
const CALENDAR_WIDTH = 288;
const MENU_HORIZONTAL_MARGIN = 8;

/** Saat tasimayan tarih alanlari icin ozel Calendar acilir penceresi - datetime-local
 * icin ayni deseni kullanan DateTimeField'in saatsiz eslenigi.
 *
 * Takvim `position: fixed` ile butonun ekran konumuna gore konumlanir - Modal icerigi
 * `overflow-auto` oldugu icin (bkz. modal.tsx), `absolute` konumlandirma listeyi kirpardi
 * (ayni gerekce icin bkz. multi-select.tsx). Takvim her zaman butonun altinda acilir;
 * sayfanin altina tasarsa (sayfa zaten kendi sonuna kadar scroll edilmisse), gecici bir
 * spacer eklenip otomatik asagi scroll edilir ki tasan kisim gorunur olsun. menuRect,
 * her kapanista sifirlanir - aksi halde bir sonraki acilista onceki (zaten scroll ile
 * duzeltilmis) konum kullanilir ve tasma tekrar hesaplanmadigi icin scroll calismaz. */
export function DateField({ label, value, onChange, required, hint, error }: DateFieldProps) {
  const buttonId = useId();
  const [open, setOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<{ top: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement | null>(null);
  const hasAdjustedScrollRef = useRef(false);

  function closeMenu() {
    setOpen(false);
    setMenuRect(null);
    hasAdjustedScrollRef.current = false;
    spacerRef.current?.remove();
    spacerRef.current = null;
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;

    function updateRect() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const maxLeft = window.innerWidth - CALENDAR_WIDTH - MENU_HORIZONTAL_MARGIN;
      const left = Math.max(MENU_HORIZONTAL_MARGIN, Math.min(rect.left, maxLeft));
      setMenuRect({ top: rect.bottom + 4, left });
    }
    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [open]);

  useEffect(() => {
    return () => {
      spacerRef.current?.remove();
    };
  }, []);

  useLayoutEffect(() => {
    if (!open || !menuRect || hasAdjustedScrollRef.current) return;
    const menu = menuRef.current;
    if (!menu) return;
    hasAdjustedScrollRef.current = true;
    const overflow = menuRect.top + menu.offsetHeight - window.innerHeight;
    if (overflow > 0) {
      const spacer = document.createElement('div');
      spacer.style.height = `${overflow + 16}px`;
      document.body.appendChild(spacer);
      spacerRef.current = spacer;
      window.scrollBy({ top: overflow + 16, behavior: 'smooth' });
    }
  }, [open, menuRect]);

  function handleSelectDate(isoDate: string) {
    onChange(isoDate);
    closeMenu();
  }

  return (
    <div className="relative flex flex-col gap-1.5" ref={containerRef}>
      <label htmlFor={buttonId} className="text-sm font-semibold text-app-muted">
        {label}
        {required && (
          <span className="ml-0.5 text-app-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <button
        ref={buttonRef}
        id={buttonId}
        type="button"
        aria-label={label}
        onClick={() => (open ? closeMenu() : setOpen(true))}
        className={clsx(
          'flex w-full items-center justify-between rounded-lg border border-app-border bg-app-surface px-3.5 py-2.5 text-left text-sm outline-none focus:ring-2 focus:ring-app-primary',
          error && 'border-app-danger',
          value ? 'text-app-text' : 'text-app-muted',
        )}
      >
        <span>{formatDateDisplay(value) || 'Tarih seçin'}</span>
        <CalendarDays size={16} className="shrink-0 text-app-muted" />
      </button>
      {open && menuRect && (
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: menuRect.top, left: menuRect.left }}
          className="z-[200]"
        >
          <Calendar value={value} onSelect={handleSelectDate} />
        </div>
      )}
      {error ? (
        <p className="text-xs text-app-danger">{error}</p>
      ) : (
        hint && <p className="text-xs text-app-muted">{hint}</p>
      )}
    </div>
  );
}
