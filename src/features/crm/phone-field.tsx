import { clsx } from 'clsx';
import { useState, type ChangeEvent } from 'react';

const COUNTRY_CODES = [
  { code: '+90', flag: '🇹🇷', label: 'Türkiye' },
  { code: '+1', flag: '🇺🇸', label: 'ABD' },
  { code: '+49', flag: '🇩🇪', label: 'Almanya' },
  { code: '+44', flag: '🇬🇧', label: 'İngiltere' },
  { code: '+33', flag: '🇫🇷', label: 'Fransa' },
];

function splitPhone(value: string): { code: string; number: string } {
  const match = value.trim().match(/^(\+\d{1,3})\s*(.*)$/);
  if (match) {
    return { code: match[1], number: match[2] };
  }
  return { code: COUNTRY_CODES[0].code, number: value };
}

/** Girilen ham rakamlardan "5xx xxx xx xx" goruntu/kayit metnini uretir -
 * Sabit Hat alanindaki formatlama deseniyle ayni yaklasim. */
function formatNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  const p1 = digits.slice(0, 3);
  const p2 = digits.slice(3, 6);
  const p3 = digits.slice(6, 8);
  const p4 = digits.slice(8, 10);
  return [p1, p2, p3, p4].filter(Boolean).join(' ');
}

interface PhoneFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  hint?: string;
}

/** A3: ülke kodu seçimiyle birlikte telefon girişi. Mevcut serbest metin `phone`
 * alanına `+90 5xx xxx xx xx` gibi formatlanmış tek bir string olarak yazılır -
 * backend'de şema değişikliği gerekmedi (bkz. VARSAYIMLAR V18). */
export function PhoneField({ label, value, onChange, error, required, hint }: PhoneFieldProps) {
  const [prevValue, setPrevValue] = useState(value);
  const [code, setCode] = useState(() => splitPhone(value).code);
  const [number, setNumber] = useState(() => splitPhone(value).number.replace(/\D/g, ''));

  // Dışarıdan (form reset) gelen değer değiştiğinde yerel state'i senkronize eder -
  // effect yerine render sırasında yapılır (React'in "adjusting state on prop
  // change" deseni), gereksiz ek render turunu önler.
  if (value !== prevValue) {
    setPrevValue(value);
    const split = splitPhone(value);
    setCode(split.code);
    setNumber(split.number.replace(/\D/g, ''));
  }

  const displayNumber = formatNumber(number);

  function emit(nextCode: string, nextNumberDigits: string) {
    const formatted = formatNumber(nextNumberDigits);
    onChange(formatted ? `${nextCode} ${formatted}`.trim() : '');
  }

  function handleNumberChange(event: ChangeEvent<HTMLInputElement>) {
    let newDigits = event.target.value.replace(/\D/g, '').slice(0, 10);
    // Sabit Hat alanindakiyle ayni zincirleme silme duzeltmesi: sadece
    // bicimlendirme bosluğu silindiyse (rakam sayisi degismediyse) son
    // rakami da dusur, aksi halde backspace hicbir sey silmiyormus gibi gorunur.
    if (newDigits.length === number.length && event.target.value.length < displayNumber.length) {
      newDigits = newDigits.slice(0, -1);
    }
    setNumber(newDigits);
    emit(code, newDigits);
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
      <div className="flex gap-2">
        <select
          value={code}
          onChange={(event) => {
            setCode(event.target.value);
            emit(event.target.value, number);
          }}
          className="w-28 shrink-0 rounded-lg border border-app-border bg-app-surface px-2 py-2.5 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
        >
          {COUNTRY_CODES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.flag} {country.code}
            </option>
          ))}
        </select>
        <input
          type="tel"
          value={displayNumber}
          onChange={handleNumberChange}
          placeholder="5xx xxx xx xx"
          className={clsx(
            'flex-1 rounded-lg border border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary',
            error && 'border-app-danger',
          )}
        />
      </div>
      {error ? (
        <p className="text-xs text-app-danger">{error}</p>
      ) : (
        hint && <p className="text-xs text-app-muted">{hint}</p>
      )}
    </div>
  );
}
