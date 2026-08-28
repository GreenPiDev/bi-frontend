import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { SelectOption } from './select';

interface MultiSelectProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
}

/** A4: dropdown alanlarda çoklu seçim (ör. bir firma hem müşteri hem tedarikçi olabilir). */
export function MultiSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Seçiniz',
  error,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      <span className="text-sm font-semibold text-app-muted">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={clsx(
          'flex items-center justify-between rounded-lg border border-app-border bg-app-surface px-3.5 py-2.5 text-left text-sm outline-none focus:ring-2 focus:ring-app-primary',
          error && 'border-app-danger',
          value.length === 0 ? 'text-app-muted' : 'text-app-text',
        )}
      >
        <span className="truncate">{selectedLabels || placeholder}</span>
        <ChevronDown size={16} className="shrink-0 text-app-muted" />
      </button>
      {open && (
        <div className="absolute top-full z-20 mt-1 w-full rounded-lg border border-app-border bg-app-surface p-1.5 shadow-lg">
          {options.map((option) => (
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
          ))}
        </div>
      )}
      {error && <p className="text-xs text-app-danger">{error}</p>}
    </div>
  );
}
