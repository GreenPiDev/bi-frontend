import type { ReactNode } from 'react';
import { type QuoteExchangeRates, type QuoteTemplate } from '../lib/api';
import { formatIbanInput } from '../lib/iban-validation';
import {
  computeLineTotal,
  convertTotalsToQuoteCurrency,
  formatCurrencyAmount,
  groupQuoteItemTotals,
} from '../lib/quote-totals';
import { tr } from '../i18n/tr';

const dateFormatter = new Intl.DateTimeFormat('tr-TR');

/** QuoteTemplatePrintDocument'in fiilen okudugu alanlarla sinirli, dar bir tip -
 * gercek `/quotes/:id/print-data` yanitindaki QuotePrintData bunu yapisal olarak
 * karsilar (fazla alanlar gorulmezden gelinir), ama sablon duzenleme sayfasindaki
 * "Onizlemeyi Gor" da tam Account/Product/Contact nesneleri uydurmak zorunda
 * kalmadan orneklem veriyle ayni sayfalari besleyebilir (bkz.
 * quote-template-preview-lightbox.tsx). */
export interface QuoteTemplatePrintDocumentData {
  quoteNumber: string;
  quoteDate: string;
  quoteCurrency: string;
  exchangeRates: QuoteExchangeRates | null;
  account: {
    name: string;
    address: string | null;
    district: string | null;
    city: string | null;
  };
  contact: { firstName: string; lastName: string } | null;
  items: Array<{
    id: string;
    quantity: string;
    unitPrice: string;
    currency: string;
    discountPct: string;
    vatPct: string;
    product: { name: string };
  }>;
  paymentTerms: string | null;
  salesTerms: string | null;
  deliveryTerms: string | null;
  generalTerms: string | null;
  ibanBankName: string | null;
  ibanAccountHolderName: string | null;
  ibanAccountNumber: string | null;
  ibanNumber: string | null;
  template: Pick<
    QuoteTemplate,
    | 'logoUrl'
    | 'coverImageUrl'
    | 'closingImageUrl'
    | 'companyDisplayName'
    | 'companyTagline'
    | 'companyPhone'
    | 'companyEmail'
    | 'senderName'
    | 'senderTitle'
    | 'senderPhone'
    | 'senderEmail'
  > | null;
}

function lineTotal(item: QuoteTemplatePrintDocumentData['items'][number]): number {
  return computeLineTotal({
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
    discountPct: Number(item.discountPct),
    vatPct: Number(item.vatPct),
  }).lineTotal;
}

/** Sayfalari ayri ayri React node'lari olarak dondurur - yazdirma rotasi
 * (quote-template-print-page.tsx) hepsini art arda (print-page-break ile) render
 * eder, lightbox (quote-template-preview-lightbox.tsx) ise bunlardan sadece o an
 * secili olani gosterir. Tek kaynak, iki tuketici. */
export function buildQuoteTemplatePrintPages(quote: QuoteTemplatePrintDocumentData): ReactNode[] {
  const template = quote.template!;
  const strings = tr.crm.quoteTemplatePrint;
  const totals = groupQuoteItemTotals(
    quote.items.map((item) => ({
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      discountPct: Number(item.discountPct),
      vatPct: Number(item.vatPct),
      currency: item.currency,
    })),
  );
  const foreignCurrencyTotals = totals.filter((t) => t.currency !== quote.quoteCurrency);
  const conversion =
    foreignCurrencyTotals.length > 0
      ? convertTotalsToQuoteCurrency(totals, quote.quoteCurrency, quote.exchangeRates?.rates ?? {})
      : null;

  const pages: ReactNode[] = [];

  // 1. Kapak sayfasi
  pages.push(
    <section
      key="cover"
      className="relative flex min-h-screen flex-col justify-end overflow-hidden"
    >
      {template.coverImageUrl && (
        <img
          src={template.coverImageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="relative flex flex-1 flex-col justify-between p-10">
        <div className="flex justify-start">
          {template.logoUrl && (
            <img
              src={template.logoUrl}
              alt={template.companyDisplayName}
              className="max-h-20 max-w-[40%] object-contain"
            />
          )}
        </div>
        <div>
          <h1 className="text-5xl font-bold text-white drop-shadow">
            {template.companyDisplayName}
          </h1>
          {template.companyTagline && (
            <p className="mt-4 max-w-lg text-base text-white drop-shadow">
              {template.companyTagline}
            </p>
          )}
        </div>
      </div>
      <div className="relative bg-gray-900 px-10 py-8 text-white">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold" style={{ color: '#8bc34a' }}>
            {strings.coverTitle}
          </h2>
        </div>
        <hr className="my-3 border-gray-700" />
        <p className="text-sm font-bold uppercase">{quote.account.name}</p>
        <div className="mt-3 flex gap-8 text-sm">
          <span>
            {strings.quoteDateLabel}: {dateFormatter.format(new Date(quote.quoteDate))}
          </span>
          <span>
            {strings.quoteNumberLabel}: #{quote.quoteNumber}
          </span>
        </div>
        <div className="mt-3 flex gap-8 text-sm">
          {template.companyPhone && <span>{template.companyPhone}</span>}
          {template.companyEmail && <span>{template.companyEmail}</span>}
        </div>
      </div>
    </section>,
  );

  // 2. Teklif detayi
  pages.push(
    <section key="detail" className="print-page-break p-10">
      <header className="flex items-start justify-between border-b-2 border-gray-200 pb-4">
        {template.logoUrl && <img src={template.logoUrl} alt="" className="h-14 w-auto" />}
        <div className="text-right text-sm">
          <p className="font-bold">{dateFormatter.format(new Date(quote.quoteDate))}</p>
          <p className="font-bold">#{quote.quoteNumber}</p>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-8">
        <div>
          <h3 className="text-sm font-bold" style={{ color: '#2196f3' }}>
            {strings.accountInfoTitle}
          </h3>
          <p className="mt-2 text-sm font-bold">{quote.account.name}</p>
          {quote.account.address && (
            <p className="text-sm text-app-muted">{quote.account.address}</p>
          )}
          {(quote.account.district || quote.account.city) && (
            <p className="text-sm text-app-muted">
              {[quote.account.district, quote.account.city].filter(Boolean).join(' / ')}
            </p>
          )}
        </div>
        <div>
          <h3 className="text-sm font-bold" style={{ color: '#2196f3' }}>
            {strings.senderInfoTitle}
          </h3>
          {template.senderName && <p className="mt-2 text-sm font-bold">{template.senderName}</p>}
          {template.senderTitle && <p className="text-sm text-app-muted">{template.senderTitle}</p>}
          {template.senderPhone && (
            <p className="text-sm text-app-muted">
              {strings.phoneLabel}: {template.senderPhone}
            </p>
          )}
          {template.senderEmail && (
            <p className="text-sm text-app-muted">
              {strings.emailLabel}: {template.senderEmail}
            </p>
          )}
        </div>
      </div>

      <table className="mt-8 w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-900 text-white">
            <th className="p-3 text-left">{strings.itemsProductColumn}</th>
            <th className="p-3 text-center">{strings.itemsQuantityColumn}</th>
            <th className="p-3 text-right">{strings.itemsUnitPriceColumn}</th>
            <th className="p-3 text-right">{strings.itemsTotalColumn}</th>
          </tr>
        </thead>
        <tbody>
          {quote.items.map((item, index) => (
            <tr key={item.id} className={index % 2 === 1 ? 'bg-gray-50' : undefined}>
              <td className="p-3">{item.product.name}</td>
              <td className="p-3 text-center">{item.quantity}</td>
              <td className="p-3 text-right">
                {formatCurrencyAmount(Number(item.unitPrice), item.currency)}
              </td>
              <td className="p-3 text-right">
                {formatCurrencyAmount(lineTotal(item), item.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex flex-wrap justify-end gap-4 text-sm">
        {totals.map((t) => (
          <div key={t.currency} className="flex w-64 flex-col gap-1">
            {totals.length > 1 && (
              <span className="text-right text-xs font-semibold text-app-muted">{t.currency}</span>
            )}
            <div className="flex justify-between">
              <span>{strings.subtotalLabel}</span>
              <span>{formatCurrencyAmount(t.subtotal, t.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span>{strings.vatLabel(String(quote.items[0]?.vatPct ?? '0'))}</span>
              <span>{formatCurrencyAmount(t.vatTotal, t.currency)}</span>
            </div>
            <div
              className="flex justify-between rounded px-2 py-1 font-bold"
              style={{ backgroundColor: '#e8f5e9' }}
            >
              <span>{strings.grandTotalLabel}:</span>
              <span>{formatCurrencyAmount(t.grandTotal, t.currency)}</span>
            </div>
          </div>
        ))}
      </div>

      {conversion && (
        <div className="mt-4 flex flex-col items-end gap-1 text-sm">
          {conversion.missingRateCurrencies.length === 0 ? (
            <>
              <div
                className="flex w-64 justify-between rounded px-2 py-1 font-bold"
                style={{ backgroundColor: '#e8f5e9' }}
              >
                <span>{tr.crm.quotes.form.convertedGrandTotalLabel(quote.quoteCurrency)}:</span>
                <span>{formatCurrencyAmount(conversion.grandTotal, quote.quoteCurrency)}</span>
              </div>
              <p className="max-w-xs text-right text-[11px] text-app-muted">
                {tr.crm.quotes.form.exchangeRateNote(
                  foreignCurrencyTotals.map(
                    (t) =>
                      `1 ${t.currency} = ${quote.exchangeRates?.rates[t.currency]} ${quote.quoteCurrency}`,
                  ),
                  quote.exchangeRates?.asOf,
                )}
              </p>
            </>
          ) : (
            <p className="max-w-xs text-right text-[11px] text-app-danger">
              {tr.crm.quotes.form.missingExchangeRate(conversion.missingRateCurrencies)}
            </p>
          )}
        </div>
      )}

      {quote.ibanNumber && (
        <div className="mt-10">
          <h3 className="text-sm font-bold" style={{ color: '#2196f3' }}>
            {strings.bankDetailsTitle}
          </h3>
          <table className="mt-3 w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-300 text-left text-app-muted">
                <th className="p-2">{strings.bankNameColumn}</th>
                <th className="p-2">{strings.accountHolderNameColumn}</th>
                <th className="p-2">{strings.accountNumberColumn}</th>
                <th className="p-2">{strings.ibanColumn}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="p-2">{quote.ibanBankName}</td>
                <td className="p-2">{quote.ibanAccountHolderName}</td>
                <td className="p-2">{quote.ibanAccountNumber ?? '—'}</td>
                <td className="p-2">{formatIbanInput(quote.ibanNumber)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>,
  );

  // 3. Kosullar (teklifin kendi satis/teslimat sartlari) + onay
  pages.push(
    <section key="terms" className="print-page-break p-10">
      {quote.paymentTerms && (
        <div className="mb-8">
          <h3 className="text-sm font-bold" style={{ color: '#2196f3' }}>
            {strings.paymentConditionsTitle}
          </h3>
          <p className="mt-2 text-sm whitespace-pre-wrap">{quote.paymentTerms}</p>
        </div>
      )}
      {quote.salesTerms && (
        <div className="mb-8">
          <h3 className="text-sm font-bold" style={{ color: '#2196f3' }}>
            {strings.salesConditionsTitle}
          </h3>
          <p className="mt-2 text-sm whitespace-pre-wrap">{quote.salesTerms}</p>
        </div>
      )}
      {quote.deliveryTerms && (
        <div className="mb-8">
          <h3 className="text-sm font-bold" style={{ color: '#2196f3' }}>
            {strings.deliveryConditionsTitle}
          </h3>
          <p className="mt-2 text-sm whitespace-pre-wrap">{quote.deliveryTerms}</p>
        </div>
      )}
      {quote.generalTerms && (
        <div className="mb-8">
          <h3 className="text-sm font-bold" style={{ color: '#2196f3' }}>
            {strings.generalConditionsTitle}
          </h3>
          <p className="mt-2 text-sm whitespace-pre-wrap">{quote.generalTerms}</p>
        </div>
      )}

      <div className="mt-12 grid grid-cols-2 gap-8 text-sm">
        <div>
          <h4 className="text-sm font-bold" style={{ color: '#2196f3' }}>
            {strings.representativeTitle}
          </h4>
          {template.senderName && <p className="mt-2 font-semibold">{template.senderName}</p>}
          {template.senderTitle && <p className="text-app-muted">{template.senderTitle}</p>}
          <p className="mt-3 text-app-muted">
            {strings.phoneLabel}: {template.senderPhone ?? ''}
          </p>
          <p className="text-app-muted">
            {strings.emailLabel}: {template.senderEmail ?? ''}
          </p>
        </div>
        <div>
          <h4 className="text-sm font-bold" style={{ color: '#2196f3' }}>
            {strings.approvalTitle}
          </h4>
          {quote.contact && (
            <p className="mt-2 font-semibold">
              {quote.contact.firstName} {quote.contact.lastName}
            </p>
          )}
          <p className="mt-3 text-app-muted">{strings.signatureLabel}:</p>
          <p className="mt-3 text-app-muted">{strings.approvalDateLabel}:</p>
        </div>
      </div>
    </section>,
  );

  // 4. Kapanis sayfasi (opsiyonel)
  if (template.closingImageUrl) {
    pages.push(
      <section key="closing" className="print-page-break">
        <img src={template.closingImageUrl} alt="" className="h-screen w-full object-cover" />
      </section>,
    );
  }

  return pages;
}
