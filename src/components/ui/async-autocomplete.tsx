import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ClearFieldButton } from './clear-field-button';

export interface AsyncAutocompleteOption {
  id: string;
  label: string;
}

interface AsyncAutocompleteProps {
  label: string;
  /** Kutuda gosterilen metin - kontrollu, turetilmesi (secili kaydin etiketi mi,
   * kullanicinin yazdigi mi) cagiranin sorumlulugundadir (bkz. account-autocomplete.tsx). */
  value: string;
  /** Her tus vurusunda cagrilir - cagiran hem arama sorgusunu guncellemeli hem de
   * (varsa) onceki secimi temizlemelidir. */
  onInputChange: (text: string) => void;
  /** O anki aramaya gore eslesen secenekler - veri cekme tamamen cagirana ait, bu
   * bilesen hicbir hook cagirmaz (sadece UI state: acik/kapali, vurgulanan satir,
   * disari tiklama). */
  options: AsyncAutocompleteOption[];
  onSelectOption: (option: AsyncAutocompleteOption) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  hint?: string;
  /** Filtre alanlarinda opt-in tekil sifirlama butonu - `onClear` de verilmeden
   * hicbir sey render edilmez, formlardaki mevcut kullanimlari etkilemez. */
  clearable?: boolean;
  onClear?: () => void;
}

/**
 * Sunucu taraflı aramalı, tekil-secim autocomplete - buyuk/sayfalanan koleksiyonlarda
 * (firma, kullanici, urun...) `<Select>`'in "sadece ilk sayfa yuklenir, geri kalani hic
 * secilemez" sorununu cozer. Saf/kontrollu bir UI bilesenidir - veri cekme (arama +
 * secili kaydin etiketini coze) her kullanim yerine ozgu ince bir sarmalayicida yapilir
 * (orn. features/crm/account-autocomplete.tsx - AccountAutocomplete). Deger her zaman
 * gercek bir kaydin id'sidir, serbest metin girilemez (serbest metne izin veren,
 * istemci tarafi filtreli senaryolar icin `Autocomplete` kullanin).
 */
export function AsyncAutocomplete({
  label,
  value,
  onInputChange,
  options,
  onSelectOption,
  placeholder,
  error,
  required,
  hint,
  clearable,
  onClear,
}: AsyncAutocompleteProps) {
  const showClear = clearable && Boolean(onClear) && Boolean(value);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
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

  function selectOption(option: AsyncAutocompleteOption) {
    onSelectOption(option);
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || options.length === 0) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlighted((prev) => (prev + 1) % options.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted((prev) => (prev - 1 + options.length) % options.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const option = options[highlighted];
      if (option) {
        selectOption(option);
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="relative flex flex-col gap-1.5" ref={containerRef}>
      <label className="text-sm font-semibold text-app-muted">
        {label}
        {required && (
          <span className="ml-0.5 text-app-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(event) => {
            onInputChange(event.target.value);
            setHighlighted(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className={clsx(
            'w-full rounded-lg border border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary',
            showClear ? 'pr-16' : 'pr-9',
            error && 'border-app-danger',
          )}
          aria-invalid={Boolean(error)}
        />
        {showClear && (
          <div className="absolute top-1/2 right-8 -translate-y-1/2">
            <ClearFieldButton onClick={() => onClear?.()} label={label} />
          </div>
        )}
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-app-muted"
        />
        {open && options.length > 0 && (
          <div className="absolute top-full z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-app-border bg-app-surface p-1 shadow-lg">
            {options.map((option, index) => (
              <button
                key={option.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectOption(option)}
                className={clsx(
                  'block w-full rounded-md px-2.5 py-2 text-left text-sm text-app-text hover:bg-app-bg',
                  index === highlighted && 'bg-app-bg',
                )}
              >
                {option.label}
              </button>
            ))}
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
}
