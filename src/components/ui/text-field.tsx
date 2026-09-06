import { clsx } from 'clsx';
import { forwardRef, type InputHTMLAttributes } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  /** Alan doldurulmak zorundaysa etiketin yanına kırmızı bir "*" ekler - salt
   * görsel, gerçek zorunluluk Zod şemasında tanımlıdır. */
  required?: boolean;
  /** Girdiden beklenen format/örneği anlatan kısa yardım metni - hata yokken input'un
   * hemen altında gösterilir, hata varsa yerini hataya bırakır. */
  hint?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, required, hint, id, className, ...props },
  ref,
) {
  const inputId = id ?? props.name;
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
      <input
        ref={ref}
        id={inputId}
        className={clsx(
          'rounded-lg border border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary',
          error && 'border-app-danger',
          className,
        )}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error ? (
        <p className="text-xs text-app-danger">{error}</p>
      ) : (
        hint && <p className="text-xs text-app-muted">{hint}</p>
      )}
    </div>
  );
});
