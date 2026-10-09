import { clsx } from 'clsx';
import { forwardRef, type InputHTMLAttributes } from 'react';
import { ClearFieldButton } from './clear-field-button';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  /** Alan doldurulmak zorundaysa etiketin yanına kırmızı bir "*" ekler - salt
   * görsel, gerçek zorunluluk Zod şemasında tanımlıdır. */
  required?: boolean;
  /** Girdiden beklenen format/örneği anlatan kısa yardım metni - hata yokken input'un
   * hemen altında gösterilir, hata varsa yerini hataya bırakır. */
  hint?: string;
  /** Filtre alanlarinda opt-in tekil sifirlama butonu - `onClear` de verilmeden
   * hicbir sey render edilmez, formlardaki mevcut kullanimlari etkilemez. */
  clearable?: boolean;
  onClear?: () => void;
  /** Input'un solunda sabit, duzenlenemez bir isaret gosterir (ornek: azaltma
   * miktari girilirken "-" isareti) - sadece gorsel, gercek deger hala pozitif girilir. */
  prefix?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, required, hint, id, className, clearable, onClear, prefix, ...props },
  ref,
) {
  const inputId = id ?? props.name;
  const showClear = clearable && Boolean(onClear) && Boolean(props.value);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-semibold text-app-muted">
        {label}
        {required && (
          <span className="ml-0.5 text-app-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <div className="relative">
        {prefix && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm font-semibold text-app-muted"
          >
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full rounded-lg border border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-text outline-none focus:border-app-primary disabled:cursor-not-allowed',
            clearable && 'pr-9',
            prefix && 'pl-7',
            error && 'border-app-danger',
            className,
          )}
          aria-invalid={Boolean(error)}
          {...props}
        />
        {showClear && (
          <div className="absolute top-1/2 right-2.5 -translate-y-1/2">
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
