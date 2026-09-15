import { clsx } from 'clsx';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

/** Genel amacli acik/kapali anahtar - rol izin matrisi (Roller sekmesi) gibi
 * ikili durumlarin toplu gosterildigi yerlerde kullanilir. */
export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative inline-flex h-[22px] w-10 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        checked ? 'bg-app-brand' : 'bg-app-danger',
      )}
    >
      <span
        className={clsx(
          'inline-flex h-[18px] w-[18px] transform items-center justify-center rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-[18px]' : 'translate-x-0.5',
        )}
      >
        {checked ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            className="h-2.5 w-2.5 text-app-brand"
          >
            <path d="M4 12l5 5L20 6" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            className="h-2.5 w-2.5 text-app-danger"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        )}
      </span>
    </button>
  );
}
