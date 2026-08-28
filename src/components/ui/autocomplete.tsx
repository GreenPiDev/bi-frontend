import { clsx } from 'clsx';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

interface AutocompleteProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  error?: string;
}

/** Serbest metin girişine izin veren öneri listesi - A2 (tenant sektör tanımlamadıysa
 * serbest metin, tanımladıysa listeden seçim) ve M2 (bilinmeyen firma adı girişi) gibi
 * "listede yoksa da kabul et" senaryoları için ortak yapı taşı. */
export function Autocomplete({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
}: AutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = options.filter((option) =>
    option.toLowerCase().includes(value.trim().toLowerCase()),
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function selectOption(option: string) {
    onChange(option);
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || filtered.length === 0) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlighted((prev) => (prev + 1) % filtered.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted((prev) => (prev - 1 + filtered.length) % filtered.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      selectOption(filtered[highlighted]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="relative flex flex-col gap-1.5" ref={containerRef}>
      <label className="text-sm font-semibold text-app-muted">{label}</label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value);
          setHighlighted(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className={clsx(
          'rounded-lg border border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary',
          error && 'border-app-danger',
        )}
        aria-invalid={Boolean(error)}
      />
      {open && filtered.length > 0 && (
        <div className="absolute top-full z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-app-border bg-app-surface p-1 shadow-lg">
          {filtered.map((option, index) => (
            <button
              key={option}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectOption(option)}
              className={clsx(
                'block w-full rounded-md px-2.5 py-2 text-left text-sm text-app-text hover:bg-app-bg',
                index === highlighted && 'bg-app-bg',
              )}
            >
              {option}
            </button>
          ))}
        </div>
      )}
      {error && <p className="text-xs text-app-danger">{error}</p>}
    </div>
  );
}
