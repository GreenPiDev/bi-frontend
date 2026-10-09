import { clsx } from 'clsx';
import { CalendarDays } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Calendar } from './calendar';

interface DateTimeFieldProps {
  label: string;
  /** Native <input type="datetime-local"> ile ayni format: '' | 'YYYY-MM-DDTHH:mm'. */
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  hint?: string;
  error?: string;
  /** true ise bugunden sonraki tarihler takvimde secilemez. */
  disableFutureDates?: boolean;
}

function todayIso(): string {
  const now = new Date();
  const y = String(now.getFullYear()).padStart(4, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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
const MENU_MARGIN = 8;

/** Tarih kismi icin ozel Calendar acilir penceresi + saat icin native <input type="time">
 * - datetime-local'in tarayicidan tarayiciya degisen yerel takvim gorunumu yerine.
 *
 * Takvim `position: fixed` ile butonun ekran konumuna gore konumlanir - Modal icerigi
 * `overflow-auto` oldugu icin (bkz. modal.tsx), `absolute` konumlandirma listeyi kirpardi
 * (ayni gerekce icin bkz. multi-select.tsx). ONEMLI: `position: fixed` oldugu icin takvim
 * normal akistan tamamen cikar ve hicbir ust elemanin (sayfa veya Modal'in `allowPageScroll`
 * backdrop'u) scrollHeight'ina katkida bulunmaz - yani takvim viewport disina tasarsa, ne
 * sayfa ne de modal kaydirarak gorunur hale getirilemez (eskiden denenen spacer+scrollBy
 * yontemi tam olarak bu yuzden calismiyordu, ozellikle Modal'in `fixed` backdrop'u icinde
 * window scroll'unun hicbir gorsel etkisi yok). Takvim HER ZAMAN butonun ALTINDA acilir
 * (bilerek flip/ustte acma yok - kullanici bildirimi); sadece viewport'a sigmayacak kadar
 * az yer kalmissa dikeyde viewport icine kirpilir (clamp) - MultiSelect/Select
 * dropdown'larinin ayni "her zaman ekranda kal" davranisiyla tutarli. */
export function DateTimeField({
  label,
  value,
  onChange,
  required,
  hint,
  error,
  disableFutureDates,
}: DateTimeFieldProps) {
  const buttonId = useId();
  const [open, setOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<{ top: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [datePart = '', timePart = ''] = value ? value.split('T') : [];

  function closeMenu() {
    setOpen(false);
    setMenuRect(null);
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
      const maxLeft = window.innerWidth - CALENDAR_WIDTH - MENU_MARGIN;
      const left = Math.max(MENU_MARGIN, Math.min(rect.left, maxLeft));
      // Takvimin gercek yuksekligi henuz bilinmiyor (ilk acilista menuRef daha render
      // edilmedi) - asagidaki useLayoutEffect, render sonrasi gercek yukseklikle bu
      // baslangic degerini duzeltir (flip/clamp).
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

  useLayoutEffect(() => {
    if (!open || !menuRect) return;
    const menu = menuRef.current;
    const button = buttonRef.current;
    if (!menu || !button) return;
    const buttonRect = button.getBoundingClientRect();
    const menuHeight = menu.offsetHeight;
    const spaceBelow = window.innerHeight - buttonRect.bottom;
    // Her zaman butonun ALTINDA acilir (eski davranis) - sadece viewport'tan tasacak
    // kadar az yer kalmissa (cok kisa bir ekran) dikeyde viewport icine kirpilir
    // (clamp), butonun UZERINE flip edilmez.
    const fitsBelow = spaceBelow >= menuHeight + MENU_MARGIN;
    const top = fitsBelow
      ? buttonRect.bottom + 4
      : Math.max(MENU_MARGIN, window.innerHeight - menuHeight - MENU_MARGIN);
    if (Math.round(top) !== Math.round(menuRect.top)) {
      setMenuRect((prev) => (prev ? { ...prev, top } : prev));
    }
  }, [open, menuRect]);

  function handleSelectDate(isoDate: string) {
    const defaultTime = timePart || new Date().toTimeString().slice(0, 5);
    onChange(`${isoDate}T${defaultTime}`);
    closeMenu();
  }

  function handleTimeChange(newTime: string) {
    if (!datePart) {
      return;
    }
    onChange(`${datePart}T${newTime}`);
  }

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      <label htmlFor={buttonId} className="text-sm font-semibold text-app-muted">
        {label}
        {required && (
          <span className="ml-0.5 text-app-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <button
            ref={buttonRef}
            id={buttonId}
            type="button"
            aria-label={label}
            onClick={() => (open ? closeMenu() : setOpen(true))}
            className={clsx(
              'flex w-full cursor-pointer items-center justify-between rounded-lg border border-app-border bg-app-surface px-3.5 py-2.5 text-left text-sm outline-none focus:border-app-primary',
              error && 'border-app-danger',
              datePart ? 'text-app-text' : 'text-app-muted',
            )}
          >
            <span>{formatDateDisplay(datePart) || 'Tarih seçin'}</span>
            <CalendarDays size={16} className="shrink-0 text-app-muted" />
          </button>
          {open && menuRect && (
            <div
              ref={menuRef}
              style={{ position: 'fixed', top: menuRect.top, left: menuRect.left }}
              className="z-[200]"
            >
              <Calendar
                value={datePart}
                onSelect={handleSelectDate}
                maxDate={disableFutureDates ? todayIso() : undefined}
              />
            </div>
          )}
        </div>
        <input
          type="time"
          value={timePart}
          onChange={(event) => handleTimeChange(event.target.value)}
          disabled={!datePart}
          aria-label="Saat"
          className={clsx(
            'w-32 rounded-lg border border-app-border bg-app-surface px-3 py-2.5 text-sm text-app-text outline-none focus:border-app-primary disabled:opacity-50',
            error && 'border-app-danger',
          )}
        />
      </div>
      {error ? (
        <p className="text-xs text-app-danger">{error}</p>
      ) : (
        hint && <p className="text-xs text-app-muted">{hint}</p>
      )}
    </div>
  );
}
