import { Link } from 'react-router-dom';
import { Select } from '../../components/ui/select';
import { tr } from '../../i18n/tr';
import { useProductListsQuery } from './use-product-lists';

interface ProductListSelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

/** Marka/Kategori/Birim seçicileriyle (`BrandSelect`/`CategorySelect`/`UnitSelect`) aynı
 * desen: tenant henüz ürün listesi tanımlamadıysa dropdown yerine, yeni sekmede
 * `/urun-listeleri/yeni`'ye yönlendiren bir mesaj/link gösterilir. O sekmede liste
 * oluşturulunca `useProductListsRealtimeSync` bu sorguyu invalidate eder ve bu sekmedeki
 * dropdown sayfa yenilenmeden otomatik güncellenir. Birim gibi zorunlu bir alan. */
export function ProductListSelect({ value, onChange, error }: ProductListSelectProps) {
  const productListsQuery = useProductListsQuery();
  const options = productListsQuery.data?.data ?? [];

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

  return (
    <Select
      label={tr.crm.products.form.productListLabel}
      required
      hint={tr.crm.products.form.productListHint}
      error={error}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      options={options.map((productList) => ({
        value: productList.id,
        label: productList.name,
      }))}
    />
  );
}
