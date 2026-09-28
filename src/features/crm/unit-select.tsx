import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Select } from '../../components/ui/select';
import { tr } from '../../i18n/tr';
import { useUnitOptionsQuery } from './use-unit-options';

interface UnitSelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  /** Verilirse ve en az 1 birim tanımlıysa, select'in yanında ayarlara gitmeden tek bir
   * yeni birim eklemeye yarayan "+ Yeni Birim" butonu gösterilir. Modal'ın kendisi bu
   * bileşenin dışında (sayfa seviyesinde, dış `<form>`'un dışında) render edilir -
   * aksi halde iç içe `<form>` oluşur ve "Kaydet" native form submit'e düşüp sayfayı
   * yeniler (bkz. kullanıcı bildirimi). */
  onRequestAddNew?: () => void;
}

/** Marka/Kategori alanlarıyla (`BrandSelect`/`CategorySelect`) aynı desen: tenant henüz
 * birim tanımlamadıysa dropdown yerine ayarlara (yeni sekmede) yönlendiren bir mesaj/link
 * gösterilir. Birim oradan eklenince `useUnitOptionsRealtimeSync` bu sorguyu invalidate
 * eder ve dropdown sayfa yenilenmeden otomatik güncellenir. Fark: birim zorunlu bir alan
 * (`required`), marka/kategori opsiyonel. */
export function UnitSelect({ value, onChange, error, onRequestAddNew }: UnitSelectProps) {
  const unitOptionsQuery = useUnitOptionsQuery();
  const options = unitOptionsQuery.data ?? [];

  if (unitOptionsQuery.isSuccess && options.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-app-muted">
          {tr.crm.products.form.unitLabel}
          <span className="ml-0.5 text-app-danger" aria-hidden="true">
            *
          </span>
        </label>
        <div className="rounded-lg border border-dashed border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-muted">
          {tr.crm.products.form.unitEmptyMessage}{' '}
          <Link
            to="/settings?tab=crm"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-app-brand hover:underline"
          >
            {tr.crm.products.form.unitEmptyLink}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Select
      label={tr.crm.products.form.unitLabel}
      required
      placeholder={tr.crm.products.form.unitPlaceholder}
      hint={tr.crm.products.form.unitHintRestricted}
      error={error}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      options={options.map((option) => ({ value: option.label, label: option.label }))}
      trailingAction={
        onRequestAddNew && (
          <Button type="button" variant="navy" className="shrink-0" onClick={onRequestAddNew}>
            {tr.crm.products.form.unitNewButton}
          </Button>
        )
      }
    />
  );
}
