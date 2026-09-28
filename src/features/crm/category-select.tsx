import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Select } from '../../components/ui/select';
import { tr } from '../../i18n/tr';
import { useProductCategoryOptionsQuery } from './use-product-categories';

interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  /** Verilirse ve en az 1 kategori tanımlıysa, select'in yanında ayarlara gitmeden tek
   * bir yeni kategori eklemeye yarayan "+ Yeni Kategori" butonu gösterilir. Modal'ın
   * kendisi bu bileşenin dışında (sayfa seviyesinde, dış `<form>`'un dışında) render
   * edilir - aksi halde iç içe `<form>` oluşur ve "Kaydet" native form submit'e düşüp
   * sayfayı yeniler (bkz. kullanıcı bildirimi). */
  onRequestAddNew?: () => void;
}

/** Marka/Departman/Ünvan alanlarıyla (`BrandSelect`/`DepartmentSelect`/`TitleSelect`)
 * aynı desen: tenant henüz kategori tanımlamadıysa dropdown yerine ayarlara (yeni
 * sekmede) yönlendiren bir mesaj/link gösterilir. Kategori oradan eklenince
 * `useProductCategoryOptionsRealtimeSync` bu sorguyu invalidate eder ve dropdown sayfa
 * yenilenmeden otomatik güncellenir. */
export function CategorySelect({ value, onChange, error, onRequestAddNew }: CategorySelectProps) {
  const categoryOptionsQuery = useProductCategoryOptionsQuery();
  const options = categoryOptionsQuery.data ?? [];

  if (categoryOptionsQuery.isSuccess && options.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-app-muted">
          {tr.crm.products.form.categoryLabel}
        </span>
        <div className="rounded-lg border border-dashed border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-muted">
          {tr.crm.products.form.categoryEmptyMessage}{' '}
          <Link
            to="/settings?tab=crm"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-app-brand hover:underline"
          >
            {tr.crm.products.form.categoryEmptyLink}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Select
      label={tr.crm.products.form.categoryLabel}
      placeholder={tr.crm.products.form.categoryPlaceholder}
      hint={tr.crm.products.form.categoryHintRestricted}
      error={error}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      options={options.map((option) => ({ value: option.label, label: option.label }))}
      trailingAction={
        onRequestAddNew && (
          <Button type="button" variant="secondary" className="shrink-0" onClick={onRequestAddNew}>
            {tr.crm.products.form.categoryNewButton}
          </Button>
        )
      }
    />
  );
}
