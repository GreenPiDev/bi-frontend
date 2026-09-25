import type { ReactNode } from 'react';
import { DateField } from '../../components/ui/date-field';
import { Select } from '../../components/ui/select';
import { TextField } from '../../components/ui/text-field';
import { tr } from '../../i18n/tr';
import { IbanSelect } from './iban-select';
import { PaymentMethodSelect } from './payment-method-select';

export interface QuoteMetaFieldsValues {
  contactId: string;
  quoteDate: string;
  leadTime: string;
  paymentMethod: string;
  ibanOptionId: string;
}

export interface QuoteMetaFieldsErrors {
  contactId?: string;
  quoteDate?: string;
  leadTime?: string;
  paymentMethod?: string;
  ibanOptionId?: string;
}

interface QuoteMetaFieldsProps {
  /** Firma alani ekranlar arasi farklilasiyor (yeni: duzenlenebilir Autocomplete,
   * duzenle: salt-okunur metin) - cagiran bu hucreyi kendisi render eder. */
  accountSlot: ReactNode;
  contactOptions: { value: string; label: string }[];
  values: QuoteMetaFieldsValues;
  onChange: <K extends keyof QuoteMetaFieldsValues>(
    field: K,
    value: QuoteMetaFieldsValues[K],
  ) => void;
  errors?: QuoteMetaFieldsErrors;
  /** Duzenleme ekraninda, teklif zaten bir IBAN snapshot'i tasiyorsa ama kullanici
   * henuz yeni bir secim yapmadiysa gosterilecek bilgi notu - bkz. IbanOption doc
   * comment'i (snapshot, FK degil, bu yuzden mevcut secim otomatik isaretlenemez). */
  ibanCurrentInfo?: { bankName: string; ibanNumber: string } | null;
}

/** /teklifler/yeni ve /teklifler/duzenle/:id arasinda paylasilan "teklif meta
 * bilgileri" grid'i - firma haricinde alanlar tamamen kontrollu (value+onChange),
 * bu yuzden hem react-hook-form (Controller) hem duz useState ile calisir. */
export function QuoteMetaFields({
  accountSlot,
  contactOptions,
  values,
  onChange,
  errors,
  ibanCurrentInfo,
}: QuoteMetaFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 border-t border-app-border pt-6 sm:grid-cols-2 lg:grid-cols-3">
      {accountSlot}
      <Select
        label={tr.crm.quotes.form.contactLabel}
        placeholder={tr.crm.quotes.form.contactPlaceholder}
        hint={tr.crm.quotes.form.contactHint}
        options={contactOptions}
        error={errors?.contactId}
        value={values.contactId}
        onChange={(event) => onChange('contactId', event.target.value)}
      />
      <DateField
        label={tr.crm.quotes.form.quoteDateLabel}
        required
        hint={tr.crm.quotes.form.quoteDateHint}
        error={errors?.quoteDate}
        value={values.quoteDate}
        onChange={(value) => onChange('quoteDate', value)}
      />
      <TextField
        label={tr.crm.quotes.form.leadTimeLabel}
        placeholder={tr.crm.quotes.form.leadTimePlaceholder}
        hint={tr.crm.quotes.form.leadTimeHint}
        error={errors?.leadTime}
        value={values.leadTime}
        onChange={(event) => onChange('leadTime', event.target.value)}
      />
      <PaymentMethodSelect
        label={tr.crm.quotes.form.paymentMethodLabel}
        value={values.paymentMethod}
        onChange={(value) => onChange('paymentMethod', value)}
        error={errors?.paymentMethod}
      />
      <div>
        <IbanSelect
          label={tr.crm.quotes.form.ibanLabel}
          value={values.ibanOptionId}
          onChange={(value) => onChange('ibanOptionId', value)}
          error={errors?.ibanOptionId}
        />
        {!values.ibanOptionId && ibanCurrentInfo && (
          <p className="mt-1.5 text-xs text-app-muted">
            {tr.crm.quotes.detail.bankNameLabel}: {ibanCurrentInfo.bankName} ·{' '}
            {ibanCurrentInfo.ibanNumber}
          </p>
        )}
      </div>
    </div>
  );
}
