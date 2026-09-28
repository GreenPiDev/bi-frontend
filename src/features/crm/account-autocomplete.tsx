import { useState } from 'react';
import { AsyncAutocomplete } from '../../components/ui/async-autocomplete';
import { useAccountQuery, useAccountsQuery } from './use-accounts';
import { useDebouncedValue } from '../../lib/use-debounced-value';

interface AccountAutocompleteProps {
  label: string;
  value: string | undefined;
  onChange: (accountId: string | undefined) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  hint?: string;
  /** Filtre alanlarinda opt-in tekil sifirlama butonu. */
  clearable?: boolean;
}

const PAGE_SIZE = 20;

/**
 * Firma secimi icin `AsyncAutocomplete`'in veri-cekme sarmalayicisi - `<Select>`'in
 * aksine tum firmalari onceden yuklemez (yuzlerce/binlerce firma olan tenant'larda
 * `<Select>` sadece ilk sayfayi gosterdigi icin cogu firma hic secilemiyordu).
 * `typedQuery` null oldugu surece input, `value`'ya karsilik gelen firmanin adini
 * (selectedAccountQuery uzerinden) TURETIR; kullanici yazmaya baslar baslamaz
 * `typedQuery` dolar ve gosterilen metin onun yazdigi olur, bir firma secilince
 * tekrar null'a donup guncel etikete gecilir.
 */
export function AccountAutocomplete({
  label,
  value,
  onChange,
  placeholder,
  error,
  required,
  hint,
  clearable,
}: AccountAutocompleteProps) {
  const [typedQuery, setTypedQuery] = useState<string | null>(null);
  const debouncedQuery = useDebouncedValue(typedQuery ?? '');
  const searchQuery = useAccountsQuery(
    { q: debouncedQuery || undefined, pageSize: PAGE_SIZE },
    { enabled: Boolean(debouncedQuery) },
  );
  const selectedAccountQuery = useAccountQuery(value ?? '');

  const displayValue = typedQuery ?? selectedAccountQuery.data?.name ?? '';
  const options = debouncedQuery
    ? (searchQuery.data?.data ?? []).map((account) => ({
        id: account.id,
        label: account.name,
      }))
    : [];

  return (
    <AsyncAutocomplete
      label={label}
      value={displayValue}
      onInputChange={(text) => {
        setTypedQuery(text);
        if (value) {
          onChange(undefined);
        }
      }}
      options={options}
      onSelectOption={(option) => {
        onChange(option.id);
        setTypedQuery(option.label);
      }}
      placeholder={placeholder}
      error={error}
      required={required}
      hint={hint}
      clearable={clearable}
      onClear={
        clearable
          ? () => {
              setTypedQuery(null);
              onChange(undefined);
            }
          : undefined
      }
    />
  );
}
