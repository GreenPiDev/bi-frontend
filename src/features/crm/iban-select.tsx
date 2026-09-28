import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Select } from '../../components/ui/select';
import { tr } from '../../i18n/tr';
import { useIbanOptionsQuery } from './use-iban-options';

interface IbanSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  /** Verilirse ve en az 1 banka hesabı tanımlıysa, select'in yanında ayarlara
   * gitmeden tek bir yeni banka hesabı eklemeye yarayan "+ Yeni ..." butonu
   * gösterilir - Birim/Kategori/Marka alanlarıyla aynı desen, bkz.
   * category-select.tsx. */
  onRequestAddNew?: () => void;
}

function maskIban(iban: string): string {
  return iban.length > 4 ? `••••${iban.slice(-4)}` : iban;
}

/** IBAN/banka hesabi dropdown'u - sadece /settings?tab=crm'de tanimlanan
 * listeden secilir, serbest metin girisi yok. Tenant henuz hic tanimlamamissa,
 * dropdown yerine ayarlara (yeni sekmede) yonlendiren bir mesaj/link gosterilir.
 * IBAN oradan eklenince `useIbanOptionsRealtimeSync` bu sorguyu invalidate eder
 * ve dropdown sayfa yenilenmeden otomatik guncellenir (departman/odeme yontemi
 * alanlariyla ayni desen, bkz. department-select.tsx). */
export function IbanSelect({ label, value, onChange, error, onRequestAddNew }: IbanSelectProps) {
  const optionsQuery = useIbanOptionsQuery();
  const options = optionsQuery.data ?? [];

  if (optionsQuery.isSuccess && options.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-app-muted">{label}</span>
        <div className="rounded-lg border border-dashed border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-muted">
          {tr.crm.quotes.form.ibanEmptyMessage}{' '}
          <Link
            to="/settings?tab=crm"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-app-brand hover:underline"
          >
            {tr.crm.quotes.form.ibanEmptyLink}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Select
      label={label}
      placeholder={tr.crm.quotes.form.ibanPlaceholder}
      hint={tr.crm.quotes.form.ibanHint}
      error={error}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      options={options.map((option) => ({
        value: option.id,
        label: `${option.bankName} • ${option.accountHolderName} • ${maskIban(option.iban)}`,
      }))}
      trailingAction={
        onRequestAddNew && (
          <Button type="button" variant="navy" className="shrink-0" onClick={onRequestAddNew}>
            {tr.crm.quotes.form.ibanNewButton}
          </Button>
        )
      }
    />
  );
}
