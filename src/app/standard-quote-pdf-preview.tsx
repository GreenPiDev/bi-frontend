import { useEffect, useRef, useState } from 'react';
import { QuoteContentBody } from './quote-detail-page';
import { standardQuotePdfThemeStyle } from '../features/crm/standard-quote-pdf-theme';
import type {
  Account,
  Product,
  Quote,
  QuoteItem,
  QuotePrintSenderData,
  StandardQuotePdfTheme,
} from '../lib/api';
import { tr } from '../i18n/tr';

/** A4 genisligi (210mm) 96dpi'da - backend'in Playwright PDF'iyle ayni olcu. */
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
/** Backend'deki sol/sag 10mm marj (quote-pdf.service.ts). */
const PAGE_MARGIN_PX = 38;

const strings = tr.crm.quoteTemplates.standard.preview;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function buildSampleItem(index: number, groupName: string | null): QuoteItem {
  const name = strings.sampleProducts[index % strings.sampleProducts.length];
  const product = {
    id: `sample-product-${index}`,
    name,
    sku: `PRD-${1000 + index}`,
    unit: 'Adet',
  } as unknown as Product;
  return {
    id: `sample-item-${index}`,
    quoteId: 'sample-quote',
    productId: product.id,
    product,
    quantity: String((index % 4) + 1),
    unitPrice: String(1250 + index * 875),
    currency: 'TRY',
    discountPct: '0',
    discountNote: null,
    vatPct: '20',
    costPriceAtSale: null,
    brand: index % 2 === 0 ? 'ABB' : 'Schneider',
    unit: 'Adet',
    deliveredQuantity: '0',
    isCancelled: false,
    groupName,
  };
}

/** Onizleme icin sahte teklif - gercek PDF'te kullanilan QuoteContentBody'ye
 * verilir, boylece onizleme ile gercek cikti ayni bileseni paylasir. */
function buildSampleQuote(grouped: boolean): Quote {
  const now = new Date();
  const quoteNumber = `TEK-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-001`;
  const items = grouped
    ? [
        ...[0, 1, 2].map((i) => buildSampleItem(i, strings.sampleGroupA)),
        ...[3, 4, 5].map((i) => buildSampleItem(i, strings.sampleGroupB)),
      ]
    : [0, 1, 2, 3, 4, 5].map((i) => buildSampleItem(i, null));
  const account = {
    id: 'sample-account',
    name: strings.sampleAccountName,
    address: strings.sampleAccountAddress,
    district: strings.sampleDistrict,
    city: strings.sampleCity,
  } as unknown as Account;
  return {
    id: 'sample-quote',
    quoteNumber,
    accountId: account.id,
    account,
    contactId: 'sample-contact',
    contact: {
      firstName: strings.sampleContactFirstName,
      lastName: strings.sampleContactLastName,
    } as unknown as Quote['contact'],
    quoteCurrency: 'TRY',
    exchangeRates: null,
    projectId: null,
    templateId: null,
    template: null,
    project: null,
    status: 'DRAFT',
    quoteDate: now.toISOString(),
    leadTime: strings.sampleLeadTime,
    validityPeriod: strings.sampleValidity,
    paymentMethod: strings.samplePaymentMethod,
    title: null,
    paymentTerms: strings.samplePaymentTerms,
    salesTerms: null,
    deliveryTerms: null,
    generalTerms: null,
    ibanAccounts: null,
    approvedAt: null,
    approvedById: null,
    senderId: null,
    createdById: 'sample-user',
    createdByName: null,
    itemsEntryMode: 'ITEMIZED',
    manualSubtotal: null,
    manualVatAmount: null,
    manualCurrency: null,
    groupItemsByProduct: grouped,
    attributes: null,
    items,
    opportunity: null,
    revisionNote: null,
    revisionSnapshot: null,
    revisionCount: 0,
    lastRevisedAt: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

const SAMPLE_SENDER: QuotePrintSenderData = {
  name: strings.sampleSenderName,
  title: strings.sampleSenderTitle,
  phone: '+90 312 000 00 00',
  email: 'ornek@sirket.com',
};

const dateFormatter = new Intl.DateTimeFormat('tr-TR');

/**
 * Standart (sablonsuz) teklif PDF'inin canli onizlemesi. Header/footer, backend'in
 * Playwright header/footer template'lerinin (quote-pdf.service.ts
 * buildHeaderTemplate/buildFooterTemplate) React kopyasidir; govde dogrudan gercek
 * PDF'te kullanilan QuoteContentBody'dir.
 */
export function StandardQuotePdfPreview({
  theme,
  grouped,
  logoUrl,
  company,
}: {
  theme: StandardQuotePdfTheme;
  grouped: boolean;
  logoUrl: string | null;
  company: { address: string; phone: string; email: string };
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.5);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setZoom(Math.min(1, entry.contentRect.width / A4_WIDTH_PX));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const quote = buildSampleQuote(grouped);
  const footerCells = [company.address, company.phone, company.email].filter(Boolean);

  return (
    <div ref={containerRef} className="w-full overflow-hidden">
      <div
        className="print-mode flex flex-col bg-white shadow-md ring-1 ring-black/5"
        style={{ width: A4_WIDTH_PX, minHeight: A4_HEIGHT_PX, zoom }}
      >
        <div
          className="flex shrink-0 items-center justify-between"
          style={{
            // Backend ile ayni: sayfa ust kenarina bitisik 22mm'lik renkli band.
            height: '22mm',
            boxSizing: 'border-box',
            background: theme.headerBgColor,
            padding: `8px ${PAGE_MARGIN_PX}px`,
            fontFamily: 'Arial, Helvetica, sans-serif',
          }}
        >
          <div className="flex items-center gap-3">
            {logoUrl && <img src={logoUrl} alt="" className="block h-11 w-auto object-contain" />}
            <span className="text-xl font-bold" style={{ color: theme.titleColor }}>
              {tr.crm.quoteTemplatePrint.coverTitle}
            </span>
          </div>
          <div
            className="text-right text-[11px] leading-normal font-bold"
            style={{ color: theme.textColor }}
          >
            <div>{dateFormatter.format(new Date(quote.quoteDate))}</div>
            <div># {quote.quoteNumber}</div>
          </div>
        </div>

        <div
          className="flex-1 px-6 pt-3 pb-6"
          style={{
            marginLeft: PAGE_MARGIN_PX,
            marginRight: PAGE_MARGIN_PX,
            ...standardQuotePdfThemeStyle(theme),
          }}
        >
          <QuoteContentBody
            quote={quote}
            isPrintMode
            onOpportunityClick={() => undefined}
            sender={SAMPLE_SENDER}
            theme={theme}
          />
        </div>

        <div
          className="flex shrink-0 flex-col items-center gap-1 overflow-hidden text-xs leading-tight"
          style={{
            background: theme.footerBgColor,
            color: theme.footerTextColor,
            // Backend ile ayni: atif satiri alttan sabit 3mm'de durur.
            padding: `8px ${PAGE_MARGIN_PX}px 3mm`,
            fontFamily: 'Arial, Helvetica, sans-serif',
            boxSizing: 'border-box',
            // Backend ile ayni birim: sabit yukseklik mm cinsinden (96dpi).
            height: theme.footerHeightMm !== null ? `${theme.footerHeightMm}mm` : undefined,
          }}
        >
          <div className="flex min-h-0 w-full flex-auto flex-col items-center justify-center gap-1 overflow-hidden">
            {theme.footerShowLogo && logoUrl && (
              <img
                src={logoUrl}
                alt=""
                className="block w-auto object-contain"
                style={{ height: `${theme.footerLogoHeightMm}mm` }}
              />
            )}
          </div>
          {footerCells.length > 0 && (
            <div className="flex w-full shrink-0 items-center justify-center gap-6">
              {company.address && (
                <div className="line-clamp-3 max-w-[45%] overflow-hidden">{company.address}</div>
              )}
              {company.phone && <div className="whitespace-nowrap">{company.phone}</div>}
              {company.email && <div className="whitespace-nowrap">{company.email}</div>}
            </div>
          )}
          <div className="shrink-0" style={{ color: '#2196f3' }}>
            {tr.crm.quoteTemplates.standard.preview.footerNotice}
          </div>
        </div>
      </div>
    </div>
  );
}
