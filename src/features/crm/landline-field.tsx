import { clsx } from 'clsx';
import type { ChangeEvent } from 'react';

/** Girilen ham rakamlardan "0(XXX) XXX XX XX" goruntu metnini uretir. */
function formatLandline(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const areaAndNumber = digits.startsWith('0') ? digits.slice(1) : digits;
  const area = areaAndNumber.slice(0, 3);
  const rest = areaAndNumber.slice(3, 10);
  let display = `0(${area}`;
  if (area.length === 3) {
    display += ')';
  }
  if (rest) {
    const p1 = rest.slice(0, 3);
    const p2 = rest.slice(3, 5);
    const p3 = rest.slice(5, 7);
    display += ` ${[p1, p2, p3].filter(Boolean).join(' ')}`;
  }
  return display;
}

/** Goruntu metninden (veya ham input event degerinden) DB'ye giden "0" +
 * 10 haneli alan kodu/numara birlesimini cikarir (orn. "03122605125"). */
function toRawDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const tail = (digits.startsWith('0') ? digits.slice(1) : digits).slice(0, 10);
  return tail ? `0${tail}` : '';
}

interface LandlineFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  hint?: string;
}

/** Firma sabit hat numarasi - "0(312) 260 51 25" seklinde formatlanarak
 * gosterilir, DB'ye ham "03122605125" olarak yazilir. PhoneField'dan farkli
 * olarak ulke kodu secimi yok, sadece yerel sabit hat formati. */
export function LandlineField({
  label,
  value,
  onChange,
  error,
  required,
  hint,
}: LandlineFieldProps) {
  const display = value ? formatLandline(value) : '';

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const previousDigits = value.replace(/\D/g, '');
    let newDigits = event.target.value.replace(/\D/g, '');
    // Sadece bicimlendirme karakteri (parantez/bosluk) silindiginde rakam
    // sayisi degismez - bu durumda kullanicinin niyeti aslinda bir onceki
    // rakami silmektir, o yuzden zincirleme olarak son rakami da dusuruyoruz.
    if (newDigits.length === previousDigits.length && event.target.value.length < display.length) {
      newDigits = newDigits.slice(0, -1);
    }
    onChange(toRawDigits(newDigits));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-app-muted">
        {label}
        {required && (
          <span className="ml-0.5 text-app-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <input
        type="tel"
        value={display}
        onChange={handleChange}
        placeholder="0(___) ___ __ __"
        className={clsx(
          'rounded-lg border border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary',
          error && 'border-app-danger',
        )}
      />
      {error ? (
        <p className="text-xs text-app-danger">{error}</p>
      ) : (
        hint && <p className="text-xs text-app-muted">{hint}</p>
      )}
    </div>
  );
}
