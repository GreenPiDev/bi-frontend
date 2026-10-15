import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AsyncAutocomplete } from '../../components/ui/async-autocomplete';
import { Button } from '../../components/ui/button';
import { tr } from '../../i18n/tr';
import { useProductListsQuery } from './use-product-lists';

interface ProductListSelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  /** Verilirse ve en az 1 ürün listesi tanımlıysa, select'in yanında ayrı sekmeye
   * gitmeden tek bir yeni liste eklemeye yarayan "+ Yeni Liste" butonu gösterilir -
   * `UnitSelect`/`BrandSelect`'teki `onRequestAddNew` ile aynı desen. Modal'ın kendisi bu
   * bileşenin dışında (sayfa seviyesinde, dış `<form>`'un dışında) render edilmelidir. */
  onRequestAddNew?: () => void;
}

/** Marka/Kategori/Birim seçicileriyle (`BrandSelect`/`CategorySelect`/`UnitSelect`) aynı
 * desen: tenant henüz ürün listesi tanımlamadıysa dropdown yerine, yeni sekmede
 * `/urun-listeleri/yeni`'ye yönlendiren bir mesaj/link gösterilir. O sekmede liste
 * oluşturulunca `useProductListsRealtimeSync` bu sorguyu invalidate eder ve bu sekmedeki
 * dropdown sayfa yenilenmeden otomatik güncellenir. Birim gibi zorunlu bir alan. */
export function ProductListSelect({
  value,
  onChange,
  error,
  onRequestAddNew,
}: ProductListSelectProps) {
  const productListsQuery = useProductListsQuery();
  const options = productListsQuery.data?.data ?? [];
  // null: kullanici henuz yazmiyor, kutuda secili listenin adi gorunur. Yazmaya
  // baslayinca (ve secim netlesene kadar) kutuda yazilan metin gorunur - `ProductAutocomplete`
  // ile ayni desen (bkz. features/crm/product-autocomplete.tsx).
  const [typedQuery, setTypedQuery] = useState<string | null>(null);

  // Deger bos iken native <select>'te `value=""`'a karsilik gelen bir <option> olmadigindan
  // tarayici gorsel olarak ilk secenegi secili gosterir, ama RHF'nin tuttugu `value` hala
  // bos kalir - kullanici dropdown'a dokunmadan submit edince "zorunlu alan" hatasi alir
  // (bkz. kullanici bildirimi). Liste yuklenince bosken varsayilan/ilk listeyi RHF'ye de yaz.
  useEffect(() => {
    if (!value && options.length > 0) {
      onChange(options[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, options.length]);

  if (productListsQuery.isSuccess && options.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-app-muted">
          {tr.crm.products.form.productListLabel}
          <span className="ml-0.5 text-app-danger" aria-hidden="true">
            *
          </span>
        </label>
        <div className="rounded-lg border border-dashed border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-muted">
          {tr.crm.products.form.productListEmptyMessage}{' '}
          <Link
            to="/urun-listeleri/yeni"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-app-brand hover:underline"
          >
            {tr.crm.products.form.productListEmptyLink}
          </Link>
        </div>
      </div>
    );
  }

  const selected = options.find((productList) => productList.id === value);
  const displayValue = typedQuery ?? selected?.name ?? '';
  const filteredOptions = (
    typedQuery === null
      ? options
      : options.filter((productList) =>
          productList.name.toLowerCase().includes(typedQuery.trim().toLowerCase()),
        )
  ).map((productList) => ({ id: productList.id, label: productList.name }));

  return (
    <AsyncAutocomplete
      label={tr.crm.products.form.productListLabel}
      required
      hint={tr.crm.products.form.productListHint}
      error={error}
      value={displayValue}
      onInputChange={setTypedQuery}
      options={filteredOptions}
      onSelectOption={(option) => {
        onChange(option.id);
        setTypedQuery(null);
      }}
      trailingAction={
        onRequestAddNew && (
          <Button type="button" variant="navy" className="shrink-0" onClick={onRequestAddNew}>
            {tr.crm.products.form.productListNewButton}
          </Button>
        )
      }
    />
  );
}
