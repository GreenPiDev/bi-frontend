import { clsx } from 'clsx';
import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

interface DarkTextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  required?: boolean;
}

const LABEL_CLASS = 'text-sm font-medium text-slate-300';
const FIELD_CLASS =
  'w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-blue-400/60 focus:bg-white/[0.07]';

/** Demo talebi formuna ozel, tanitim sayfasinin koyu/cam temasiyla uyumlu input -
 * paylasilan components/ui/text-field.tsx acik temaya sabit, bu sayfada sadece burada
 * kullanilan kucuk bir varyant yeterli (bkz. dark-field.tsx'in diger kullanicisi yok). */
export const DarkTextField = forwardRef<HTMLInputElement, DarkTextFieldProps>(
  function DarkTextField({ label, error, required, id, className, ...props }, ref) {
    const inputId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className={LABEL_CLASS}>
          {label}
          {required && (
            <span className="ml-0.5 text-red-400" aria-hidden="true">
              *
            </span>
          )}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={clsx(FIELD_CLASS, error && 'border-red-400/60', className)}
          aria-invalid={Boolean(error)}
          {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  },
);

interface DarkTextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const DarkTextareaField = forwardRef<HTMLTextAreaElement, DarkTextareaFieldProps>(
  function DarkTextareaField({ label, error, id, className, ...props }, ref) {
    const inputId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className={LABEL_CLASS}>
          {label}
        </label>
        <textarea
          ref={ref}
          id={inputId}
          rows={3}
          className={clsx(FIELD_CLASS, 'resize-none', error && 'border-red-400/60', className)}
          aria-invalid={Boolean(error)}
          {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  },
);
