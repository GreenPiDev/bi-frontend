import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Select } from '../../components/ui/select';
import { tr } from '../../i18n/tr';
import { useBrandOptionsQuery } from './use-brand-options';

interface BrandSelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  /** Verilirse ve en az 1 marka tanımlıysa, select'in yanında ayarlara gitmeden tek bir
   * yeni marka eklemeye yarayan "+ Yeni Marka" butonu gösterilir. Modal'ın kendisi bu
   * bileşenin dışında (sayfa seviyesinde, dış `<form>`'un dışında) render edilir - aksi
   * halde iç içe `<form>` oluşur ve "Kaydet" native form submit'e düşüp sayfayı yeniler
   * (bkz. kullanıcı bildirimi). */
  onRequestAddNew?: () => void;
}

/** Departman/Ünvan alanlarıyla (`DepartmentSelect`/`TitleSelect`) aynı desen: tenant
 * henüz marka tanımlamadıysa dropdown yerine ayarlara (yeni sekmede) yönlendiren bir
 * mesaj/link gösterilir. Marka oradan eklenince `useBrandOptionsRealtimeSync` bu
 * sorguyu invalidate eder ve dropdown sayfa yenilenmeden otomatik güncellenir. */
export function BrandSelect({ value, onChange, error, onRequestAddNew }: BrandSelectProps) {
  const brandOptionsQuery = useBrandOptionsQuery();
  const options = brandOptionsQuery.data ?? [];

  if (brandOptionsQuery.isSuccess && options.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-app-muted">
          {tr.crm.products.form.brandLabel}
        </span>
        <div className="rounded-lg border border-dashed border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-muted">
          {tr.crm.products.form.brandEmptyMessage}{' '}
          <Link
            to="/settings?tab=crm"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-app-brand hover:underline"
          >
            {tr.crm.products.form.brandEmptyLink}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Select
      label={tr.crm.products.form.brandLabel}
      placeholder={tr.crm.products.form.brandPlaceholder}
      hint={tr.crm.products.form.brandHintRestricted}
      error={error}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      options={options.map((option) => ({ value: option.label, label: option.label }))}
      trailingAction={
        onRequestAddNew && (
          <Button type="button" variant="secondary" className="shrink-0" onClick={onRequestAddNew}>
            {tr.crm.products.form.brandNewButton}
          </Button>
        )
      }
    />
  );
}
