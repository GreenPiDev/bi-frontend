import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import {
  Check,
  ChevronRight,
  FileDown,
  Mail,
  Pencil,
  RotateCcw,
  Send,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { ApproveQuoteModal } from './approve-quote-modal';
import { RejectQuoteModal } from './reject-quote-modal';
import { NewMessageModal } from './new-message-modal';
import { QuoteChartsContent } from './quote-charts-content';
import { QuoteCostContent } from './quote-cost-content';
import { BackLink } from '../components/ui/back-link';
import { Badge } from '../components/ui/badge';
import { CircleIconButton } from '../components/ui/circle-icon-button';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { HorizontalTabPanel, type HorizontalTabItem } from '../components/ui/horizontal-tab-panel';
import { Modal } from '../components/ui/modal';
import { PageHelp } from '../components/ui/page-help';
import { Table, type TableColumn } from '../components/ui/table';
import { useToast } from '../components/ui/toast-context';
import { Tooltip } from '../components/ui/tooltip';
import { TruncatedTextCell } from '../components/ui/truncated-text-cell';
import { useMeQuery } from '../features/auth/use-auth';
import { hasPermission } from '../features/auth/permissions';
import {
  useApproveQuoteMutation,
  useDeleteQuoteMutation,
  useQuoteQuery,
  useQuoteStatusHistoryQuery,
  useQuoteStockCheckQuery,
  useRejectQuoteMutation,
  useUpdateQuoteMutation,
} from '../features/crm/use-quotes';
import { useDrawingsQuery } from '../features/crm/use-drawings';
import { useTenantProfileQuery } from '../features/crm/use-tenant-logo';
import {
  ApiError,
  API_BASE_URL,
  getQuotePrintData,
  type Drawing,
  type IbanAccountSnapshot,
  type Quote,
  type QuoteItem,
  type QuotePrintSenderData,
  type QuoteRevisionSnapshot,
  type QuoteStatus,
  type QuoteStatusHistoryEntry,
  type QuoteStockCheckRow,
} from '../lib/api';
import { openUrlInNewTab } from '../lib/download';
import { formatIbanInput } from '../lib/iban-validation';
import {
  computeLineTotal,
  convertTotalsToQuoteCurrency,
  formatCurrencyAmount,
  getQuoteCurrencyTotals,
  groupQuoteItemTotals,
} from '../lib/quote-totals';
import { tr } from '../i18n/tr';

const STATUS_BADGE_VARIANT: Record<
  QuoteStatus,
  'success' | 'warning' | 'danger' | 'neutral' | 'orange' | 'info'
> = {
  UNSPECIFIED: 'neutral',
  DRAFT: 'neutral',
  SENT: 'info',
  PENDING_APPROVAL: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  REVIZE: 'orange',
};

const STATUS_TEXT_CLASSES: Record<QuoteStatus, string> = {
  UNSPECIFIED: 'text-app-muted',
  DRAFT: 'text-app-muted',
  SENT: 'text-app-primary',
  PENDING_APPROVAL: 'text-amber-600 dark:text-amber-400',
  APPROVED: 'text-app-success',
  REJECTED: 'text-app-danger',
  REVIZE: 'text-orange-600 dark:text-orange-400',
};

const dateFormatter = new Intl.DateTimeFormat('tr-TR');
const quantityFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 });
const dateTimeFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

/** "Durum" sekmesi: iki ardisik gecis arasindaki sureyi "X gun Y sa Z dk" olarak
 * bicimlendirir - sifir olan en buyuk birimler atlanir, hepsi sifirsa "0 dk" doner. */
function formatStatusDuration(fromIso: string, toIso: string): string {
  const diffMinutes = Math.max(
    0,
    Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60_000),
  );
  const days = Math.floor(diffMinutes / (24 * 60));
  const hours = Math.floor((diffMinutes % (24 * 60)) / 60);
  const minutes = diffMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} gün`);
  if (hours > 0) parts.push(`${hours} sa`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} dk`);
  return parts.join(' ');
}

function lineTotal(item: QuoteItem): number {
  return computeLineTotal({
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
    discountPct: Number(item.discountPct),
    vatPct: Number(item.vatPct),
  }).lineTotal;
}

function computeTotals(quote: Quote) {
  return getQuoteCurrencyTotals(quote);
}

/** Ad-hoc "Ürünleri Gruplayarak Ekle" (bkz. Quote.groupItemsByProduct) - bir grubun
 * toplam tutarini, genel "Genel Toplam" (quoteGrandTotalDisplay, lib/quote-totals.ts)
 * ile AYNI kur-cevrim/coklu-para-birimi mantigiyla hesaplar, sadece TUM teklif yerine
 * tek bir grubun kalemleriyle. */
function formatGroupAmount(items: QuoteItem[], quote: Quote): string {
  const totals = groupQuoteItemTotals(
    items.map((item) => ({
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      discountPct: Number(item.discountPct),
      vatPct: Number(item.vatPct),
      currency: item.currency,
    })),
  );
  const foreignTotals = totals.filter((t) => t.currency !== quote.quoteCurrency);
  if (foreignTotals.length === 0) {
    return totals.map((t) => formatCurrencyAmount(t.grandTotal, t.currency)).join(' + ');
  }
  const conversion = convertTotalsToQuoteCurrency(
    totals,
    quote.quoteCurrency,
    quote.exchangeRates?.rates ?? {},
  );
  if (conversion.missingRateCurrencies.length > 0) {
    return totals.map((t) => formatCurrencyAmount(t.grandTotal, t.currency)).join(' + ');
  }
  return formatCurrencyAmount(conversion.grandTotal, quote.quoteCurrency);
}

function formatOldTotalFromSnapshot(snapshot: QuoteRevisionSnapshot): string {
  const oldTotals = groupQuoteItemTotals(snapshot.items);
  const foreignOldTotals = oldTotals.filter((t) => t.currency !== snapshot.quoteCurrency);
  if (foreignOldTotals.length === 0) {
    return oldTotals.map((t) => formatCurrencyAmount(t.grandTotal, t.currency)).join(' + ');
  }
  const oldConversion = convertTotalsToQuoteCurrency(
    oldTotals,
    snapshot.quoteCurrency,
    snapshot.exchangeRates?.rates ?? {},
  );
  if (oldConversion.missingRateCurrencies.length > 0) {
    return oldTotals.map((t) => formatCurrencyAmount(t.grandTotal, t.currency)).join(' + ');
  }
  return formatCurrencyAmount(oldConversion.grandTotal, snapshot.quoteCurrency);
}

/** Ad-hoc "Ürünleri Gruplayarak Ekle" (bkz. Quote.groupItemsByProduct) - kalemleri
 * `groupName`e gore, ilk goruldukleri sirada kumeler (ayni ad birden fazla yerde
 * gorunse de TEK grup sayilir). `groupName` olmayan kalemler `null` anahtarli, baslik
 * satiri basilmayan bir "grupsuz" kumede toplanir. */
function groupQuoteItemsByGroupName(
  items: QuoteItem[],
): { groupName: string | null; items: QuoteItem[] }[] {
  const groups: { groupName: string | null; items: QuoteItem[] }[] = [];
  const indexByName = new Map<string | null, number>();
  for (const item of items) {
    const name = item.groupName ?? null;
    let index = indexByName.get(name);
    if (index === undefined) {
      index = groups.length;
      indexByName.set(name, index);
      groups.push({ groupName: name, items: [] });
    }
    groups[index].items.push(item);
  }
  return groups;
}

type QuoteItemPrintRow =
  | { kind: 'group'; key: string; groupName: string }
  | { kind: 'item'; key: string; item: QuoteItem; zebraIndex: number };

/** Gruplu modda, print zebra deseninin (beyaz/acik yesil) grup baslik satirlariyla
 * kesintiye ugramadan TUM tablo boyunca sürmesi icin - zebraIndex sadece urun
 * satirlarinda artar, grup basligi satirlari hic saymaz (bkz. asagidaki render,
 * grupsuz tablonun orijinal `nth-child` CSS deseniyle AYNI sirayi uretir). */
function buildQuoteItemPrintRows(items: QuoteItem[]): QuoteItemPrintRow[] {
  const rows: QuoteItemPrintRow[] = [];
  let zebraIndex = 0;
  for (const group of groupQuoteItemsByGroupName(items)) {
    if (group.groupName) {
      rows.push({ kind: 'group', key: `group-${group.groupName}`, groupName: group.groupName });
    }
    for (const item of group.items) {
      rows.push({ kind: 'item', key: item.id, item, zebraIndex });
      zebraIndex += 1;
    }
  }
  return rows;
}

function MetaCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-wide text-app-muted uppercase">{label}</p>
      <div className="mt-1.5 text-sm font-medium text-app-text">{children}</div>
    </div>
  );
}

function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="shrink-0 text-[11px] font-bold tracking-wide text-app-muted uppercase">
        {children}
      </span>
      <span className="h-px flex-1 bg-app-border" />
    </div>
  );
}

export function QuoteContentBody({
  quote,
  isPrintMode = false,
  onOpportunityClick,
  onProjectClick,
  sender,
}: {
  quote: Quote;
  isPrintMode?: boolean;
  onOpportunityClick: (opportunityId: string) => void;
  onProjectClick?: (projectNumber: string) => void;
  /** Sadece yazdirma gorunumunde (isPrintMode) dolu gelir - bkz.
   * docs/VARSAYIMLAR.md "sirket bilgileri"/"gonderen" parite notu. */
  sender?: QuotePrintSenderData | null;
}) {
  const totals = computeTotals(quote);
  const foreignCurrencyTotals = totals.filter((t) => t.currency !== quote.quoteCurrency);
  const conversion =
    foreignCurrencyTotals.length > 0
      ? convertTotalsToQuoteCurrency(totals, quote.quoteCurrency, quote.exchangeRates?.rates ?? {})
      : null;

  /** Ara toplam/KDV/genel toplam (+ kur cevrim) bloğu - normalde kalem tablosunun
   * ALTINDA tek bir yerde render edilir. Gruplu teklifte (bkz. Quote.groupItemsByProduct)
   * kullanıcı talebiyle bunun yeri degisti: "Gruplar" özet tablosu ile detaylı kalem
   * tablosu ARASINA alınır - bu yuzden tek bir JSX degiskeni olarak çıkarılıp iki farklı
   * yerde kosullu kullanilir (bkz. asagisi). Grupsuz teklifin yerlesimi degismedi. */
  const totalsSection = (
    <>
      <div className="mt-4 flex flex-wrap justify-end gap-4 text-xs">
        {totals.map((t) => (
          <div key={t.currency} className="flex w-44 flex-col gap-1">
            {totals.length > 1 && (
              <span className="text-right text-[11px] font-semibold text-app-muted">
                {t.currency}
              </span>
            )}
            <div className="flex justify-between">
              <span className="text-app-muted">{tr.crm.quotes.detail.subtotalLabel}</span>
              <span className="text-app-text">{formatCurrencyAmount(t.subtotal, t.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-app-muted">{tr.crm.quotes.detail.vatTotalLabel}</span>
              <span className="text-app-text">{formatCurrencyAmount(t.vatTotal, t.currency)}</span>
            </div>
            <div className="flex justify-between border-t border-app-border pt-1 text-sm font-bold">
              <span className="text-app-text">{tr.crm.quotes.detail.totalLabel}</span>
              <span className="text-app-text">
                {formatCurrencyAmount(t.grandTotal, t.currency)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {conversion && (
        <div className="mt-4 flex flex-col items-end gap-1">
          {conversion.missingRateCurrencies.length === 0 ? (
            <>
              <div className="flex w-44 justify-between border-t border-app-border pt-1 text-sm font-bold">
                <span className="text-app-text">
                  {tr.crm.quotes.form.convertedGrandTotalLabel(quote.quoteCurrency)}
                </span>
                <span className="text-app-text">
                  {formatCurrencyAmount(conversion.grandTotal, quote.quoteCurrency)}
                </span>
              </div>
              <p className="text-right text-[11px] whitespace-nowrap text-app-muted">
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
    </>
  );

  const statusHistoryQuery = useQuoteStatusHistoryQuery(quote.id, { enabled: !isPrintMode });
  const revisionEntries = (statusHistoryQuery.data ?? [])
    .filter((entry) => entry.status === 'REVIZE' && entry.note)
    .slice()
    .reverse();
  const rejectionEntries = (statusHistoryQuery.data ?? []).filter(
    (entry) => entry.status === 'REJECTED' && entry.reason,
  );
  const rejectionEntry = rejectionEntries[rejectionEntries.length - 1] ?? null;
  const [revisionNoteModalEntry, setRevisionNoteModalEntry] =
    useState<QuoteStatusHistoryEntry | null>(null);
  const revisionColumns: TableColumn<QuoteStatusHistoryEntry>[] = [
    {
      key: 'createdAt',
      header: tr.crm.quotes.statusTab.dateColumn,
      className: 'w-40 whitespace-nowrap text-app-muted',
      render: (entry) => dateTimeFormatter.format(new Date(entry.createdAt)),
    },
    {
      key: 'createdByName',
      header: tr.crm.quotes.statusTab.actorColumn,
      className: 'w-40 whitespace-nowrap text-app-muted',
      render: (entry) => entry.createdByName ?? '—',
    },
    {
      key: 'note',
      header: tr.crm.quotes.statusTab.noteColumn,
      render: (entry) => (
        <TruncatedTextCell text={entry.note} onOpen={() => setRevisionNoteModalEntry(entry)} />
      ),
    },
  ];

  /** Ayni gruba ait ardisik banka hesaplarinin basina grubun logosunu tek
   * seferlik, o blok kadar yuksek (rowSpan) basmak icin - bkz. gruplama kurali
   * asagidaki bankLogoSpans kullanimi. */
  const bankLogoSpans = new Map<number, { rowSpan: number; logoUrl: string | null }>();
  if (quote.ibanAccounts) {
    let index = 0;
    while (index < quote.ibanAccounts.length) {
      const groupId = quote.ibanAccounts[index].groupId;
      let rowSpan = 1;
      if (groupId) {
        while (
          index + rowSpan < quote.ibanAccounts.length &&
          quote.ibanAccounts[index + rowSpan].groupId === groupId
        ) {
          rowSpan += 1;
        }
      }
      bankLogoSpans.set(index, { rowSpan, logoUrl: quote.ibanAccounts[index].groupLogoUrl });
      index += rowSpan;
    }
  }
  /** Hicbir hesap grubunun logosu yoksa, bos bir sutun/bosluk birakmamak icin
   * logo sutununu tabloya hic eklemeyiz. */
  const hasAnyBankLogo = [...bankLogoSpans.values()].some((span) => span.logoUrl);

  const itemColumns: TableColumn<QuoteItem>[] = [
    {
      key: 'sku',
      header: tr.crm.quotes.detail.skuColumn,
      // "w-[1%]" + whitespace-nowrap: auto-layout tablolarda kolonu icerigi kadar
      // daraltan bilinen bir CSS hilesi - aksi halde genislik belirtilmeyen bu kolon,
      // bosta kalan tum alani "ÜRÜN" kolonuyla paylasip aralarinda devasa bosluk
      // birakiyordu. Hem web hem PDF (isPrintMode) ayni auto-layout mantigini kullanir
      // (bkz. kullanici istegi: "aynı web sayfasındaki mantıkla davransın").
      className: 'w-[1%] whitespace-nowrap text-app-muted',
      render: (item) => item.product.sku ?? '—',
    },
    {
      key: 'product',
      header: tr.crm.products.nameColumn,
      className: 'break-words',
      render: (item) => item.product.name,
    },
    {
      key: 'brand',
      header: tr.crm.quotes.detail.brandColumn,
      // PDF'te (isPrintMode) "Ürün" kolonu auto-layout'ta bosta kalan tum genisligi
      // yuttugu icin uzun urun isimleriyle bu kolona yapisabiliyordu - sol padding
      // artirilarak kolon biraz daha saga itiliyor (web gorunumunde degismiyor).
      className: clsx('w-24 whitespace-nowrap text-app-muted', isPrintMode && '!pl-10'),
      render: (item) => item.brand ?? '—',
    },
    {
      key: 'quantity',
      header: tr.crm.quotes.detail.quantityColumn,
      className: 'w-20 whitespace-nowrap text-right text-app-muted',
      render: (item) => item.quantity,
    },
    {
      key: 'unitPrice',
      header: tr.crm.quotes.detail.unitPriceColumn,
      className: 'w-28 whitespace-nowrap text-right text-app-muted',
      render: (item) => formatCurrencyAmount(Number(item.unitPrice), item.currency),
    },
    {
      key: 'vatPct',
      header: tr.crm.quotes.detail.vatColumn,
      className: 'w-16 whitespace-nowrap text-right text-app-muted',
      render: (item) => `%${item.vatPct}`,
    },
    {
      key: 'lineTotal',
      header: tr.crm.quotes.detail.lineTotalColumn,
      className: 'w-28 whitespace-nowrap text-right',
      render: (item) => formatCurrencyAmount(lineTotal(item), item.currency),
    },
  ];

  /** Ad-hoc "Ürünleri Gruplayarak Ekle" (bkz. Quote.groupItemsByProduct) - pano
   * ureticileri fiyati PANO (grup) bazinda veriyor, tek tek urun fiyati listede
   * gorunmuyor - bu yuzden gruplu kalem tablosunda fiyatla ilgili kolonlar
   * (birim fiyat/KDV/tutar) hic gosterilmez, sadece urun kodu/ad/marka/miktar kalir.
   * Grup bazinda toplam tutar, ayri "Gruplar" ozet tablosunda gosterilir (bkz.
   * formatGroupAmount). itemColumns'un dar/genis width class'lari (w-[1%], w-24,
   * break-words...) auto-layout + "Ürün" kolonunun bosta kalan tum genisligi
   * yutmasi icin tasarlanmisti - fiyat kolonlari kalkinca kalan 4 kolon bu
   * yuzden cok orantisiz dagiliyordu (bkz. kullanici ekran goruntusu). Bu
   * yuzden width/whitespace class'lari burada atilip asagidaki tabloya
   * `table-fixed` verilir - esit genislikte 4 kolon. */
  const groupedItemColumns = itemColumns
    .filter((column) => !['unitPrice', 'vatPct', 'lineTotal'].includes(column.key))
    .map((column) => ({
      ...column,
      className: clsx(
        'break-words',
        column.key !== 'product' && 'text-app-muted',
        column.key === 'quantity' && 'text-right',
      ),
    }));

  /** Yazdirma disindaki (web) gorunumde banka hesaplari tablosu - PDF/yazdirma
   * cikisi degismemesi icin sadece !isPrintMode'da kullanilir, asagidaki ham
   * <table>'in yerini almaz (bkz. kullanici istegi: "pdf'i bozma"). Grup logosu
   * rowSpan ile degil her satirda tekrar basilir - genel Table bileseni rowSpan
   * desteklemiyor, bu da web gorunumunde kabul edilebilir bir basitlestirme. */
  const bankColumns: TableColumn<IbanAccountSnapshot>[] = [
    ...(hasAnyBankLogo
      ? [
          {
            key: 'logo',
            header: '',
            className: 'w-20',
            render: (account: IbanAccountSnapshot) =>
              account.groupLogoUrl && (
                <img
                  src={account.groupLogoUrl}
                  alt=""
                  className="max-h-10 w-auto max-w-20 object-contain"
                />
              ),
          },
        ]
      : []),
    {
      key: 'bankName',
      header: tr.crm.quotes.detail.bankNameLabel,
      className: 'w-28 whitespace-nowrap',
      render: (account) => account.bankName,
    },
    {
      key: 'accountHolderName',
      header: tr.crm.quotes.detail.accountHolderNameLabel,
      className: 'break-words',
      render: (account) => account.accountHolderName,
    },
    {
      key: 'accountNumber',
      header: tr.crm.quotes.detail.accountNumberLabel,
      className: 'whitespace-nowrap',
      render: (account) => account.accountNumber ?? '—',
    },
    {
      key: 'iban',
      header: tr.crm.quotes.detail.ibanLabel,
      className: 'whitespace-nowrap',
      render: (account) => `${formatIbanInput(account.iban)} - ${account.currency}`,
    },
  ];

  return (
    <div
      className={clsx(
        isPrintMode &&
          '[&_.text-app-muted]:!text-black [&_.text-app-danger]:!text-black [&_.border-app-border]:!border-[#8bc34a]',
      )}
    >
      {isPrintMode && (
        <div className="grid grid-cols-2 gap-x-8 pt-1 text-sm">
          <div>
            <h3 className="text-sm font-bold" style={{ color: '#2196f3' }}>
              {tr.crm.quoteTemplatePrint.accountInfoTitle}
            </h3>
            <p className="mt-1.5 text-sm font-bold text-app-text">{quote.account.name}</p>
            {quote.account.address && (
              <p className="text-sm text-app-muted">{quote.account.address}</p>
            )}
            {(quote.account.district || quote.account.city) && (
              <p className="text-sm text-app-muted">
                {[quote.account.district, quote.account.city].filter(Boolean).join(' / ')}
              </p>
            )}
          </div>
          <div className="text-right">
            <h3 className="text-sm font-bold" style={{ color: '#2196f3' }}>
              {tr.crm.quoteTemplatePrint.senderInfoTitle}
            </h3>
            {sender && <p className="mt-1.5 text-sm font-bold text-app-text">{sender.name}</p>}
            {sender?.title && <p className="text-sm text-app-muted">{sender.title}</p>}
            {sender?.phone && (
              <p className="flex justify-end gap-2 text-sm text-app-muted">
                <span>{tr.crm.quoteTemplatePrint.phoneLabel} :</span>
                <span>{sender.phone}</span>
              </p>
            )}
            {sender?.email && (
              <p className="flex justify-end gap-2 text-sm text-app-muted">
                <span>{tr.crm.quoteTemplatePrint.emailLabel} :</span>
                <span>{sender.email}</span>
              </p>
            )}
          </div>
          <div className="col-span-2 mt-1 h-0.5" style={{ backgroundColor: '#8bc34a' }} />
        </div>
      )}
      <div
        className={clsx(
          'grid grid-cols-2 gap-4',
          !isPrintMode && 'sm:divide-x sm:divide-app-border',
          isPrintMode ? 'border-b-2 py-4' : 'rounded-xl border border-app-border bg-white p-5',
          isPrintMode ? 'sm:grid-cols-2' : quote.project ? 'sm:grid-cols-6' : 'sm:grid-cols-5',
        )}
        style={isPrintMode ? { borderColor: '#8bc34a' } : undefined}
      >
        {!isPrintMode && (
          <MetaCell label={tr.crm.quotes.detail.quoteDateLabel}>
            {dateFormatter.format(new Date(quote.quoteDate))}
          </MetaCell>
        )}
        {isPrintMode ? (
          <div className="col-span-2 flex justify-between gap-4">
            <p className="flex flex-col text-sm font-medium text-app-text">
              <span className="font-bold" style={{ color: '#2196f3' }}>
                {tr.crm.quotes.detail.validityPeriodLabel}:
              </span>
              {quote.validityPeriod ?? tr.crm.quotes.detail.validityPeriodEmpty}
            </p>
            <p className="flex flex-col text-sm font-medium text-app-text">
              <span className="font-bold" style={{ color: '#2196f3' }}>
                {tr.crm.quotes.detail.paymentMethodLabel}:
              </span>
              {quote.paymentMethod ?? tr.crm.quotes.detail.paymentMethodEmpty}
            </p>
            <p className="flex flex-col text-sm font-medium text-app-text">
              <span className="font-bold" style={{ color: '#2196f3' }}>
                {tr.crm.quotes.detail.leadTimeLabel}:
              </span>
              {quote.leadTime ?? tr.crm.quotes.detail.leadTimeEmpty}
            </p>
          </div>
        ) : (
          <>
            <MetaCell label={tr.crm.quotes.detail.leadTimeLabel}>
              {quote.leadTime ?? tr.crm.quotes.detail.leadTimeEmpty}
            </MetaCell>
            <MetaCell label={tr.crm.quotes.detail.validityPeriodLabel}>
              {quote.validityPeriod ?? tr.crm.quotes.detail.validityPeriodEmpty}
            </MetaCell>
            <MetaCell label={tr.crm.quotes.detail.paymentMethodLabel}>
              {quote.paymentMethod ?? tr.crm.quotes.detail.paymentMethodEmpty}
            </MetaCell>
          </>
        )}
        {!isPrintMode && (
          <MetaCell label={tr.crm.quotes.detail.grandTotalLabel}>
            {conversion && conversion.missingRateCurrencies.length === 0
              ? formatCurrencyAmount(conversion.grandTotal, quote.quoteCurrency)
              : totals.map((t) => formatCurrencyAmount(t.grandTotal, t.currency)).join(' + ')}
          </MetaCell>
        )}
        {!isPrintMode && quote.project && (
          <MetaCell label={tr.crm.quotes.detail.relatedProjectLabel}>
            <Tooltip content={quote.project.name}>
              <button
                type="button"
                onClick={() => onProjectClick?.(quote.project!.projectNumber)}
                className="cursor-pointer text-app-brand hover:underline"
              >
                {quote.project.projectNumber}
              </button>
            </Tooltip>
          </MetaCell>
        )}
      </div>

      {!isPrintMode && revisionEntries.length > 0 && (
        <div className="mt-8">
          <SectionHeader>{tr.crm.quotes.detail.revisionTitle}</SectionHeader>
          <Table
            columns={revisionColumns}
            data={revisionEntries}
            keyField={(entry) => entry.id}
            fixedLayout
          />
          {quote.revisionSnapshot && (
            <p className="mt-2 text-xs text-app-muted">
              {tr.crm.quotes.detail.revisionOldTotalLabel}{' '}
              {formatOldTotalFromSnapshot(quote.revisionSnapshot)}
            </p>
          )}
          {revisionNoteModalEntry && (
            <Modal
              title={tr.crm.quotes.statusTab.noteModalTitle}
              onClose={() => setRevisionNoteModalEntry(null)}
            >
              <p className="whitespace-pre-wrap text-sm text-app-text">
                {revisionNoteModalEntry.note}
              </p>
            </Modal>
          )}
        </div>
      )}

      {!isPrintMode && quote.status === 'REJECTED' && rejectionEntry && (
        <div className="mt-8">
          <SectionHeader>{tr.crm.quotes.detail.rejectionReasonTitle}</SectionHeader>
          <p className="text-sm text-app-text">{rejectionEntry.reason}</p>
          {rejectionEntry.note && (
            <p className="mt-1 text-sm text-app-muted">
              {tr.crm.quotes.detail.rejectionNoteLabel} {rejectionEntry.note}
            </p>
          )}
        </div>
      )}

      {quote.groupItemsByProduct && (
        // Gruplu teklifte, asagidaki detayli kalem tablosundan ONCE pano
        // ureticilerinin istedigi ozet: her grubun (pano) tek bir toplam tutari -
        // fiyat gruplar arasinda bu tabloda gorunur, asagidaki kalem tablosunda
        // artik hic gosterilmez (bkz. groupedItemColumns doc comment'i).
        <div className="mt-8">
          {!isPrintMode && <SectionHeader>{tr.crm.quotes.detail.groupsSummaryTitle}</SectionHeader>}
          <div
            className={clsx(
              '[&_tbody_td]:text-xs',
              isPrintMode &&
                '[&>div]:border-0 [&_thead]:bg-white [&_thead]:normal-case [&_th]:!text-[#2196f3] [&_th.text-app-muted]:!text-[#2196f3] [&_td]:!py-1 [&_th]:!py-1 [&_tbody_tr]:border-b-0',
            )}
          >
            <div className="border border-app-border bg-app-surface overflow-hidden">
              <table className="w-full text-left text-[clamp(0.8125rem,0.77rem+0.25vw,0.9375rem)]">
                <thead className="border-b border-app-border bg-app-primary uppercase text-[clamp(0.6875rem,0.65rem+0.2vw,0.8125rem)] text-white">
                  <tr>
                    <th className="w-16 px-4 py-3 !text-white">
                      {tr.crm.quotes.detail.groupNoColumn}
                    </th>
                    <th className="px-4 py-3 !text-white">
                      {tr.crm.quotes.detail.groupNameColumn}
                    </th>
                    <th className="w-32 px-4 py-3 text-right !text-white">
                      {tr.crm.quotes.detail.groupAmountColumn}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groupQuoteItemsByGroupName(quote.items)
                    .filter((group): group is { groupName: string; items: QuoteItem[] } =>
                      Boolean(group.groupName),
                    )
                    .map((group, index) => (
                      <tr
                        key={group.groupName}
                        className={clsx(
                          'border-b border-app-border last:border-0',
                          isPrintMode
                            ? index % 2 === 0
                              ? '!bg-white'
                              : '!bg-[#e8f5e9]'
                            : 'bg-app-surface',
                        )}
                      >
                        <td className="px-4 py-3 !text-app-text">{index + 1}</td>
                        <td className="px-4 py-3 !text-app-text">{group.groupName}</td>
                        <td className="px-4 py-3 text-right font-semibold !text-app-text">
                          {formatGroupAmount(group.items, quote)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalsSection}
        </div>
      )}

      <div className="mt-8">
        {!isPrintMode && <SectionHeader>{tr.crm.quotes.detail.itemsTitle}</SectionHeader>}
        {quote.groupItemsByProduct ? (
          // Gruplu teklif: grupsuz tablonun (asagidaki else kolu, Table bileseni)
          // birebir AYNI gorunumu - sadece grup baslik satirlari acik mavi arkaplanla
          // araya girer. Grupsuz tablo nasil `isPrintMode`da CSS descendant selector'lariyle
          // (header beyaz+mavi yazi, satir kenarliklari kalkar) donusuyorsa burada da
          // AYNI mekanizma kullanilir - sadece zebra (beyaz/acik yesil) deseni CSS
          // `nth-child` yerine JS'te hesaplanir (bkz. buildQuoteItemPrintRows doc
          // comment'i) - grup baslik satirlari araya girince nth-child sirasi bozulurdu.
          // Fiyatla ilgili kolonlar (birim fiyat/KDV/tutar) bu tabloda yok (bkz.
          // groupedItemColumns doc comment'i) - toplam yukaridaki "Gruplar" ozetinde.
          <div
            className={clsx(
              '[&_tbody_td]:text-xs',
              isPrintMode &&
                '[&>div]:border-0 [&_thead]:bg-white [&_thead]:normal-case [&_th]:!text-[#2196f3] [&_th.text-app-muted]:!text-[#2196f3] [&_td]:!py-1 [&_th]:!py-1 [&_tbody_tr]:border-b-0',
            )}
          >
            <div className="border border-app-border bg-app-surface overflow-hidden">
              <table className="w-full table-fixed text-left text-[clamp(0.8125rem,0.77rem+0.25vw,0.9375rem)]">
                <thead className="border-b border-app-border bg-app-primary uppercase text-[clamp(0.6875rem,0.65rem+0.2vw,0.8125rem)] text-white">
                  <tr>
                    <th className="w-12 px-4 py-3 !text-white">
                      {tr.crm.quotes.detail.groupNoColumn}
                    </th>
                    {groupedItemColumns.map((column) => (
                      <th
                        key={column.key}
                        className={clsx('px-4 py-3 !text-white', column.className)}
                      >
                        {column.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {quote.items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={groupedItemColumns.length + 1}
                        className="px-4 py-8 text-center text-app-muted"
                      >
                        {quote.itemsEntryMode === 'MANUAL_TOTAL'
                          ? tr.crm.quotes.detail.manualTotalItemsEmpty
                          : tr.crm.quotes.form.summaryEmpty}
                      </td>
                    </tr>
                  ) : (
                    buildQuoteItemPrintRows(quote.items).map((row) =>
                      row.kind === 'group' ? (
                        <tr
                          key={row.key}
                          className="border-b border-app-border bg-[#e3f2fd] last:border-0"
                        >
                          <td
                            colSpan={groupedItemColumns.length + 1}
                            className="px-4 py-2 font-bold"
                          >
                            {row.groupName}
                          </td>
                        </tr>
                      ) : (
                        <tr
                          key={row.key}
                          className={clsx(
                            'border-b border-app-border last:border-0',
                            isPrintMode
                              ? row.zebraIndex % 2 === 0
                                ? '!bg-white'
                                : '!bg-[#e8f5e9]'
                              : 'bg-app-surface',
                          )}
                        >
                          <td className="w-12 px-4 py-3 !text-app-text">{row.zebraIndex + 1}</td>
                          {groupedItemColumns.map((column) => (
                            <td
                              key={column.key}
                              className={clsx('px-4 py-3 !text-app-text', column.className)}
                            >
                              {column.render(row.item)}
                            </td>
                          ))}
                        </tr>
                      ),
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div
            className={clsx(
              '[&_tbody_td]:text-xs',
              isPrintMode &&
                '[&>div]:border-0 [&_thead]:bg-white [&_thead]:normal-case [&_th]:!text-[#2196f3] [&_th.text-app-muted]:!text-[#2196f3] [&_td]:!py-1 [&_th]:!py-1 [&_tbody_tr]:border-b-0 [&_tbody_tr:nth-child(odd)]:!bg-white [&_tbody_tr:nth-child(even)]:!bg-[#e8f5e9]',
            )}
          >
            <Table
              columns={itemColumns}
              data={quote.items}
              keyField={(item) => item.id}
              emptyMessage={
                quote.itemsEntryMode === 'MANUAL_TOTAL'
                  ? tr.crm.quotes.detail.manualTotalItemsEmpty
                  : tr.crm.quotes.form.summaryEmpty
              }
              // table-fixed kullanilmiyor: auto-layout + "w-[1%]" hilesi (sku kolonunda)
              // hem web hem PDF'te kolonlarin icerige gore boyutlanmasini, uzun urun
              // kodlarinin gereksiz yere satirlara bolunmemesini sagliyor.
            />
          </div>
        )}

        {/* Gruplu teklifte bu blok yukarida, "Gruplar" ozeti ile bu tablonun arasinda
            zaten gosterildi (bkz. totalsSection kullanimindaki ilk yer) - burada
            TEKRAR basilmaz. */}
        {!quote.groupItemsByProduct && totalsSection}
      </div>

      {quote.itemsEntryMode === 'MANUAL_TOTAL' && !isPrintMode && (
        <div className="mt-8 rounded-xl bg-white p-5 shadow-sm">
          <SectionHeader>{tr.crm.quotes.detail.attributesTitle}</SectionHeader>
          {quote.attributes && Object.keys(quote.attributes).length > 0 ? (
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(quote.attributes).map(([key, value]) => (
                <MetaCell key={key} label={key}>
                  {value}
                </MetaCell>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-app-muted">{tr.crm.quotes.detail.attributesEmpty}</p>
          )}
        </div>
      )}

      {quote.ibanAccounts && quote.ibanAccounts.length > 0 && !isPrintMode && (
        <div className="mt-8">
          <SectionHeader>{tr.crm.quotes.detail.bankDetailsTitle}</SectionHeader>
          <Table
            columns={bankColumns}
            data={quote.ibanAccounts}
            keyField={(account, index) => `${account.iban}-${index}`}
          />
        </div>
      )}

      {quote.ibanAccounts && quote.ibanAccounts.length > 0 && isPrintMode && (
        <div className="mt-8">
          <h3 className="text-sm font-bold" style={{ color: '#2196f3' }}>
            {tr.crm.quotes.detail.bankDetailsTitle}
          </h3>
          <table className="mt-2 w-auto text-xs">
            <thead className="border-b border-app-border">
              <tr>
                {hasAnyBankLogo && <th className="p-0" />}
                <th className="px-4 py-1.5 text-left font-bold text-[#2196f3]">
                  {tr.crm.quotes.detail.bankNameLabel}
                </th>
                <th className="px-4 py-1.5 text-left font-bold text-[#2196f3]">
                  {tr.crm.quotes.detail.accountHolderNameLabel}
                </th>
                <th className="px-4 py-1.5 text-left font-bold text-[#2196f3]">
                  {tr.crm.quotes.detail.accountNumberLabel}
                </th>
                <th className="px-4 py-1.5 text-left font-bold text-[#2196f3]">
                  {tr.crm.quotes.detail.ibanLabel}
                </th>
              </tr>
            </thead>
            <tbody>
              {quote.ibanAccounts.map((account, index) => {
                const span = bankLogoSpans.get(index);
                return (
                  <tr
                    key={`${account.iban}-${index}`}
                    className={index % 2 === 0 ? 'bg-white' : 'bg-[#e8f5e9]'}
                  >
                    {hasAnyBankLogo && span && (
                      <td className="p-0 align-middle" rowSpan={span.rowSpan}>
                        {span.logoUrl && (
                          <img
                            src={span.logoUrl}
                            alt=""
                            className="m-0 max-h-10 w-auto max-w-20 object-contain"
                          />
                        )}
                      </td>
                    )}
                    <td className="px-4 py-1.5 whitespace-nowrap text-black">{account.bankName}</td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-black">
                      {account.accountHolderName}
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-black">
                      {account.accountNumber ?? '—'}
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-black">
                      {formatIbanInput(account.iban)} - {account.currency}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(quote.paymentTerms || quote.salesTerms || quote.deliveryTerms || quote.generalTerms) && (
        <div className="mt-8 flex flex-col gap-4">
          {quote.paymentTerms && (
            <div>
              <h3 className="text-sm font-bold" style={{ color: '#2196f3' }}>
                {tr.crm.quotes.detail.paymentTermsTitle}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed whitespace-pre-wrap text-black">
                {quote.paymentTerms}
              </p>
            </div>
          )}
          {quote.salesTerms && (
            <div>
              <h3 className="text-sm font-bold" style={{ color: '#2196f3' }}>
                {tr.crm.quotes.detail.salesTermsTitle}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed whitespace-pre-wrap text-black">
                {quote.salesTerms}
              </p>
            </div>
          )}
          {quote.deliveryTerms && (
            <div>
              <h3 className="text-sm font-bold" style={{ color: '#2196f3' }}>
                {tr.crm.quotes.detail.deliveryTermsTitle}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed whitespace-pre-wrap text-black">
                {quote.deliveryTerms}
              </p>
            </div>
          )}
          {quote.generalTerms && (
            <div>
              <h3 className="text-sm font-bold" style={{ color: '#2196f3' }}>
                {tr.crm.quotes.detail.generalTermsTitle}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed whitespace-pre-wrap text-black">
                {quote.generalTerms}
              </p>
            </div>
          )}
        </div>
      )}

      {!isPrintMode && quote.opportunity && (
        <div className="mt-8 border-t border-app-border pt-6">
          <SectionHeader>{tr.crm.quotes.detail.opportunityTitle}</SectionHeader>
          <InfoLinkRow
            label={tr.crm.opportunities.stageColumn}
            value={quote.opportunity.name}
            suffix={tr.crm.opportunities.stageOptions[quote.opportunity.stage]}
            onClick={() => onOpportunityClick(quote.opportunity!.id)}
          />
        </div>
      )}

      {isPrintMode && (
        <div className="mt-12 grid grid-cols-2 gap-x-8 text-sm">
          <div>
            <h3 className="text-sm font-bold" style={{ color: '#2196f3' }}>
              {tr.crm.quotes.detail.representativeTitle}
            </h3>
            {sender && <p className="mt-1.5 text-sm font-bold text-app-text">{sender.name}</p>}
            {sender?.title && <p className="text-sm text-app-muted">{sender.title}</p>}
            {sender?.phone && (
              <p className="mt-1 flex gap-2 text-sm text-app-muted">
                <span>{tr.crm.quoteTemplatePrint.phoneLabel} :</span>
                <span>{sender.phone}</span>
              </p>
            )}
            {sender?.email && (
              <p className="flex gap-2 text-sm text-app-muted">
                <span>{tr.crm.quoteTemplatePrint.emailLabel} :</span>
                <span>{sender.email}</span>
              </p>
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: '#2196f3' }}>
              {tr.crm.quotes.detail.approvalTitle}
            </h3>
            {quote.contact && (
              <p className="mt-1.5 text-sm font-bold text-app-text">
                {quote.contact.firstName} {quote.contact.lastName}
              </p>
            )}
            <p className="mt-3 text-sm text-app-muted">{tr.crm.quotes.detail.signatureLabel}:</p>
            <p className="mt-3 text-sm text-app-muted">{tr.crm.quotes.detail.approvalDateLabel}:</p>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoLinkRow({
  label,
  value,
  suffix,
  onClick,
}: {
  label: string;
  value: string;
  suffix?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-start justify-between gap-2 rounded-lg text-left transition-transform duration-150 hover:translate-x-1"
    >
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold tracking-wide text-app-muted uppercase">
          {label}
        </span>
        <span className="mt-1 block truncate text-lg font-semibold text-app-text group-hover:text-app-brand">
          {value}
          {suffix && <span className="ml-1 text-sm font-normal text-app-muted">({suffix})</span>}
        </span>
      </span>
      <ChevronRight
        size={16}
        className="mt-1 shrink-0 text-app-muted transition-colors group-hover:text-app-brand"
      />
    </button>
  );
}

const DRAWING_STATUS_BADGE_VARIANT: Record<Drawing['status'], 'success' | 'info'> = {
  DRAFT: 'info',
  FINALIZED: 'success',
};

/**
 * Faz D7: her Drawing zaten dogrudan bir Quote'a bagli (zorunlu `quoteId` FK) - bu
 * bolum yeni bir iliski KURMAZ, mevcut iliskiyi teklif ekraninda gorunur kilar
 * (bkz. docs/VARSAYIMLAR.md V55).
 */
function QuoteDrawingsSection({ quoteId }: { quoteId: string }) {
  const navigate = useNavigate();
  const drawingsQuery = useDrawingsQuery({ quoteId });
  const drawings = drawingsQuery.data ?? [];

  return (
    <div className="mt-8 border-t border-app-border pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-app-text">{tr.crm.drawings.quoteSection.title}</h2>
        <button
          type="button"
          className="text-sm text-app-brand underline"
          onClick={() => navigate(`/cizimler/pdf-ice-aktar?quoteId=${quoteId}`)}
        >
          {tr.crm.drawings.quoteSection.createFromPdf}
        </button>
      </div>

      {!drawingsQuery.isPending && drawings.length === 0 && (
        <p className="mt-2 text-sm text-app-muted">{tr.crm.drawings.quoteSection.empty}</p>
      )}

      {drawings.length > 0 && (
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs font-semibold text-app-muted">
            <tr>
              <th className="py-1">{tr.crm.drawings.quoteSection.nameColumn}</th>
              <th className="py-1">{tr.crm.drawings.quoteSection.panelGroupColumn}</th>
              <th className="py-1">{tr.crm.drawings.quoteSection.statusColumn}</th>
              <th className="py-1">{tr.crm.drawings.quoteSection.downloadColumn}</th>
            </tr>
          </thead>
          <tbody>
            {drawings.map((drawing) => (
              <tr
                key={drawing.id}
                className="cursor-pointer border-t border-app-border hover:bg-app-surface-muted"
                onClick={() => navigate(`/cizimler/${drawing.id}`)}
              >
                <td className="py-2 font-semibold text-app-text">{drawing.name}</td>
                <td className="py-2 text-app-muted">{drawing.panelGroupLabel ?? '—'}</td>
                <td className="py-2">
                  <Badge variant={DRAWING_STATUS_BADGE_VARIANT[drawing.status]}>
                    {drawing.status}
                  </Badge>
                </td>
                <td className="py-2">
                  {drawing.exportFileUrl ? (
                    <a
                      href={drawing.exportFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-app-brand underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {tr.crm.drawings.quoteSection.downloadLink}
                    </a>
                  ) : (
                    tr.crm.drawings.quoteSection.notExportedYet
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

interface StatusHistoryRow {
  id: string;
  status: QuoteStatus;
  statusLabelOverride: string | null;
  createdAt: string;
  createdByName: string | null;
  note: string | null;
  durationLabel: string;
}

/**
 * Backend gecmisi bos donerse (ozellik eklenmeden once olusturulmus teklif) tek bir
 * sentetik "Olusturuldu"/"Ice Aktarildi" satiri uretir - gercek QuoteStatusHistory
 * kaydi degil, sadece Quote.createdAt'ten turetilir (bkz. backend doc comment'i).
 */
function buildStatusHistoryRows(
  entries: QuoteStatusHistoryEntry[],
  quote: Quote,
): StatusHistoryRow[] {
  if (entries.length === 0) {
    return [
      {
        id: 'legacy-created',
        status: quote.status,
        statusLabelOverride:
          quote.itemsEntryMode === 'MANUAL_TOTAL'
            ? tr.crm.quotes.statusTab.importedLabel
            : tr.crm.quotes.statusTab.createdLabel,
        createdAt: quote.createdAt,
        createdByName: quote.createdByName ?? null,
        note: null,
        durationLabel: tr.crm.quotes.statusTab.firstRowDuration,
      },
    ];
  }
  return entries.map((entry, index) => ({
    id: entry.id,
    status: entry.status,
    statusLabelOverride:
      index === 0
        ? entry.status === 'UNSPECIFIED'
          ? tr.crm.quotes.statusTab.importedLabel
          : tr.crm.quotes.statusTab.createdLabel
        : null,
    createdAt: entry.createdAt,
    createdByName: entry.createdByName,
    note:
      entry.status === 'REJECTED'
        ? [entry.reason, entry.note].filter(Boolean).join(' — ') || null
        : entry.note,
    durationLabel:
      index === 0
        ? tr.crm.quotes.statusTab.firstRowDuration
        : formatStatusDuration(entries[index - 1].createdAt, entry.createdAt),
  }));
}

function QuoteStatusHistoryContent({ quote }: { quote: Quote }) {
  const historyQuery = useQuoteStatusHistoryQuery(quote.id);
  const entries = historyQuery.data ?? [];
  const rows = buildStatusHistoryRows(entries, quote);
  const isLegacy = !historyQuery.isPending && entries.length === 0;
  const [noteModalRow, setNoteModalRow] = useState<StatusHistoryRow | null>(null);

  const columns: TableColumn<StatusHistoryRow>[] = [
    {
      key: 'status',
      header: tr.crm.quotes.statusTab.statusColumn,
      className: 'w-40 whitespace-nowrap',
      render: (row) => (
        <span className={clsx('font-medium', STATUS_TEXT_CLASSES[row.status])}>
          {row.statusLabelOverride ?? tr.crm.quotes.statusOptions[row.status]}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: tr.crm.quotes.statusTab.dateColumn,
      className: 'w-44 whitespace-nowrap text-app-muted',
      render: (row) => dateTimeFormatter.format(new Date(row.createdAt)),
    },
    {
      key: 'createdByName',
      header: tr.crm.quotes.statusTab.actorColumn,
      className: 'w-40 whitespace-nowrap text-app-muted',
      render: (row) => row.createdByName ?? '—',
    },
    {
      key: 'duration',
      header: tr.crm.quotes.statusTab.durationColumn,
      className: 'w-60 whitespace-nowrap text-app-muted',
      render: (row) => row.durationLabel,
    },
    {
      key: 'note',
      header: tr.crm.quotes.statusTab.noteColumn,
      render: (row) => <TruncatedTextCell text={row.note} onOpen={() => setNoteModalRow(row)} />,
    },
  ];

  return (
    <div>
      <Table
        columns={columns}
        data={rows}
        keyField={(row) => row.id}
        isLoading={historyQuery.isPending}
        emptyMessage={tr.crm.quotes.statusTab.emptyState}
        fixedLayout
      />
      {isLegacy && (
        <p className="mt-3 text-sm text-app-muted">{tr.crm.quotes.statusTab.legacyNotice}</p>
      )}
      {noteModalRow && (
        <Modal title={tr.crm.quotes.statusTab.noteModalTitle} onClose={() => setNoteModalRow(null)}>
          <p className="whitespace-pre-wrap text-sm text-app-text">{noteModalRow.note}</p>
        </Modal>
      )}
    </div>
  );
}

/** /teklifler/:id "Stok Kontrolu" sekmesi: teklifteki her urun satiri + tenant'in
 * depo isimleri dinamik kolon olarak eklenmis sekilde o depodaki mevcut miktar. */
function QuoteStockCheckContent({
  quoteId,
  showCreatePurchaseOrderButton,
}: {
  quoteId: string;
  showCreatePurchaseOrderButton: boolean;
}) {
  const navigate = useNavigate();
  const stockCheckQuery = useQuoteStockCheckQuery(quoteId);
  const warehouses = stockCheckQuery.data?.warehouses ?? [];
  const items = stockCheckQuery.data?.items ?? [];
  const isShortage = (row: QuoteStockCheckRow) => row.quoteQuantity > row.totalStock;
  const sortedItems = [...items].sort((a, b) => Number(isShortage(b)) - Number(isShortage(a)));

  const columns: TableColumn<QuoteStockCheckRow>[] = [
    {
      key: 'product',
      header: tr.crm.quotes.stockTab.productColumn,
      className: 'break-words',
      render: (row) => row.productName,
    },
    {
      key: 'quantity',
      header: tr.crm.quotes.stockTab.quantityColumn,
      className: 'w-28 whitespace-nowrap text-right text-app-muted',
      render: (row) => quantityFormatter.format(row.quoteQuantity),
    },
    ...warehouses.map((warehouse): TableColumn<QuoteStockCheckRow> => ({
      key: `warehouse-${warehouse.id}`,
      header: warehouse.name,
      className: 'w-32 whitespace-nowrap text-right text-app-muted',
      render: (row) => quantityFormatter.format(row.stockByWarehouseId[warehouse.id] ?? 0),
    })),
    {
      key: 'totalStock',
      header: tr.crm.quotes.stockTab.totalColumn,
      className: 'w-28 whitespace-nowrap text-right font-semibold text-app-text',
      render: (row) => quantityFormatter.format(row.totalStock),
    },
  ];

  return (
    <div>
      {showCreatePurchaseOrderButton && (
        <div className="flex justify-end">
          <CircleIconButton
            icon={ShoppingCart}
            tooltip={tr.crm.quotes.createPurchaseOrderButton}
            onClick={() => navigate(`/siparisler/yeni?quoteId=${quoteId}`)}
          />
        </div>
      )}
      <Table
        columns={columns}
        data={sortedItems}
        keyField={(row) => row.productId}
        isLoading={stockCheckQuery.isPending}
        emptyMessage={tr.crm.quotes.stockTab.empty}
        rowClassName={(row) => (isShortage(row) ? 'bg-red-50' : undefined)}
        fixedLayout
      />
      {!stockCheckQuery.isPending && warehouses.length === 0 && (
        <p className="mt-3 text-sm text-app-muted">{tr.crm.quotes.stockTab.noWarehouses}</p>
      )}
    </div>
  );
}

export function QuoteDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const isPrintMode = searchParams.get('print') === '1';
  const activeTab = searchParams.get('tab') ?? 'overview';
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    'APPROVED' | 'REJECTED' | 'REJECTED_FEEDBACK' | undefined
  >(undefined);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isReviseConfirmOpen, setIsReviseConfirmOpen] = useState(false);
  const quoteQuery = useQuoteQuery(id);
  const meQuery = useMeQuery();
  const tenantProfileQuery = useTenantProfileQuery();
  // Sirket adresi/telefonu/e-postasi + gonderen bilgisi (bkz. docs/VARSAYIMLAR.md
  // "sirket bilgileri"/"gonderen" parite notu) - sadece yazdirma gorunumunde
  // gerekli, normal sayfa gorunumunde bu ek sorgu atilmaz.
  // Maliyet/Grafikler PDF export'u sirket/gonderen bilgisi kullanmiyor - sadece
  // Genel Bakis yazdirma gorunumunde bu ek sorgu atilir, aksi halde `enabled: false`
  // sorgusu sonsuza kadar isPending kalip asagidaki yukleme ekranini takilirdi.
  const needsPrintData = isPrintMode && activeTab !== 'cost' && activeTab !== 'charts';
  const printDataQuery = useQuery({
    queryKey: ['quotes', id, 'print-data'],
    queryFn: () => getQuotePrintData(id),
    enabled: needsPrintData && Boolean(id),
  });
  const approveMutation = useApproveQuoteMutation(id);
  const rejectMutation = useRejectQuoteMutation(id);
  const sendForApprovalMutation = useUpdateQuoteMutation(id);
  const reviseMutation = useUpdateQuoteMutation(id);
  const deleteMutation = useDeleteQuoteMutation();

  if (quoteQuery.isPending || (needsPrintData && printDataQuery.isPending)) {
    return (
      <AppShell
        print={isPrintMode}
        printLogoUrl={tenantProfileQuery.data?.logoUrl}
        hidePrintHeader={isPrintMode && activeTab !== 'cost' && activeTab !== 'charts'}
      >
        <p className="text-sm text-app-muted">{tr.common.loading}</p>
      </AppShell>
    );
  }

  if (!quoteQuery.data) {
    return null;
  }

  const quote = quoteQuery.data;
  // Backend'deki QUOTE_EXPORTABLE_STATUSES (exports.service.ts) ile ayni liste -
  // bu durumlarin disinda export ucu 409 QUOTE_NOT_READY doner. PDF butonu artik
  // blob fetch yerine dogrudan backend URL'ine yonlendirdigi icin (bkz. asagidaki
  // not) bu kontrol burada ON CE yapiliyor, aksi halde kullanici onay bekleyen bir
  // teklifte "PDF Goruntule"ye basinca yeni sekmede ham bir hata metni gorurdu.
  const canExportQuotePdf =
    quote.status === 'DRAFT' || quote.status === 'SENT' || quote.status === 'APPROVED';
  // Chrome'un PDF goruntuleyicisi blob: URL'lerde "kaydet" tiklaninca dosya adini
  // blob'un kendi rastgele UUID'sinden aliyor (PDF Title metadata'sini es geciyor,
  // denendi) - bu yuzden artik fetch+blob yerine dogrudan backend'in gercek GET
  // ucuna yonlendiriyoruz, Content-Disposition'daki dosya adi boylece korunuyor.
  function exportQuotePdfInNewTab(path: string) {
    if (!canExportQuotePdf) {
      toast.error(tr.crm.quotes.detail.exportPdfError);
      return;
    }
    openUrlInNewTab(`${API_BASE_URL}${path}`);
  }
  const canApprove = hasPermission(meQuery.data?.permissions, 'quotes', 'APPROVE');
  const canCreatePurchaseOrder = hasPermission(
    meQuery.data?.permissions,
    'purchase-orders',
    'CREATE',
  );

  function handleDelete() {
    deleteMutation.mutate(quote.id, {
      onSuccess: () => {
        toast.success(tr.crm.quotes.deleteSuccess);
        navigate('/teklifler');
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.crm.quotes.deleteError);
        setIsDeleteConfirmOpen(false);
      },
    });
  }

  function handleSendForApproval() {
    sendForApprovalMutation.mutate(
      { status: 'PENDING_APPROVAL' },
      {
        onSuccess: () => toast.success(tr.crm.quotes.detail.sendForApprovalSuccess),
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  }

  function handleConfirmApprove(warehouseId: string) {
    approveMutation.mutate(warehouseId, {
      onSuccess: () => {
        toast.success(tr.crm.quotes.detail.approveSuccess);
        setPendingAction(undefined);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  }

  function handleConfirmReject(reason: string, note?: string) {
    rejectMutation.mutate(
      { reason, note },
      {
        onSuccess: () => {
          toast.success(tr.crm.quotes.detail.rejectSuccess);
          setPendingAction(undefined);
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  }

  function handleConfirmRevise() {
    reviseMutation.mutate(
      { status: 'REVIZE' },
      {
        onSuccess: () => {
          toast.success(tr.crm.quotes.statusUpdateSuccess);
          setIsReviseConfirmOpen(false);
          navigate(`/teklifler/duzenle/${quote.id}`);
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  }

  return (
    <AppShell
      print={isPrintMode}
      printLogoUrl={tenantProfileQuery.data?.logoUrl}
      printTitle={tr.crm.quoteTemplatePrint.coverTitle}
      printMeta={
        isPrintMode && (activeTab === 'cost' || activeTab === 'charts') ? (
          <>
            <p>{dateFormatter.format(new Date(quote.quoteDate))}</p>
            <p># {quote.quoteNumber}</p>
          </>
        ) : undefined
      }
      hidePrintHeader={isPrintMode && activeTab !== 'cost' && activeTab !== 'charts'}
    >
      {!isPrintMode && <BackLink to={'/teklifler'} label={tr.crm.quotes.detail.back} />}

      <div
        className={clsx('flex flex-wrap items-start justify-between gap-4', !isPrintMode && 'mt-3')}
      >
        {!isPrintMode && (
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-app-muted uppercase">
              {tr.crm.quotes.detail.documentEyebrow}
            </span>
            <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
              <h1 className="text-4xl leading-tight font-bold text-app-text">
                {quote.quoteNumber}
              </h1>
              <PageHelp text={tr.help.quoteDetail} />
              <Badge variant={STATUS_BADGE_VARIANT[quote.status]}>
                {tr.crm.quotes.statusOptions[quote.status]}
              </Badge>
            </div>
            {quote.title && (
              <p className="mt-1.5 text-sm font-semibold text-app-text">{quote.title}</p>
            )}
            <p className="mt-1 text-sm text-app-muted">
              {quote.account.name}
              {quote.contact && ` · ${quote.contact.firstName} ${quote.contact.lastName}`}
            </p>
          </div>
        )}
        {!isPrintMode && activeTab === 'overview' && (
          <div className="flex items-center gap-2 pt-1">
            <CircleIconButton
              icon={Mail}
              tooltip={tr.crm.quotes.detail.createMessageTooltip}
              onClick={() => setIsMessageModalOpen(true)}
            />
            {(quote.status === 'DRAFT' ||
              quote.status === 'SENT' ||
              quote.status === 'PENDING_APPROVAL' ||
              quote.status === 'REVIZE' ||
              quote.status === 'UNSPECIFIED') && (
              <>
                <CircleIconButton
                  icon={Pencil}
                  tooltip={tr.crm.quotes.editTooltip}
                  onClick={() => navigate(`/teklifler/duzenle/${quote.id}`)}
                />
                <CircleIconButton
                  icon={Trash2}
                  tooltip={tr.crm.quotes.deleteTooltip}
                  variant="danger"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                />
              </>
            )}
            {(quote.status === 'DRAFT' ||
              quote.status === 'SENT' ||
              quote.status === 'PENDING_APPROVAL') && (
              <CircleIconButton
                icon={RotateCcw}
                tooltip={tr.crm.quotes.detail.reviseButton}
                onClick={() => setIsReviseConfirmOpen(true)}
                disabled={reviseMutation.isPending}
              />
            )}
            {quote.status === 'APPROVED' && canCreatePurchaseOrder && (
              <CircleIconButton
                icon={ShoppingCart}
                tooltip={tr.crm.quotes.createPurchaseOrderButton}
                onClick={() => navigate(`/siparisler/yeni?quoteId=${quote.id}`)}
              />
            )}
            {(quote.status === 'DRAFT' ||
              quote.status === 'SENT' ||
              quote.status === 'PENDING_APPROVAL' ||
              quote.status === 'APPROVED' ||
              quote.status === 'UNSPECIFIED') && (
              <CircleIconButton
                icon={FileDown}
                tooltip={tr.crm.quotes.detail.exportPdfButton}
                onClick={() => exportQuotePdfInNewTab(`/exports/quote/${quote.id}/pdf`)}
              />
            )}
            {quote.status === 'PENDING_APPROVAL' && canApprove && (
              <>
                <CircleIconButton
                  icon={Check}
                  variant="success"
                  tooltip={tr.crm.quotes.detail.approveButton}
                  onClick={() => setPendingAction('APPROVED')}
                  disabled={approveMutation.isPending}
                />
                <CircleIconButton
                  icon={X}
                  variant="danger"
                  tooltip={tr.crm.quotes.detail.rejectButton}
                  onClick={() => setPendingAction('REJECTED')}
                  disabled={rejectMutation.isPending}
                />
              </>
            )}
            {(quote.status === 'DRAFT' || quote.status === 'REVIZE') && (
              <CircleIconButton
                icon={Send}
                tooltip={tr.crm.quotes.detail.sendForApprovalButton}
                onClick={handleSendForApproval}
                disabled={sendForApprovalMutation.isPending}
              />
            )}
          </div>
        )}
        {!isPrintMode && activeTab === 'cost' && (
          <div className="flex items-center gap-2 pt-1">
            <CircleIconButton
              icon={FileDown}
              tooltip={tr.crm.quotes.costTab.exportPdfButton}
              onClick={() => exportQuotePdfInNewTab(`/exports/quote/${quote.id}/cost-pdf`)}
            />
          </div>
        )}
        {!isPrintMode && activeTab === 'charts' && (
          <div className="flex items-center gap-2 pt-1">
            <CircleIconButton
              icon={FileDown}
              tooltip={tr.crm.quotes.chartsTab.exportPdfButton}
              onClick={() => exportQuotePdfInNewTab(`/exports/quote/${quote.id}/charts-pdf`)}
            />
          </div>
        )}
      </div>

      {isPrintMode ? (
        <div className="mt-6">
          {activeTab === 'cost' && <QuoteCostContent quote={quote} />}
          {activeTab === 'charts' && <QuoteChartsContent quote={quote} />}
          {activeTab !== 'cost' && activeTab !== 'charts' && (
            <QuoteContentBody
              quote={quote}
              isPrintMode={isPrintMode}
              onOpportunityClick={(opportunityId) => navigate(`/firsatlar/${opportunityId}`)}
              onProjectClick={(projectNumber) => navigate(`/projeler/${projectNumber}`)}
              sender={printDataQuery.data?.sender}
            />
          )}
        </div>
      ) : (
        <div className="mt-6">
          <HorizontalTabPanel
            queryParam="tab"
            tabs={
              [
                {
                  key: 'overview',
                  label: tr.crm.quotes.tabs.overview,
                  content: (
                    <>
                      <QuoteContentBody
                        quote={quote}
                        isPrintMode={false}
                        onOpportunityClick={(opportunityId) =>
                          navigate(`/firsatlar/${opportunityId}`)
                        }
                        onProjectClick={(projectNumber) => navigate(`/projeler/${projectNumber}`)}
                      />

                      <QuoteDrawingsSection quoteId={quote.id} />

                      {(quote.status === 'DRAFT' || quote.status === 'REVIZE') && (
                        <div className="mt-8 flex justify-end gap-2 border-t border-app-border pt-6">
                          <CircleIconButton
                            icon={Send}
                            tooltip={tr.crm.quotes.detail.sendForApprovalButton}
                            onClick={handleSendForApproval}
                            disabled={sendForApprovalMutation.isPending}
                          />
                        </div>
                      )}

                      {quote.status === 'PENDING_APPROVAL' && canApprove && (
                        <div className="mt-8 flex justify-end gap-2 border-t border-app-border pt-6">
                          <CircleIconButton
                            icon={Check}
                            variant="success"
                            tooltip={tr.crm.quotes.detail.approveButton}
                            onClick={() => setPendingAction('APPROVED')}
                            disabled={approveMutation.isPending}
                          />
                          <CircleIconButton
                            icon={X}
                            variant="danger"
                            tooltip={tr.crm.quotes.detail.rejectButton}
                            onClick={() => setPendingAction('REJECTED')}
                            disabled={rejectMutation.isPending}
                          />
                        </div>
                      )}
                    </>
                  ),
                },
                {
                  key: 'cost',
                  label: tr.crm.quotes.tabs.cost,
                  content: <QuoteCostContent quote={quote} />,
                },
                {
                  key: 'charts',
                  label: tr.crm.quotes.tabs.charts,
                  content: <QuoteChartsContent quote={quote} />,
                },
                {
                  key: 'status',
                  label: tr.crm.quotes.tabs.status,
                  content: <QuoteStatusHistoryContent quote={quote} />,
                },
                {
                  key: 'stock',
                  label: tr.crm.quotes.tabs.stock,
                  content: (
                    <QuoteStockCheckContent
                      quoteId={quote.id}
                      showCreatePurchaseOrderButton={
                        quote.status === 'APPROVED' && canCreatePurchaseOrder
                      }
                    />
                  ),
                },
              ] satisfies HorizontalTabItem[]
            }
          />
        </div>
      )}

      {pendingAction === 'APPROVED' && (
        <ApproveQuoteModal
          isPending={approveMutation.isPending}
          onConfirm={handleConfirmApprove}
          onCancel={() => setPendingAction(undefined)}
        />
      )}

      {pendingAction === 'REJECTED' && (
        <ConfirmModal
          title={tr.crm.quotes.statusChangeConfirmTitle}
          message={tr.crm.quotes.statusChangeConfirm(tr.crm.quotes.statusOptions.REJECTED)}
          confirmLabel={tr.crm.quotes.statusChangeConfirmButton}
          isPending={false}
          onConfirm={() => setPendingAction('REJECTED_FEEDBACK')}
          onCancel={() => setPendingAction(undefined)}
        />
      )}

      {pendingAction === 'REJECTED_FEEDBACK' && (
        <RejectQuoteModal
          isPending={rejectMutation.isPending}
          onConfirm={handleConfirmReject}
          onCancel={() => setPendingAction(undefined)}
        />
      )}

      {isDeleteConfirmOpen && (
        <ConfirmModal
          title={tr.crm.quotes.deleteConfirmTitle}
          message={tr.crm.quotes.deleteConfirm}
          confirmLabel={tr.crm.quotes.deleteTooltip}
          isPending={deleteMutation.isPending}
          onConfirm={handleDelete}
          onCancel={() => setIsDeleteConfirmOpen(false)}
        />
      )}

      {isReviseConfirmOpen && (
        <ConfirmModal
          title={tr.crm.quotes.statusChangeConfirmTitle}
          message={tr.crm.quotes.reviseConfirmMessage}
          confirmLabel={tr.crm.quotes.statusChangeConfirmButton}
          isPending={reviseMutation.isPending}
          onConfirm={handleConfirmRevise}
          onCancel={() => setIsReviseConfirmOpen(false)}
        />
      )}

      {isMessageModalOpen && (
        <NewMessageModal
          onClose={() => setIsMessageModalOpen(false)}
          defaultToUserIds={quote.createdById ? [quote.createdById] : []}
          defaultRelatedEntity="QUOTE"
          defaultRelatedEntityId={id}
        />
      )}
    </AppShell>
  );
}
