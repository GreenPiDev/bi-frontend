import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';
import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ClearFieldButton } from './clear-field-button';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  hint?: string;
  /** Filtre alanlarinda opt-in tekil sifirlama butonu - verilince select'in tarayici
   * varsayilan oku yerine ozel bir ChevronDown + (deger varsa) sifirlama butonu
   * gosterilir; `onClear` verilmeden hicbir sey render edilmez, formlardaki mevcut
   * kullanimlari etkilemez. */
  clearable?: boolean;
  onClear?: () => void;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    label,
    error,
    required,
    hint,
    id,
    className,
    options,
    placeholder,
    clearable,
    onClear,
    ...props
  },
  ref,
) {
  const selectId = id ?? props.name;
  const showClear = clearable && Boolean(onClear) && Boolean(props.value);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-sm font-semibold text-app-muted">
        {label}
        {required && (
          <span className="ml-0.5 text-app-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          className={clsx(
            'w-full rounded-lg border border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary',
            clearable && 'appearance-none pr-16',
            error && 'border-app-danger',
            className,
          )}
          aria-invalid={Boolean(error)}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {clearable && (
          <div className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2">
            <ChevronDown size={16} className="text-app-muted" />
          </div>
        )}
        {showClear && (
          <div className="absolute top-1/2 right-8 -translate-y-1/2">
            <ClearFieldButton onClick={() => onClear?.()} label={label} />
          </div>
        )}
      </div>
      {error ? (
        <p className="text-xs text-app-danger">{error}</p>
      ) : (
        hint && <p className="text-xs text-app-muted">{hint}</p>
      )}
    </div>
  );
});
