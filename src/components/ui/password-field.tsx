import { Eye, EyeOff } from 'lucide-react';
import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  toggleLabels: { show: string; hide: string };
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField(
    { label, error, required, hint, id, className, toggleLabels, ...props },
    ref,
  ) {
    const [visible, setVisible] = useState(false);
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
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={visible ? 'text' : 'password'}
            className={clsx(
              'w-full rounded-lg border border-app-border bg-app-surface px-3.5 py-2.5 pr-10 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary',
              error && 'border-app-danger',
              className,
            )}
            aria-invalid={Boolean(error)}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? toggleLabels.hide : toggleLabels.show}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-app-muted hover:text-app-text"
            tabIndex={-1}
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {error ? (
          <p className="text-xs text-app-danger">{error}</p>
        ) : (
          hint && <p className="text-xs text-app-muted">{hint}</p>
        )}
      </div>
    );
  },
);
