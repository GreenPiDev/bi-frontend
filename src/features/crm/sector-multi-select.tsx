import { Button } from '../../components/ui/button';
import { MultiSelect } from '../../components/ui/multi-select';
import { SettingsNavigateLink } from '../../components/ui/settings-navigate-link';
import { tr } from '../../i18n/tr';
import { useSectorOptionsQuery } from './use-sector-options';

interface SectorMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
  /** Verilirse ve en az 1 sektör tanımlıysa, select'in yanında ayarlara gitmeden tek
   * bir yeni sektör eklemeye yarayan "+ Yeni Sektör" butonu gösterilir - `CategorySelect`
   * ile aynı desen. Modal'ın kendisi bu bileşenin dışında (sayfa seviyesinde, dış
   * `<form>`'un dışında) render edilir. */
  onRequestAddNew?: () => void;
}

/** A2: boş durumda (hiç sektör tanımlı değilse) ödeme yöntemi seçicisiyle aynı desen —
 * kullanıcıyı ayarlardaki tanımlamalar sekmesine yeni sekmede yönlendiren bir link
 * gösterir. Sektör oradan eklenince `useSectorOptionsRealtimeSync` bu sorguyu invalidate
 * eder ve dropdown sayfa yenilenmeden otomatik güncellenir. */
export function SectorMultiSelect({
  value,
  onChange,
  error,
  onRequestAddNew,
}: SectorMultiSelectProps) {
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
          <SettingsNavigateLink tab="crm" highlightKey="sectorOptions">
            {tr.crm.accounts.form.sectorEmptyLink}
          </SettingsNavigateLink>
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
      trailingAction={
        onRequestAddNew && (
          <Button type="button" variant="navy" className="shrink-0" onClick={onRequestAddNew}>
            {tr.crm.accounts.form.sectorNewButton}
          </Button>
        )
      }
    />
  );
}
