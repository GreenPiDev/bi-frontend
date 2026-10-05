import type { ReactNode } from 'react';
import { DateField } from '../../components/ui/date-field';
import { Select } from '../../components/ui/select';
import { TextField } from '../../components/ui/text-field';
import { tr } from '../../i18n/tr';
import { IbanSelect } from './iban-select';
import { PaymentMethodSelect } from './payment-method-select';
import { QuoteTemplateSelect } from './quote-template-select';

/** Opportunity/Interaction formlarındaki CURRENCY_OPTIONS ile aynı desen - kur çevrimi
 * için teklifin desteklediği para birimleri de bu kayıt defterinden gelir. */
const QUOTE_CURRENCY_OPTIONS: { value: string; label: string }[] = (
  ['TRY', 'USD', 'EUR', 'GBP', 'CHF', 'JPY'] as const
).map((currency) => ({
  value: currency,
  label: tr.crm.opportunities.form.currencyOptions[currency],
}));

export interface QuoteMetaFieldsValues {
  contactId: string;
  quoteDate: string;
  leadTime: string;
  paymentMethod: string;
  ibanOptionId: string;
  quoteCurrency: string;
  templateId: string;
  senderId: string;
}

export interface QuoteMetaFieldsErrors {
  contactId?: string;
  quoteDate?: string;
  leadTime?: string;
  paymentMethod?: string;
  ibanOptionId?: string;
  quoteCurrency?: string;
  templateId?: string;
  senderId?: string;
}

interface QuoteMetaFieldsProps {
  /** Firma alani ekranlar arasi farklilasiyor (yeni: duzenlenebilir Autocomplete,
   * duzenle: salt-okunur metin) - cagiran bu hucreyi kendisi render eder. */
  accountSlot: ReactNode;
  contactOptions: { value: string; label: string }[];
  /** /quotes/assignable-users'tan - "Gonderen" secicisi (bkz. docs/VARSAYIMLAR.md). */
  senderOptions: { value: string; label: string }[];
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
  /** Verilirse (ve en az 1 deger tanimliysa) PaymentMethodSelect/IbanSelect'in
   * yaninda ayarlara gitmeden yeni deger eklemeye yarayan "+ Yeni ..." butonu
   * gosterilir - sadece /teklifler/yeni bu callback'leri gecer, /teklifler/duzenle
   * eski davranisinda kalir (bkz. kullanici istegi). */
  onRequestAddPaymentMethod?: () => void;
  onRequestAddIban?: () => void;
}

/** /teklifler/yeni ve /teklifler/duzenle/:id arasinda paylasilan "teklif meta
 * bilgileri" grid'i - firma haricinde alanlar tamamen kontrollu (value+onChange),
 * bu yuzden hem react-hook-form (Controller) hem duz useState ile calisir. */
export function QuoteMetaFields({
  accountSlot,
  contactOptions,
  senderOptions,
  values,
  onChange,
  errors,
  ibanCurrentInfo,
  onRequestAddPaymentMethod,
  onRequestAddIban,
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
      <Select
        label={tr.crm.quotes.form.senderLabel}
        hint={tr.crm.quotes.form.senderHint}
        options={senderOptions}
        error={errors?.senderId}
        value={values.senderId}
        onChange={(event) => onChange('senderId', event.target.value)}
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
        onRequestAddNew={onRequestAddPaymentMethod}
      />
      <Select
        label={tr.crm.quotes.form.quoteCurrencyLabel}
        hint={tr.crm.quotes.form.quoteCurrencyHint}
        options={QUOTE_CURRENCY_OPTIONS}
        error={errors?.quoteCurrency}
        value={values.quoteCurrency}
        onChange={(event) => onChange('quoteCurrency', event.target.value)}
      />
      <div>
        <IbanSelect
          label={tr.crm.quotes.form.ibanLabel}
          value={values.ibanOptionId}
          onChange={(value) => onChange('ibanOptionId', value)}
          error={errors?.ibanOptionId}
          onRequestAddNew={onRequestAddIban}
        />
        {!values.ibanOptionId && ibanCurrentInfo && (
          <p className="mt-1.5 text-xs text-app-muted">
            {tr.crm.quotes.detail.bankNameLabel}: {ibanCurrentInfo.bankName} ·{' '}
            {ibanCurrentInfo.ibanNumber}
          </p>
        )}
      </div>
      <QuoteTemplateSelect
        value={values.templateId}
        onChange={(value) => onChange('templateId', value)}
        error={errors?.templateId}
      />
    </div>
  );
}
