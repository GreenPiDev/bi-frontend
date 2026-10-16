import { Button } from '../../components/ui/button';
import { Select } from '../../components/ui/select';
import { SettingsNavigateLink } from '../../components/ui/settings-navigate-link';
import { tr } from '../../i18n/tr';
import { useInteractionTypeOptionsQuery } from './use-interaction-type-options';

interface InteractionTypeSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  /** Verilirse ve en az 1 görüşme şekli tanımlıysa, select'in yanında ayarlara gitmeden
   * tek bir yeni görüşme şekli eklemeye yarayan "+ Yeni Görüşme Şekli" butonu gösterilir -
   * `CategorySelect` ile aynı desen. */
  onRequestAddNew?: () => void;
}

/** Gorusme sekli dropdown'u - sadece /settings?tab=crm'de tanimlanan listeden secilir,
 * serbest metin girisi yok (payment-method-select.tsx ile ayni desen). Tenant henuz hic
 * tanimlamamissa, dropdown yerine ayarlara (yeni sekmede) yonlendiren bir mesaj/link
 * gosterilir - oradan eklenince realtime sync bu sorguyu invalidate eder ve dropdown
 * sayfa yenilenmeden otomatik guncellenir. */
export function InteractionTypeSelect({
  label,
  value,
  onChange,
  error,
  onRequestAddNew,
}: InteractionTypeSelectProps) {
  const optionsQuery = useInteractionTypeOptionsQuery();
  const options = optionsQuery.data ?? [];

  if (optionsQuery.isSuccess && options.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-app-muted">{label}</span>
        <div className="rounded-lg border border-dashed border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-muted">
          {tr.crm.interactions.form.typeEmptyMessage}{' '}
          <SettingsNavigateLink tab="crm" highlightKey="interactionTypeOptions">
            {tr.crm.interactions.form.typeEmptyLink}
          </SettingsNavigateLink>
        </div>
      </div>
    );
  }

  return (
    <Select
      label={label}
      required
      placeholder={tr.crm.interactions.form.typePlaceholder}
      hint={tr.crm.interactions.form.typeHint}
      error={error}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      options={options.map((option) => ({ value: option.label, label: option.label }))}
      trailingAction={
        onRequestAddNew && (
          <Button type="button" variant="navy" className="shrink-0" onClick={onRequestAddNew}>
            {tr.crm.interactions.form.typeNewButton}
          </Button>
        )
      }
    />
  );
}
