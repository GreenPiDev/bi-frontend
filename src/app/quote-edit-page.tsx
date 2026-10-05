import { Search, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { IconActionButton } from '../components/ui/icon-action-button';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { Select } from '../components/ui/select';
import { TextareaField } from '../components/ui/textarea-field';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import {
  QuoteExchangeRatesSection,
  type QuoteExchangeRatesValue,
} from '../features/crm/quote-exchange-rates';
import { QuoteMetaFields } from '../features/crm/quote-meta-fields';
import { useContactsQuery } from '../features/crm/use-contacts';
import { useProductListsQuery } from '../features/crm/use-product-lists';
import { useProductsQuery } from '../features/crm/use-products';
import {
  useQuoteAssignableUsersQuery,
  useQuoteQuery,
  useUpdateQuoteMutation,
} from '../features/crm/use-quotes';
import { useTenantSettingsQuery } from '../features/crm/use-tenant-settings';
import {
  DEFAULT_QUOTE_VAT_PCT,
  DEFAULT_QUOTE_VAT_PCT_KEY,
} from '../features/crm/tenant-settings.constants';
import { ApiError, type Product } from '../lib/api';
import { useDebouncedValue } from '../lib/use-debounced-value';
import { computeLineTotal, formatCurrencyAmount, groupQuoteItemTotals } from '../lib/quote-totals';
import { tr } from '../i18n/tr';

const plainNumber = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const PICKER_PAGE_SIZE = 10;

/** Sayısal metin alanları icin: type="number" spinner oklarini kaldirmak amaciyla
 * type="text" kullanilir, bu yuzden rakam/nokta disindaki karakterler onChange'de
 * filtrelenir. */
function sanitizeDecimalInput(value: string): string {
  return value.replace(/[^0-9.]/g, '');
}

interface EditableItem {
  productId: string;
  productName: string;
  quantity: string;
  unitPrice: string;
  currency: string;
  discountPct: string;
  vatPct: string;
}

export function QuoteEditPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const quoteQuery = useQuoteQuery(id);
  const updateMutation = useUpdateQuoteMutation(id);
  const productListsQuery = useProductListsQuery();
  const contactsQuery = useContactsQuery();
  const assignableUsersQuery = useQuoteAssignableUsersQuery();
  const tenantSettingsQuery = useTenantSettingsQuery();
  const defaultVatPctSetting = tenantSettingsQuery.data?.find(
    (setting) => setting.key === DEFAULT_QUOTE_VAT_PCT_KEY,
  );
  const defaultVatPct = String(defaultVatPctSetting?.value ?? DEFAULT_QUOTE_VAT_PCT);

  // Kalemler baslangicta ilk kalemden turetilen urun listesiyle doldurulur, ama
  // kullanici (yeni teklif sayfasindaki gibi) baska bir urun listesine gecip oradan
  // da ekleme yapabilir - katalog degisince mevcut kalemler sifirlanmaz.
  // Sorgu sonucu gelince state'i "render sirasinda" kurma deseni (React docs: Adjusting
  // state when props change) kullanilir - useEffect+setState yerine, gereksiz bir ekstra
  // render'i onlemek icin.
  const [items, setItems] = useState<EditableItem[] | null>(null);
  const [productListId, setProductListId] = useState<string | undefined>(undefined);
  const [contactId, setContactId] = useState<string | undefined>(undefined);
  const [quoteDate, setQuoteDate] = useState('');
  const [title, setTitle] = useState('');
  const [leadTime, setLeadTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  // Quote, secilen IbanOption'i FK olarak degil 4 alanin snapshot'i olarak tasir
  // (bkz. QuotesService.resolveIbanSnapshot) - bu yuzden duzenlemede hangi tanimin
  // secili oldugu bilinmez, kullanici degistirmek isterse yeniden secer.
  const [ibanOptionId, setIbanOptionId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [senderId, setSenderId] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [salesTerms, setSalesTerms] = useState('');
  const [deliveryTerms, setDeliveryTerms] = useState('');
  const [generalTerms, setGeneralTerms] = useState('');
  const [quoteCurrency, setQuoteCurrency] = useState('TRY');
  const [exchangeRates, setExchangeRates] = useState<QuoteExchangeRatesValue>({ rates: {} });
  const [revisionNote, setRevisionNote] = useState('');
  const [revisionNoteTouched, setRevisionNoteTouched] = useState(false);
  const [initializedForQuoteId, setInitializedForQuoteId] = useState<string | null>(null);

  if (quoteQuery.data && quoteQuery.data.id !== initializedForQuoteId) {
    setInitializedForQuoteId(quoteQuery.data.id);
    setItems(
      quoteQuery.data.items.map((item) => ({
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        currency: item.currency,
        discountPct: item.discountPct,
        vatPct: item.vatPct,
      })),
    );
    setProductListId(quoteQuery.data.items[0]?.product.productListId);
    setContactId(quoteQuery.data.contactId ?? undefined);
    setQuoteDate(quoteQuery.data.quoteDate.slice(0, 10));
    setTitle(quoteQuery.data.title ?? '');
    setLeadTime(quoteQuery.data.leadTime ?? '');
    setPaymentMethod(quoteQuery.data.paymentMethod ?? '');
    setPaymentTerms(quoteQuery.data.paymentTerms ?? '');
    setSalesTerms(quoteQuery.data.salesTerms ?? '');
    setDeliveryTerms(quoteQuery.data.deliveryTerms ?? '');
    setGeneralTerms(quoteQuery.data.generalTerms ?? '');
    setTemplateId(quoteQuery.data.templateId ?? '');
    setSenderId(quoteQuery.data.senderId ?? '');
    setQuoteCurrency(quoteQuery.data.quoteCurrency);
    const savedRates = quoteQuery.data.exchangeRates;
    setExchangeRates({
      rates: Object.fromEntries(
        Object.entries(savedRates?.rates ?? {}).map(([currency, rate]) => [currency, String(rate)]),
      ),
      asOf: savedRates?.asOf,
    });
  }

  const contactOptions = (contactsQuery.data?.data ?? [])
    .filter((contact) => !quoteQuery.data || contact.accountId === quoteQuery.data.accountId)
    .map((contact) => ({
      value: contact.id,
      label: `${contact.firstName} ${contact.lastName}`,
    }));

  const senderOptions = (assignableUsersQuery.data ?? []).map((user) => ({
    value: user.id,
    label: user.name,
  }));

  const [pickerPage, setPickerPage] = useState(1);
  const [pickerQuery, setPickerQuery] = useState('');
  const debouncedPickerQuery = useDebouncedValue(pickerQuery.trim());
  const productsQuery = useProductsQuery(
    {
      page: pickerPage,
      pageSize: PICKER_PAGE_SIZE,
      q: debouncedPickerQuery || undefined,
      productListId,
    },
    { enabled: Boolean(productListId) },
  );
  const pickerProducts = productsQuery.data?.data ?? [];

  // Yeni urun ekleme paneli (picker tablosundaki satira tiklayinca acilir).
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [addQuantity, setAddQuantity] = useState('1');
  const [addUnitPrice, setAddUnitPrice] = useState('');
  const [addDiscountPct, setAddDiscountPct] = useState('0');
  const [addVatPct, setAddVatPct] = useState(defaultVatPct);

  function handleToggleAdd(product: Product) {
    if (addingProductId === product.id) {
      setAddingProductId(null);
      return;
    }
    setAddingProductId(product.id);
    setAddQuantity('1');
    setAddUnitPrice(product.price ?? '');
    setAddDiscountPct('0');
    setAddVatPct(defaultVatPct);
  }

  function handleAddItem(product: Product) {
    const quantity = Number(addQuantity);
    if (!addQuantity || Number.isNaN(quantity) || quantity <= 0) {
      toast.error(tr.crm.quotes.form.itemInvalidQuantity);
      return;
    }
    if (!addUnitPrice && !product.price) {
      toast.error(tr.crm.quotes.form.itemInvalidUnitPrice);
      return;
    }
    setItems((prev) => [
      ...(prev ?? []),
      {
        productId: product.id,
        productName: product.name,
        quantity: addQuantity,
        unitPrice: addUnitPrice,
        currency: product.currency,
        discountPct: addDiscountPct || '0',
        vatPct: addVatPct || '0',
      },
    ]);
    setAddingProductId(null);
    toast.success(tr.crm.quotes.form.itemAddSuccess);
  }

  // Ozet tablosundaki mevcut satirlara tiklayinca acilan duzenleme paneli - ayni
  // yeni-urun-ekleme panelinin deseni (bkz. quote-form-page.tsx).
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editQuantity, setEditQuantity] = useState('1');
  const [editUnitPrice, setEditUnitPrice] = useState('');
  const [editDiscountPct, setEditDiscountPct] = useState('0');
  const [editVatPct, setEditVatPct] = useState('0');

  function handleToggleEditRow(index: number) {
    if (editingIndex === index) {
      setEditingIndex(null);
      return;
    }
    const item = items?.[index];
    if (!item) return;
    setEditingIndex(index);
    setEditQuantity(item.quantity);
    setEditUnitPrice(item.unitPrice);
    setEditDiscountPct(item.discountPct);
    setEditVatPct(item.vatPct);
  }

  function handleSaveEditRow(index: number) {
    const item = items?.[index];
    if (!item) return;
    const quantity = Number(editQuantity);
    if (!editQuantity || Number.isNaN(quantity) || quantity <= 0) {
      toast.error(tr.crm.quotes.form.itemInvalidQuantity);
      return;
    }
    if (!editUnitPrice && !item.unitPrice) {
      toast.error(tr.crm.quotes.form.itemInvalidUnitPrice);
      return;
    }
    setItems((prev) =>
      (prev ?? []).map((it, i) =>
        i === index
          ? {
              ...it,
              quantity: editQuantity,
              unitPrice: editUnitPrice,
              discountPct: editDiscountPct || '0',
              vatPct: editVatPct || '0',
            }
          : it,
      ),
    );
    setEditingIndex(null);
    toast.success(tr.crm.quotes.form.itemUpdateSuccess);
  }

  function handleRemoveItem(index: number) {
    setItems((prev) => (prev ?? []).filter((_, i) => i !== index));
    setEditingIndex(null);
  }

  const summaryRows = (items ?? []).map((item, index) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    const discountPct = Number(item.discountPct) || 0;
    const vatPct = Number(item.vatPct) || 0;
    const { lineSubtotal, lineTotal } = computeLineTotal({
      quantity,
      unitPrice,
      discountPct,
      vatPct,
    });
    return {
      index,
      productId: item.productId,
      productName: item.productName,
      quantity,
      unitPrice,
      currency: item.currency,
      discountPct,
      vatPct,
      lineSubtotal,
      lineTotal,
    };
  });
  type SummaryRow = (typeof summaryRows)[number];
  const summaryTotalsByCurrency = groupQuoteItemTotals(summaryRows);

  function handleSubmit() {
    if (!items || items.length === 0) {
      toast.error(tr.crm.quotes.edit.itemsRequired);
      return;
    }
    const isRevisionMode = quoteQuery.data?.status === 'REVIZE';
    if (isRevisionMode && !revisionNote.trim()) {
      setRevisionNoteTouched(true);
      toast.error(tr.crm.quotes.edit.revisionNoteRequired);
      return;
    }
    updateMutation.mutate(
      {
        ...(isRevisionMode ? { revisionNote: revisionNote.trim() } : {}),
        items: items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitPrice: item.unitPrice ? Number(item.unitPrice) : undefined,
          discountPct: item.discountPct ? Number(item.discountPct) : 0,
          vatPct: item.vatPct ? Number(item.vatPct) : 0,
        })),
        contactId: contactId ?? null,
        quoteDate: quoteDate ? new Date(quoteDate).toISOString() : undefined,
        title: title || null,
        leadTime: leadTime || null,
        paymentMethod: paymentMethod || null,
        ibanOptionId: ibanOptionId || undefined,
        paymentTerms: paymentTerms || null,
        salesTerms: salesTerms || null,
        deliveryTerms: deliveryTerms || null,
        generalTerms: generalTerms || null,
        // Duzenlemede undefined "dokunma" anlamina gelir (bkz.
        // UpdateQuoteSchema) - bu yuzden burada daima acik deger gonderilir.
        templateId: templateId || null,
        senderId: senderId || undefined,
        quoteCurrency,
        exchangeRates:
          Object.keys(exchangeRates.rates).length > 0
            ? {
                asOf: exchangeRates.asOf,
                rates: Object.fromEntries(
                  Object.entries(exchangeRates.rates)
                    .filter(([, rate]) => rate)
                    .map(([currency, rate]) => [currency, Number(rate)]),
                ),
              }
            : undefined,
      },
      {
        onSuccess: (quote) => {
          toast.success(tr.crm.quotes.edit.updateSuccess);
          navigate(`/teklifler/${quote.id}`);
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  }

  if (quoteQuery.isPending) {
    return (
      <AppShell>
        <p className="mt-6 text-sm text-app-muted">{tr.common.loading}</p>
      </AppShell>
    );
  }

  if (!quoteQuery.data) {
    return null;
  }

  const quote = quoteQuery.data;
  const isRevisionMode = quote.status === 'REVIZE';
  const isEditable =
    quote.status === 'DRAFT' || quote.status === 'PENDING_APPROVAL' || quote.status === 'REVIZE';

  if (!isEditable) {
    return (
      <AppShell>
        <BackLink to={`/teklifler/${quote.id}`} label={tr.crm.quotes.edit.back} />
        <div className="mt-6 rounded-lg border border-app-border bg-app-surface p-6 text-center">
          <h1 className="text-lg font-bold text-app-text">{tr.crm.quotes.edit.notEditableTitle}</h1>
          <p className="mt-2 text-sm text-app-muted">{tr.crm.quotes.edit.notEditableMessage}</p>
        </div>
      </AppShell>
    );
  }

  const apiErrorMessage =
    updateMutation.error instanceof ApiError ? updateMutation.error.message : undefined;

  const pickerColumns: TableColumn<Product>[] = [
    {
      key: 'product',
      header: tr.crm.quotes.form.pickerProductColumn,
      render: (product) => (
        <>
          {product.name}
          {product.sku && (
            <span className="ml-1.5 font-normal text-app-muted">({product.sku})</span>
          )}
        </>
      ),
    },
    {
      key: 'unit',
      header: tr.crm.quotes.form.pickerUnitColumn,
      className: 'w-24 text-app-muted',
      render: (product) => product.unit,
    },
    {
      key: 'price',
      header: tr.crm.quotes.form.pickerPriceColumn,
      className: 'w-32 text-app-muted',
      render: (product) =>
        product.price !== null
          ? `${plainNumber.format(Number(product.price))} ${product.currency}`
          : '—',
    },
  ];

  function renderAddPanel(product: Product) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:items-end lg:grid-cols-5">
        <TextField
          type="text"
          inputMode="decimal"
          label={tr.crm.quotes.form.quantityLabel}
          value={addQuantity}
          onChange={(event) => setAddQuantity(sanitizeDecimalInput(event.target.value))}
        />
        <TextField
          type="text"
          inputMode="decimal"
          label={tr.crm.quotes.form.unitPriceLabel(product.currency)}
          value={addUnitPrice}
          onChange={(event) => setAddUnitPrice(sanitizeDecimalInput(event.target.value))}
        />
        <TextField
          type="text"
          inputMode="decimal"
          label={tr.crm.quotes.form.discountPctLabel}
          value={addDiscountPct}
          onChange={(event) => setAddDiscountPct(sanitizeDecimalInput(event.target.value))}
        />
        <TextField
          type="text"
          inputMode="decimal"
          label={tr.crm.quotes.form.vatPctLabel}
          value={addVatPct}
          onChange={(event) => setAddVatPct(sanitizeDecimalInput(event.target.value))}
        />
        <div className="col-span-2 sm:col-span-4 lg:col-span-1">
          <Button type="button" className="w-full" onClick={() => handleAddItem(product)}>
            {tr.crm.quotes.form.addToQuote}
          </Button>
        </div>
      </div>
    );
  }

  const summaryColumns: TableColumn<SummaryRow>[] = [
    {
      key: 'product',
      header: tr.crm.quotes.form.pickerProductColumn,
      className: 'align-top',
      render: (row) => (
        <div className="font-semibold text-app-text">
          {row.productName ?? tr.crm.quotes.form.summaryIncompleteRow}
        </div>
      ),
    },
    {
      key: 'quantity',
      header: tr.crm.quotes.form.quantityLabel,
      className: 'w-16 align-top text-app-muted',
      render: (row) => row.quantity,
    },
    {
      key: 'discountPct',
      header: tr.crm.quotes.detail.discountColumn,
      className: 'w-16 align-top font-semibold whitespace-nowrap text-app-success',
      render: (row) => (row.discountPct > 0 ? `-%${row.discountPct}` : ''),
    },
    {
      key: 'vatPct',
      header: tr.crm.quotes.detail.vatColumn,
      className: 'w-16 align-top font-semibold whitespace-nowrap text-app-danger',
      render: (row) => (row.vatPct > 0 ? `+%${row.vatPct}` : ''),
    },
    {
      key: 'lineTotal',
      header: tr.crm.quotes.detail.lineTotalColumn,
      className: 'w-24 align-top font-semibold whitespace-nowrap text-app-text',
      render: (row) => formatCurrencyAmount(row.lineTotal, row.currency),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-8 align-top',
      render: (row) => (
        <IconActionButton
          icon={X}
          tooltip={tr.crm.quotes.form.removeItem}
          variant="danger"
          onClick={() => handleRemoveItem(row.index)}
        />
      ),
    },
  ];

  function renderEditPanel() {
    const editingItemCurrency =
      editingIndex !== null ? (items?.[editingIndex]?.currency ?? 'TRY') : 'TRY';
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:items-end lg:grid-cols-5">
        <TextField
          type="text"
          inputMode="decimal"
          label={tr.crm.quotes.form.quantityLabel}
          value={editQuantity}
          onChange={(event) => setEditQuantity(sanitizeDecimalInput(event.target.value))}
        />
        <TextField
          type="text"
          inputMode="decimal"
          label={tr.crm.quotes.form.unitPriceLabel(editingItemCurrency)}
          value={editUnitPrice}
          onChange={(event) => setEditUnitPrice(sanitizeDecimalInput(event.target.value))}
        />
        <TextField
          type="text"
          inputMode="decimal"
          label={tr.crm.quotes.form.discountPctLabel}
          value={editDiscountPct}
          onChange={(event) => setEditDiscountPct(sanitizeDecimalInput(event.target.value))}
        />
        <TextField
          type="text"
          inputMode="decimal"
          label={tr.crm.quotes.form.vatPctLabel}
          value={editVatPct}
          onChange={(event) => setEditVatPct(sanitizeDecimalInput(event.target.value))}
        />
        <div className="col-span-2 sm:col-span-4 lg:col-span-1">
          <Button
            type="button"
            className="w-full"
            onClick={() => handleSaveEditRow(editingIndex as number)}
          >
            {tr.crm.quotes.edit.saveRow}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <BackLink to={`/teklifler/${quote.id}`} label={tr.crm.quotes.edit.back} />

      <div className="mt-6">
        <h1 className="text-lg font-bold text-app-text">
          {tr.crm.quotes.edit.title} — {quote.quoteNumber}
        </h1>

        <div className="mt-6 flex flex-col gap-6">
          <FormError message={apiErrorMessage} />

          <QuoteMetaFields
            accountSlot={
              <div>
                <p className="text-xs font-semibold text-app-muted">
                  {tr.crm.quotes.edit.accountLabel}
                </p>
                <p className="mt-1 text-sm font-semibold text-app-text">{quote.account.name}</p>
              </div>
            }
            contactOptions={contactOptions}
            senderOptions={senderOptions}
            values={{
              contactId: contactId ?? '',
              quoteDate,
              leadTime,
              paymentMethod,
              ibanOptionId,
              quoteCurrency,
              templateId,
              senderId,
            }}
            onChange={(field, value) => {
              if (field === 'contactId') {
                setContactId(value || undefined);
              } else if (field === 'quoteDate') {
                setQuoteDate(value);
              } else if (field === 'leadTime') {
                setLeadTime(value);
              } else if (field === 'paymentMethod') {
                setPaymentMethod(value);
              } else if (field === 'ibanOptionId') {
                setIbanOptionId(value);
              } else if (field === 'quoteCurrency') {
                setQuoteCurrency(value);
                // Kur input'lari currency koduyla anahtarlanir (hangi quoteCurrency'ye
                // gore hesaplandigi tutulmaz) - para birimi degisince eski degerler
                // yanlis referansa gore kalir, sifirlanip yeniden cekilmeli.
                setExchangeRates({ rates: {} });
              } else if (field === 'templateId') {
                setTemplateId(value);
              } else if (field === 'senderId') {
                setSenderId(value);
              }
            }}
            ibanCurrentInfo={
              quote.ibanNumber && quote.ibanBankName
                ? { bankName: quote.ibanBankName, ibanNumber: quote.ibanNumber }
                : null
            }
          />

          <TextField
            label={tr.crm.quotes.edit.titleLabel}
            placeholder={tr.crm.quotes.form.titlePlaceholder}
            hint={tr.crm.quotes.form.titleHint}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-app-border bg-app-surface p-4">
              <span className="text-sm font-semibold text-app-text">
                {tr.crm.quotes.form.itemsSectionTitle}
              </span>

              <div className="mt-3">
                <Select
                  label={tr.crm.quotes.edit.productListLabel}
                  placeholder={tr.crm.quotes.form.productListPlaceholder}
                  hint={tr.crm.quotes.form.productListHint}
                  options={(productListsQuery.data?.data ?? []).map((productList) => ({
                    value: productList.id,
                    label: productList.name,
                  }))}
                  value={productListId ?? ''}
                  onChange={(event) => {
                    setProductListId(event.target.value || undefined);
                    setPickerPage(1);
                    setPickerQuery('');
                    setAddingProductId(null);
                    setEditingIndex(null);
                  }}
                />
              </div>

              <p className="mt-3 text-xs text-app-muted">{tr.crm.quotes.form.pickerHint}</p>

              <div className="relative mt-3">
                <Search
                  size={16}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-app-muted"
                />
                <input
                  type="search"
                  value={pickerQuery}
                  onChange={(event) => {
                    setPickerPage(1);
                    setPickerQuery(event.target.value);
                  }}
                  placeholder={tr.crm.quotes.form.pickerSearchPlaceholder}
                  className="w-full rounded-lg border border-app-border bg-app-surface py-2.5 pr-3 pl-9 text-sm text-app-text outline-none focus:border-app-primary"
                />
              </div>

              <Table
                columns={pickerColumns}
                data={pickerProducts}
                keyField={(product) => product.id}
                onRowClick={handleToggleAdd}
                isRowExpanded={(product) => addingProductId === product.id}
                renderExpandedRow={(product) => renderAddPanel(product)}
                rowClassName={(product) =>
                  addingProductId === product.id ? 'bg-blue-50' : undefined
                }
              />

              {productsQuery.isPending && (
                <p className="mt-3 text-center text-sm text-app-muted">
                  {tr.crm.quotes.form.pickerLoading}
                </p>
              )}
              {!productsQuery.isPending && pickerProducts.length === 0 && (
                <p className="mt-3 text-center text-sm text-app-muted">
                  {tr.crm.quotes.form.pickerEmpty}
                </p>
              )}

              {productsQuery.data && pickerProducts.length > 0 && (
                <Pagination
                  page={productsQuery.data.meta.page}
                  totalPages={productsQuery.data.meta.totalPages}
                  total={productsQuery.data.meta.total}
                  onPageChange={setPickerPage}
                  onPrevious={() => setPickerPage((p) => p - 1)}
                  onNext={() => setPickerPage((p) => p + 1)}
                />
              )}
            </div>

            <aside className="lg:sticky lg:top-6 lg:self-start">
              <div className="flex flex-col gap-4 rounded-lg border border-app-border bg-app-surface p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-app-text">
                    {tr.crm.quotes.form.summaryTitle}
                  </h2>
                  <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold text-app-primary">
                    {tr.crm.quotes.form.summaryItemCount(summaryRows.length)}
                  </span>
                </div>

                <p className="text-xs text-app-muted">{tr.crm.quotes.form.summaryEditHint}</p>

                {summaryRows.length === 0 ? (
                  <p className="text-xs text-app-muted">{tr.crm.quotes.form.summaryEmpty}</p>
                ) : (
                  <Table
                    columns={summaryColumns}
                    data={summaryRows}
                    keyField={(row) => `${row.productId}-${row.index}`}
                    onRowClick={(row) => handleToggleEditRow(row.index)}
                    isRowExpanded={(row) => editingIndex === row.index}
                    renderExpandedRow={() => renderEditPanel()}
                    rowClassName={(row) => (editingIndex === row.index ? 'bg-blue-50' : undefined)}
                  />
                )}

                <div className="flex flex-wrap gap-4 border-t border-app-border pt-4 text-sm">
                  {summaryTotalsByCurrency.map((totals) => (
                    <div key={totals.currency} className="flex min-w-40 flex-1 flex-col gap-1.5">
                      {summaryTotalsByCurrency.length > 1 && (
                        <span className="text-xs font-semibold text-app-muted">
                          {totals.currency}
                        </span>
                      )}
                      <div className="flex justify-between text-app-muted">
                        <span>{tr.crm.quotes.detail.subtotalLabel}</span>
                        <span>{formatCurrencyAmount(totals.subtotal, totals.currency)}</span>
                      </div>
                      <div className="flex justify-between text-app-muted">
                        <span>{tr.crm.quotes.detail.vatTotalLabel}</span>
                        <span>{formatCurrencyAmount(totals.vatTotal, totals.currency)}</span>
                      </div>
                      <div className="flex justify-between text-base font-bold text-app-text">
                        <span>{tr.crm.quotes.detail.totalLabel}</span>
                        <span>{formatCurrencyAmount(totals.grandTotal, totals.currency)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <QuoteExchangeRatesSection
                  quoteCurrency={quoteCurrency}
                  totalsByCurrency={summaryTotalsByCurrency}
                  value={exchangeRates}
                  onChange={setExchangeRates}
                />
              </div>
            </aside>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <TextareaField
              label={tr.crm.quotes.edit.paymentTermsLabel}
              placeholder={tr.crm.quotes.form.paymentTermsPlaceholder}
              hint={tr.crm.quotes.form.paymentTermsHint}
              value={paymentTerms}
              onChange={(event) => setPaymentTerms(event.target.value)}
            />
            <TextareaField
              label={tr.crm.quotes.edit.salesTermsLabel}
              placeholder={tr.crm.quotes.form.salesTermsPlaceholder}
              hint={tr.crm.quotes.form.salesTermsHint}
              value={salesTerms}
              onChange={(event) => setSalesTerms(event.target.value)}
            />
            <TextareaField
              label={tr.crm.quotes.edit.deliveryTermsLabel}
              placeholder={tr.crm.quotes.form.deliveryTermsPlaceholder}
              hint={tr.crm.quotes.form.deliveryTermsHint}
              value={deliveryTerms}
              onChange={(event) => setDeliveryTerms(event.target.value)}
            />
            <TextareaField
              label={tr.crm.quotes.edit.generalTermsLabel}
              placeholder={tr.crm.quotes.form.generalTermsPlaceholder}
              hint={tr.crm.quotes.form.generalTermsHint}
              value={generalTerms}
              onChange={(event) => setGeneralTerms(event.target.value)}
            />
          </div>

          {isRevisionMode && (
            <TextareaField
              label={tr.crm.quotes.edit.revisionNoteLabel}
              required
              placeholder={tr.crm.quotes.edit.revisionNotePlaceholder}
              hint={tr.crm.quotes.edit.revisionNoteHint}
              value={revisionNote}
              onChange={(event) => setRevisionNote(event.target.value)}
              error={
                revisionNoteTouched && !revisionNote.trim()
                  ? tr.crm.quotes.edit.revisionNoteRequired
                  : undefined
              }
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Button type="button" disabled={updateMutation.isPending} onClick={handleSubmit}>
              {updateMutation.isPending ? tr.crm.quotes.edit.submitting : tr.crm.quotes.edit.submit}
            </Button>
            <Button
              type="button"
              variant="danger"
              className="border border-white"
              onClick={() => navigate(`/teklifler/${quote.id}`)}
            >
              {tr.crm.quotes.edit.cancel}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
