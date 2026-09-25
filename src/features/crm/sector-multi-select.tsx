import { Link } from 'react-router-dom';
import { MultiSelect } from '../../components/ui/multi-select';
import { tr } from '../../i18n/tr';
import { useSectorOptionsQuery } from './use-sector-options';

interface SectorMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
}

/** A2: boş durumda (hiç sektör tanımlı değilse) ödeme yöntemi seçicisiyle aynı desen —
 * kullanıcıyı ayarlardaki tanımlamalar sekmesine yeni sekmede yönlendiren bir link
 * gösterir. Sektör oradan eklenince `useSectorOptionsRealtimeSync` bu sorguyu invalidate
 * eder ve dropdown sayfa yenilenmeden otomatik güncellenir. */
export function SectorMultiSelect({ value, onChange, error }: SectorMultiSelectProps) {
  const sectorOptionsQuery = useSectorOptionsQuery();
  const options = sectorOptionsQuery.data ?? [];

  if (sectorOptionsQuery.isSuccess && options.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-app-muted">
          {tr.crm.accounts.form.sectorLabel}
        </span>
        <div className="rounded-lg border border-dashed border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-muted">
          {tr.crm.accounts.form.sectorEmptyMessage}{' '}
          <Link
            to="/settings?tab=crm"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-app-brand hover:underline"
          >
            {tr.crm.accounts.form.sectorEmptyLink}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <MultiSelect
      label={tr.crm.accounts.form.sectorLabel}
      placeholder={tr.crm.accounts.form.sectorPlaceholder}
      value={value}
      onChange={onChange}
      options={options.map((option) => ({ value: option.label, label: option.label }))}
      error={error}
      hint={tr.crm.accounts.form.sectorHintRestricted}
      showChips
    />
  );
}
