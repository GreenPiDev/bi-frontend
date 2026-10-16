import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Select } from '../../components/ui/select';
import { SettingsNavigateLink } from '../../components/ui/settings-navigate-link';
import { tr } from '../../i18n/tr';
import { QuickAddRejectReasonModal } from './quick-add-reject-reason-modal';
import { useQuoteRejectionReasonOptionsQuery } from './use-quote-rejection-reason-options';

interface QuoteRejectReasonSelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

/** Teklif reddi "Red Sebebi" dropdown'u - reminder-type-select.tsx ile ayni desen:
 * en az bir deger tanimliysa secim kutusunun yaninda, ayarlara gitmeden hizli ekleme
 * yapan bir "+" butonu belirir (bkz. QuickAddRejectReasonModal). */
export function QuoteRejectReasonSelect({ value, onChange, error }: QuoteRejectReasonSelectProps) {
  const optionsQuery = useQuoteRejectionReasonOptionsQuery();
  const options = optionsQuery.data ?? [];
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  if (optionsQuery.isSuccess && options.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-app-muted">
          {tr.crm.quotes.detail.rejectReasonLabel}
        </span>
        <div className="rounded-lg border border-dashed border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-muted">
          {tr.settings.crm.quoteRejectionReasonOptions.empty}{' '}
          <SettingsNavigateLink tab="crm" highlightKey="quoteRejectionReasonOptions">
            {tr.crm.calendar.form.reminderTypeEmptyLink}
          </SettingsNavigateLink>
        </div>
      </div>
    );
  }

  return (
    <>
      <Select
        label={tr.crm.quotes.detail.rejectReasonLabel}
        placeholder={tr.crm.quotes.detail.rejectReasonPlaceholder}
        required
        error={error}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        options={options.map((option) => ({ value: option.label, label: option.label }))}
        trailingAction={
          <Button
            type="button"
            variant="navy"
            className="shrink-0 !px-2.5"
            onClick={() => setIsQuickAddOpen(true)}
            aria-label={tr.crm.quotes.detail.quickAddRejectReason.title}
          >
            <Plus size={16} className="text-app-success" />
          </Button>
        }
      />
      {isQuickAddOpen && (
        <QuickAddRejectReasonModal
          onClose={() => setIsQuickAddOpen(false)}
          onCreated={(newLabel) => onChange(newLabel)}
        />
      )}
    </>
  );
}
