import { clsx } from 'clsx';
import { ChevronDown, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { tr } from '../../i18n/tr';
import type { SelectOption } from './select';

interface MultiSelectProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  required?: boolean;
  hint?: string;
  /** Secilen degerleri, alanin altinda kaldirma (X) ikonlu etiketler halinde de gosterir. */
  showChips?: boolean;
  /**
   * Chip gorunumu. 'muted' (varsayilan): acik gri arka plan. 'solid': settings
   * sayfasindaki (crm-settings-section.tsx) OptionListManager etiketleriyle ayni
   * dolu-renkli stil - ornegin /projeler duzenleme formundaki Teklifler alani icin.
   */
  chipVariant?: 'muted' | 'solid';
  /** Dropdown acildiginda ustte bir arama kutusu gosterir, yazildikca secenekleri filtreler. */
  searchable?: boolean;
  /**
   * 'fixed' (varsayilan): liste, buton konumuna gore ekranin ustune bindirilir (overlay) -
   * modal icindeki `overflow-auto` kirpmasini asmak icin; viewport disina tasan kisim
   * gorulemez. 'absolute': liste butonun hemen altina, normal CSS `position: absolute` ile
   * konumlanir - kendi ic scroll'u/yukseklik siniri yoktur, dialog'un sinirlarini asarak
   * tasabilir. Ust konteyner (`Modal`'in `allowPageScroll` modu gibi) `overflow` kirpmasi
   * uygulamiyorsa, tasan kisim sayfa/backdrop kaydirilarak gorulebilir.
   */
  menuPosition?: 'fixed' | 'absolute';
}

/** A4: dropdown alanlarda çoklu seçim (ör. bir firma hem müşteri hem tedarikçi olabilir).
 *
 * Secenek listesi `position: fixed` ile butonun ekran konumuna gore konumlanir - `Modal`
 * icerigi `overflow-auto` oldugu icin (bkz. modal.tsx), `absolute` konumlandirma listeyi
 * kirpip modal'in kendisini kaydirmaya zorluyordu; `fixed` bu clipping context'inin disina
 * cikar. */
export function MultiSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Seçiniz',
  error,
  required,
  hint,
  showChips,
  chipVariant = 'muted',
  searchable,
  menuPosition = 'fixed',
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );
  const [filterText, setFilterText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
    if (!open || menuPosition !== 'fixed') return;

    function updateRect() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuRect({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [open, menuPosition]);

  const filteredOptions = useMemo(() => {
    if (!searchable || !filterText.trim()) return options;
    const needle = filterText.trim().toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(needle));
  }, [options, searchable, filterText]);

  function toggleValue(optionValue: string) {
    onChange(
      value.includes(optionValue)
        ? value.filter((v) => v !== optionValue)
        : [...value, optionValue],
    );
  }

  const selectedLabels = options
    .filter((option) => value.includes(option.value))
    .map((option) => option.label)
    .join(', ');

  return (
    <div className="relative flex flex-col gap-1.5" ref={containerRef}>
      <span className="text-sm font-semibold text-app-muted">
        {label}
        {required && (
          <span className="ml-0.5 text-app-danger" aria-hidden="true">
            *
          </span>
        )}
      </span>
      <button
        ref={buttonRef}
        type="button"
        onClick={() =>
          setOpen((prev) => {
            if (prev) setFilterText('');
            return !prev;
          })
        }
        className={clsx(
          'flex cursor-pointer items-center justify-between rounded-lg border border-app-border bg-app-surface px-3.5 py-2.5 text-left text-sm outline-none focus:border-app-primary',
          error && 'border-app-danger',
          value.length === 0 ? 'text-app-muted' : 'text-app-text',
        )}
      >
        <span className="truncate">{selectedLabels || placeholder}</span>
        <ChevronDown size={16} className="shrink-0 text-app-muted" />
      </button>
      {open && (menuPosition === 'absolute' || menuRect) && (
        <div
          style={
            menuPosition === 'fixed' && menuRect
              ? { position: 'fixed', top: menuRect.top, left: menuRect.left, width: menuRect.width }
              : undefined
          }
          className={clsx(
            'z-[200] rounded-lg border border-app-border bg-app-surface p-1.5 shadow-lg',
            menuPosition === 'fixed'
              ? 'max-h-60 overflow-auto'
              : 'absolute top-full left-0 mt-1 w-full',
          )}
        >
          {searchable && (
            <div className="relative mb-1.5">
              <Search
                size={14}
                className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-app-muted"
              />
              <input
                ref={searchInputRef}
                type="text"
                autoFocus
                value={filterText}
                onChange={(event) => setFilterText(event.target.value)}
                placeholder={tr.common.multiSelectSearchPlaceholder}
                className="w-full rounded-md border border-app-border bg-app-bg py-1.5 pr-2.5 pl-7 text-sm outline-none focus:border-app-primary"
              />
            </div>
          )}
          {filteredOptions.length === 0 ? (
            <p className="px-2.5 py-2 text-sm text-app-muted">{tr.common.multiSelectNoResults}</p>
          ) : (
            filteredOptions.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-app-text hover:bg-app-bg"
              >
                <input
                  type="checkbox"
                  checked={value.includes(option.value)}
                  onChange={() => toggleValue(option.value)}
                  className="accent-app-primary"
                />
                {option.label}
              </label>
            ))
          )}
        </div>
      )}
      {showChips && value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {options
            .filter((option) => value.includes(option.value))
            .map((option) => (
              <span
                key={option.value}
                className={clsx(
                  'flex items-center gap-1 font-medium',
                  chipVariant === 'solid'
                    ? 'rounded-md bg-app-primary py-1 pr-1.5 pl-2.5 text-sm text-white'
                    : 'rounded-full bg-app-bg-muted py-1 pr-1.5 pl-3 text-xs text-app-text',
                )}
              >
                {option.chipLabel ?? option.label}
                <button
                  type="button"
                  onClick={() => toggleValue(option.value)}
                  aria-label={`${option.chipLabel ?? option.label} kaldır`}
                  className={clsx(
                    'inline-flex items-center justify-center rounded-full',
                    chipVariant === 'solid'
                      ? 'h-5 w-5 text-white/80 hover:bg-white/15 hover:text-white'
                      : 'h-4 w-4 text-app-muted hover:bg-app-danger/10 hover:text-app-danger',
                  )}
                >
                  <X size={chipVariant === 'solid' ? 12 : 10} />
                </button>
              </span>
            ))}
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
