import { clsx } from 'clsx';
import { Pipette } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { tr } from '../../i18n/tr';

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

const PRESET_COLORS = [
  '#000000',
  '#16202e',
  '#5b6b81',
  '#ffffff',
  '#f8fafc',
  '#e8f5e9',
  '#e3f2fd',
  '#fff8e1',
  '#fde8e8',
  '#8bc34a',
  '#4caf50',
  '#2196f3',
  '#1e3a8a',
  '#9c27b0',
  '#ff9800',
  '#f44336',
];

/** Kullanicinin yazdigi metni "#rrggbb"ye cevirir - "#" yazilmadiysa ekler,
 * 3 haneli kisaltmayi (#abc) acar. Gecersizse oldugu gibi dondurur (form
 * dogrulamasi hatayi gosterir). */
function normalizeHex(input: string): string {
  const raw = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw
      .split('')
      .map((char) => char + char)
      .join('')}`.toLowerCase();
  }
  return `#${raw}`.toLowerCase();
}

interface ColorPickerFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
}

/**
 * Renk alani: tiklaninca acilan panelde hex kodu girisi (otomatik odak), hazir
 * renkler ve isletim sisteminin gelismis renk secicisi. Hata gosterimi diger form
 * alanlariyla ayni (kirmizi cerceve + mesaj, CLAUDE.md SS13).
 */
export function ColorPickerField({
  label,
  value,
  onChange,
  onBlur,
  error,
  disabled,
}: ColorPickerFieldProps) {
  const strings = tr.common.colorPicker;
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const hexInputRef = useRef<HTMLInputElement>(null);
  const nativeInputRef = useRef<HTMLInputElement>(null);
  const hexInputId = useId();
  const isValid = HEX_PATTERN.test(value);

  useEffect(() => {
    if (!isOpen) return;
    hexInputRef.current?.select();
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        onBlur?.();
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onBlur]);

  function open() {
    setDraft(value);
    setIsOpen(true);
  }

  function applyDraft(next: string) {
    setDraft(next);
    if (next.trim()) onChange(normalizeHex(next));
  }

  function pick(color: string) {
    setDraft(color);
    onChange(color);
  }

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1">
      <span className="text-xs font-semibold text-app-muted">{label}</span>
      <button
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-expanded={isOpen}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        className={clsx(
          'flex h-10 w-full cursor-pointer items-center gap-2 rounded-lg border bg-app-surface px-2 text-left text-sm outline-none focus:border-app-primary disabled:cursor-not-allowed disabled:opacity-60',
          error ? 'border-app-danger' : 'border-app-border',
        )}
      >
        <span
          className="h-6 w-8 shrink-0 rounded border border-black/10"
          style={{ backgroundColor: isValid ? value : 'transparent' }}
        />
        <span className="font-mono text-app-text uppercase">{value || '—'}</span>
      </button>
      {error && <p className="text-xs text-app-danger">{error}</p>}

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 flex w-60 flex-col gap-3 rounded-lg border border-app-border bg-app-surface p-3 shadow-lg">
          <div className="flex flex-col gap-1">
            <label htmlFor={hexInputId} className="text-xs font-semibold text-app-muted">
              {strings.hexLabel}
            </label>
            <div className="flex items-center gap-2">
              <span
                className="h-8 w-8 shrink-0 rounded border border-black/10"
                style={{ backgroundColor: isValid ? value : 'transparent' }}
              />
              <input
                ref={hexInputRef}
                id={hexInputId}
                value={draft}
                maxLength={7}
                spellCheck={false}
                placeholder="#1e3a8a"
                onChange={(event) => applyDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    setIsOpen(false);
                  }
                }}
                className={clsx(
                  'w-full rounded-lg border bg-app-surface px-2.5 py-1.5 font-mono text-sm text-app-text uppercase outline-none focus:border-app-primary',
                  isValid ? 'border-app-border' : 'border-app-danger',
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-8 gap-1.5">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                title={color}
                aria-label={color}
                onClick={() => pick(color)}
                className={clsx(
                  'h-6 w-6 cursor-pointer rounded border',
                  value.toLowerCase() === color
                    ? 'border-app-primary ring-2 ring-app-primary/40'
                    : 'border-black/10',
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => nativeInputRef.current?.click()}
            className="flex cursor-pointer items-center gap-2 self-start text-xs font-semibold text-app-brand hover:underline"
          >
            <Pipette size={14} />
            {strings.moreColors}
          </button>
          <input
            ref={nativeInputRef}
            type="color"
            tabIndex={-1}
            aria-hidden="true"
            value={isValid ? value : '#000000'}
            onChange={(event) => pick(event.target.value)}
            className="pointer-events-none absolute h-0 w-0 opacity-0"
          />
        </div>
      )}
    </div>
  );
}
