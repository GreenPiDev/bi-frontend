import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Select } from '../../components/ui/select';
import { tr } from '../../i18n/tr';
import { QuickAddReminderTypeModal } from './quick-add-reminder-type-modal';
import { useReminderTypeOptionsQuery } from './use-reminder-type-options';

interface ReminderTypeSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

/** Hatirlatici turu dropdown'u - department-select.tsx/interaction-type-select.tsx ile
 * ayni bos-durum deseni (tanimli deger yoksa /settings?tab=crm'e yeni sekmede yonlendiren
 * link, realtime sync ile otomatik guncellenir). Farkli olarak: en az bir deger tanimliysa
 * secim kutusunun yaninda, ayarlara gitmeden hizli ekleme yapan bir "+" butonu belirir
 * (bkz. QuickAddReminderTypeModal). */
export function ReminderTypeSelect({ label, value, onChange, error }: ReminderTypeSelectProps) {
  const optionsQuery = useReminderTypeOptionsQuery();
  const options = optionsQuery.data ?? [];
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  if (optionsQuery.isSuccess && options.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-app-muted">{label}</span>
        <div className="rounded-lg border border-dashed border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-muted">
          {tr.crm.calendar.form.reminderTypeEmptyMessage}{' '}
          <Link
            to="/settings?tab=crm"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-app-brand hover:underline"
          >
            {tr.crm.calendar.form.reminderTypeEmptyLink}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Select
        label={label}
        placeholder={tr.crm.calendar.form.reminderTypePlaceholder}
        error={error}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        options={options.map((option) => ({ value: option.label, label: option.label }))}
        clearable
        onClear={() => onChange('')}
        trailingAction={
          <Button
            type="button"
            variant="secondary"
            className="shrink-0 !px-2.5"
            onClick={() => setIsQuickAddOpen(true)}
            aria-label={tr.crm.calendar.form.quickAddReminderType.title}
          >
            <Plus size={16} />
          </Button>
        }
      />
      {isQuickAddOpen && (
        <QuickAddReminderTypeModal
          onClose={() => setIsQuickAddOpen(false)}
          onCreated={(newLabel) => onChange(newLabel)}
        />
      )}
    </>
  );
}
