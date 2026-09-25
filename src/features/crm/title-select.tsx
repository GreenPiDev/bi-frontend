import { Link } from 'react-router-dom';
import { Select } from '../../components/ui/select';
import { tr } from '../../i18n/tr';
import { useTitleOptionsQuery } from './use-title-options';

interface TitleSelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

/** Sektör alanıyla (`SectorMultiSelect`) aynı desen: tenant henüz unvan tanımlamadıysa
 * dropdown yerine ayarlara (yeni sekmede) yönlendiren bir mesaj/link gösterilir. Unvan
 * oradan eklenince `useTitleOptionsRealtimeSync` bu sorguyu invalidate eder ve dropdown
 * sayfa yenilenmeden otomatik güncellenir. */
export function TitleSelect({ value, onChange, error }: TitleSelectProps) {
  const titleOptionsQuery = useTitleOptionsQuery();
  const options = titleOptionsQuery.data ?? [];

  if (titleOptionsQuery.isSuccess && options.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-app-muted">
          {tr.crm.contacts.form.titleLabel}
        </span>
        <div className="rounded-lg border border-dashed border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-muted">
          {tr.crm.contacts.form.titleEmptyMessage}{' '}
          <Link
            to="/settings?tab=crm"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-app-brand hover:underline"
          >
            {tr.crm.contacts.form.titleEmptyLink}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Select
      label={tr.crm.contacts.form.titleLabel}
      placeholder={tr.crm.contacts.form.titlePlaceholder}
      hint={tr.crm.contacts.form.titleHintRestricted}
      error={error}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      options={options.map((option) => ({ value: option.label, label: option.label }))}
    />
  );
}
