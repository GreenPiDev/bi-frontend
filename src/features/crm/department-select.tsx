import { Link } from 'react-router-dom';
import { Select } from '../../components/ui/select';
import { tr } from '../../i18n/tr';
import { useDepartmentOptionsQuery } from './use-department-options';

interface DepartmentSelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

/** Sektör alanıyla (`SectorMultiSelect`) aynı desen: tenant henüz departman
 * tanımlamadıysa dropdown yerine ayarlara (yeni sekmede) yönlendiren bir mesaj/link
 * gösterilir. Departman oradan eklenince `useDepartmentOptionsRealtimeSync` bu sorguyu
 * invalidate eder ve dropdown sayfa yenilenmeden otomatik güncellenir. */
export function DepartmentSelect({ value, onChange, error }: DepartmentSelectProps) {
  const departmentOptionsQuery = useDepartmentOptionsQuery();
  const options = departmentOptionsQuery.data ?? [];

  if (departmentOptionsQuery.isSuccess && options.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-app-muted">
          {tr.crm.contacts.form.departmentLabel}
        </span>
        <div className="rounded-lg border border-dashed border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-muted">
          {tr.crm.contacts.form.departmentEmptyMessage}{' '}
          <Link
            to="/settings?tab=crm"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-app-brand hover:underline"
          >
            {tr.crm.contacts.form.departmentEmptyLink}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Select
      label={tr.crm.contacts.form.departmentLabel}
      placeholder={tr.crm.contacts.form.departmentPlaceholder}
      hint={tr.crm.contacts.form.departmentHintRestricted}
      error={error}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      options={options.map((option) => ({ value: option.label, label: option.label }))}
    />
  );
}
