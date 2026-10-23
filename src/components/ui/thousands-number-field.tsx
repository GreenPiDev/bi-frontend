import { type ChangeEvent } from 'react';
import { TextField } from './text-field';

interface ThousandsNumberFieldProps {
  label: string;
  /** Ham sayısal değer (noktalı ondalık, binlik ayraçsız) - forma/backend'e bu haliyle gider. */
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  name?: string;
  id?: string;
  disabled?: boolean;
}

/** Kullanıcının girdisini dijit + en fazla bir ondalık ayracına indirger, ondalığı "." olarak normalize eder. */
function stripToRaw(input: string): string {
  const cleaned = input.replace(/[^\d.,]/g, '');
  const separatorIndex = cleaned.search(/[.,]/);
  if (separatorIndex === -1) return cleaned;
  const intPart = cleaned.slice(0, separatorIndex).replace(/[.,]/g, '');
  const fracPart = cleaned.slice(separatorIndex + 1).replace(/[.,]/g, '');
  return `${intPart}.${fracPart}`;
}

/** Ham değeri ("1000000.5") ekranda "1 000 000,5" olarak gösterir. */
function formatDisplay(raw: string): string {
  if (!raw) return '';
  const [intPart, fracPart] = raw.split('.');
  const groupedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return fracPart !== undefined ? `${groupedInt},${fracPart}` : groupedInt;
}

/** Binlik ayraçlı sayı girişi - ekranda "1 000 000" gösterir, değeri backend'e "1000000" olarak iletir. */
export function ThousandsNumberField({
  label,
  value,
  onChange,
  error,
  hint,
  required,
  name,
  id,
  disabled,
}: ThousandsNumberFieldProps) {
  const display = formatDisplay(value ?? '');

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const raw = stripToRaw(event.target.value);
    onChange(raw === '' || raw === '.' ? undefined : raw);
  }

  return (
    <TextField
      label={label}
      error={error}
      hint={hint}
      required={required}
      name={name}
      id={id}
      disabled={disabled}
      inputMode="decimal"
      value={display}
      onChange={handleChange}
    />
  );
}
