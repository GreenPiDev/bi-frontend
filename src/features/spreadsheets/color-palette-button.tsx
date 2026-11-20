import { clsx } from 'clsx';
import { Ban, ChevronDown, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { tr } from '../../i18n/tr';

/** Excel'in standart paletine yakin, okunur hazir renkler. */
const PALETTE = [
  '#000000',
  '#434343',
  '#666666',
  '#999999',
  '#CCCCCC',
  '#FFFFFF',
  '#C00000',
  '#FF0000',
  '#FFC000',
  '#FFFF00',
  '#92D050',
  '#00B050',
  '#00B0F0',
  '#0070C0',
  '#002060',
  '#7030A0',
  '#F4CCCC',
  '#FCE5CD',
  '#FFF2CC',
  '#D9EAD3',
  '#D0E0E3',
  '#CFE2F3',
  '#D9D2E9',
  '#EAD1DC',
];

interface ColorPaletteButtonProps {
  icon: LucideIcon;
  label: string;
  /** Simgenin altindaki serit rengi - secili hucrenin mevcut rengi. */
  currentColor: string | null;
  disabled?: boolean;
  onSelect: (color: string | null) => void;
}

export function ColorPaletteButton({
  icon: Icon,
  label,
  currentColor,
  disabled,
  onSelect,
}: ColorPaletteButtonProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function choose(color: string | null) {
    onSelect(color);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={label}
        title={label}
        disabled={disabled}
        // Izgaranin secimini/odagini kaybetmemek icin mousedown'da odak alinmaz.
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-lg border border-app-border bg-app-surface px-2 py-1.5 text-app-text hover:bg-app-bg disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="flex flex-col items-center">
          <Icon size={16} />
          <span
            className="mt-0.5 h-1 w-4 rounded-sm border border-app-border"
            style={{ backgroundColor: currentColor ?? 'transparent' }}
          />
        </span>
        <ChevronDown size={14} className="text-app-muted" />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={label}
          onMouseDown={(event) => event.preventDefault()}
          className="absolute top-full left-0 z-40 mt-1 w-56 rounded-xl border border-app-border bg-app-surface p-3 shadow-lg"
        >
          <button
            type="button"
            onClick={() => choose(null)}
            className="mb-2 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-app-text hover:bg-app-bg"
          >
            <Ban size={14} className="text-app-muted" />
            {tr.spreadsheets.toolbar.noColor}
          </button>
          <div className="grid grid-cols-6 gap-1.5">
            {PALETTE.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={color}
                title={color}
                onClick={() => choose(color)}
                className={clsx(
                  'h-7 w-7 rounded-md border border-app-border hover:scale-110',
                  currentColor === color && 'ring-2 ring-app-brand ring-offset-1',
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <label className="mt-3 flex items-center justify-between text-xs text-app-muted">
            <span>{label}</span>
            <input
              type="color"
              value={currentColor ?? '#000000'}
              onChange={(event) => choose(event.target.value.toUpperCase())}
              className="h-7 w-10 cursor-pointer rounded border border-app-border bg-transparent"
            />
          </label>
        </div>
      )}
    </div>
  );
}
