import { useState } from 'react';
import { AsyncAutocomplete } from '../../components/ui/async-autocomplete';
import { useProductQuery, useProductsQuery } from './use-products';
import { useDebouncedValue } from '../../lib/use-debounced-value';

interface ProductAutocompleteProps {
  label: string;
  value: string | undefined;
  onChange: (productId: string | undefined) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  hint?: string;
  clearable?: boolean;
  /** Verilirse arama sadece bu urun listesindeki urunlerle sinirlanir (siparis
   * kalemi satirlarinda "once urun listesi, sonra urun" akisi icin). */
  productListId?: string;
  disabled?: boolean;
}

const PAGE_SIZE = 20;

/**
 * Urun secimi icin `AsyncAutocomplete` sarmalayicisi - `account-autocomplete.tsx`
 * ile ayni desen. `<Select>`'in aksine tum urunleri onceden yuklemez: marka bazli
 * ice aktarmalarla (ABB/Schneider vb.) binlerce urune ulasan kataloglarda `<Select>`
 * sadece ilk sayfayi (25 kayit) gosterdigi icin, o sayfada olmayan bir urun hem
 * secilemiyor hem de zaten secili oldugunda bos gorunuyordu (bkz. /siparisler/duzenle/:id
 * bulgusu - teklifden gelen kalemlerin urunu dropdown'da gorunmuyordu).
 */
export function ProductAutocomplete({
  label,
  value,
  onChange,
  placeholder,
  error,
  required,
  hint,
  clearable,
  productListId,
  disabled,
}: ProductAutocompleteProps) {
  const [typedQuery, setTypedQuery] = useState<string | null>(null);
  const debouncedQuery = useDebouncedValue(typedQuery ?? '');
  // productListId zaten secilmisse (bu bilesen o durumda cagrilir), bos arama da
  // listenin ilk sayfasini gosterir - kullanici her seferinde yazmaya basmak zorunda
  // kalmasin diye (bkz. kullanici bildirimi, /siparisler/yeni).
  const shouldSearch = Boolean(debouncedQuery) || Boolean(productListId);
  const searchQuery = useProductsQuery(
    { q: debouncedQuery || undefined, pageSize: PAGE_SIZE, productListId },
    { enabled: !disabled && shouldSearch },
  );
  const selectedProductQuery = useProductQuery(value ?? '');

  const displayValue = typedQuery ?? selectedProductQuery.data?.name ?? '';
  const options = shouldSearch
    ? (searchQuery.data?.data ?? []).map((product) => ({
        id: product.id,
        label: product.name,
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
      disabled={disabled}
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
