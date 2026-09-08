import { clsx } from 'clsx';
import { CalendarDays } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Calendar } from './calendar';

interface DateTimeFieldProps {
  label: string;
  /** Native <input type="datetime-local"> ile ayni format: '' | 'YYYY-MM-DDTHH:mm'. */
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

/** Tarih kismi icin ozel Calendar acilir penceresi + saat icin native <input type="time">
 * - datetime-local'in tarayicidan tarayiciya degisen yerel takvim gorunumu yerine.
 *
 * Takvim `position: fixed` ile butonun ekran konumuna gore konumlanir - Modal icerigi
 * `overflow-auto` oldugu icin (bkz. modal.tsx), `absolute` konumlandirma listeyi kirpardi
 * (ayni gerekce icin bkz. multi-select.tsx). */
export function DateTimeField({
  label,
  value,
  onChange,
  required,
  hint,
  error,
}: DateTimeFieldProps) {
  const buttonId = useId();
  const [open, setOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<{ top: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [datePart = '', timePart = ''] = value ? value.split('T') : [];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
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
      setMenuRect({ top: rect.bottom + 4, left: rect.left });
    }
    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [open]);

  function handleSelectDate(isoDate: string) {
    const defaultTime = timePart || new Date().toTimeString().slice(0, 5);
    onChange(`${isoDate}T${defaultTime}`);
    setOpen(false);
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
            onClick={() => setOpen((prev) => !prev)}
            className={clsx(
              'flex w-full items-center justify-between rounded-lg border border-app-border bg-app-surface px-3.5 py-2.5 text-left text-sm outline-none focus:ring-2 focus:ring-app-primary',
              error && 'border-app-danger',
              datePart ? 'text-app-text' : 'text-app-muted',
            )}
          >
            <span>{formatDateDisplay(datePart) || 'Tarih seçin'}</span>
            <CalendarDays size={16} className="shrink-0 text-app-muted" />
          </button>
          {open && menuRect && (
            <div
              style={{ position: 'fixed', top: menuRect.top, left: menuRect.left }}
              className="z-[200]"
            >
              <Calendar value={datePart} onSelect={handleSelectDate} />
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
            'w-32 rounded-lg border border-app-border bg-app-surface px-3 py-2.5 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary disabled:opacity-50',
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
