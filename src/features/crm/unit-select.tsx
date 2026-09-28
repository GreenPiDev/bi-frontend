import { Link } from 'react-router-dom';
import { Select } from '../../components/ui/select';
import { tr } from '../../i18n/tr';
import { useUnitOptionsQuery } from './use-unit-options';

interface UnitSelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

/** Marka/Kategori alanlarıyla (`BrandSelect`/`CategorySelect`) aynı desen: tenant henüz
 * birim tanımlamadıysa dropdown yerine ayarlara (yeni sekmede) yönlendiren bir mesaj/link
 * gösterilir. Birim oradan eklenince `useUnitOptionsRealtimeSync` bu sorguyu invalidate
 * eder ve dropdown sayfa yenilenmeden otomatik güncellenir. Fark: birim zorunlu bir alan
 * (`required`), marka/kategori opsiyonel. */
export function UnitSelect({ value, onChange, error }: UnitSelectProps) {
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
    />
  );
}
