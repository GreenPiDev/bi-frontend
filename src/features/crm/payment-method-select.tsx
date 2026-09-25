import { Link } from 'react-router-dom';
import { Select } from '../../components/ui/select';
import { tr } from '../../i18n/tr';
import { usePaymentMethodOptionsQuery } from './use-payment-method-options';

interface PaymentMethodSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

/** Odeme yontemi dropdown'u - sadece /settings?tab=crm'de tanimlanan listeden
 * seçilir, serbest metin girisi yok. Tenant henuz hic tanimlamamissa, dropdown
 * yerine ayarlara (yeni sekmede) yonlendiren bir mesaj/link gosterilir. Odeme
 * yontemi oradan eklenince `usePaymentMethodOptionsRealtimeSync` bu sorguyu
 * invalidate eder ve dropdown sayfa yenilenmeden otomatik guncellenir (departman
 * alaniyla ayni desen, bkz. department-select.tsx). */
export function PaymentMethodSelect({ label, value, onChange, error }: PaymentMethodSelectProps) {
  const optionsQuery = usePaymentMethodOptionsQuery();
  const options = optionsQuery.data ?? [];

  if (optionsQuery.isSuccess && options.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-app-muted">{label}</span>
        <div className="rounded-lg border border-dashed border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-muted">
          {tr.crm.quotes.form.paymentMethodEmptyMessage}{' '}
          <Link
            to="/settings?tab=crm"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-app-brand hover:underline"
          >
            {tr.crm.quotes.form.paymentMethodEmptyLink}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Select
      label={label}
      placeholder={tr.crm.quotes.form.paymentMethodPlaceholder}
      hint={tr.crm.quotes.form.paymentMethodHint}
      error={error}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      options={options.map((option) => ({ value: option.label, label: option.label }))}
    />
  );
}
