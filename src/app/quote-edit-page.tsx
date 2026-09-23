import { Search, X } from 'lucide-react';
import { Fragment, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { Pagination } from '../components/ui/table';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { useProductsQuery } from '../features/crm/use-products';
import { useQuoteQuery, useUpdateQuoteMutation } from '../features/crm/use-quotes';
import { ApiError, type Product } from '../lib/api';
import { useDebouncedValue } from '../lib/use-debounced-value';
import { tr } from '../i18n/tr';

const currency = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' });
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
  discountPct: string;
  vatPct: string;
}

export function QuoteEditPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const quoteQuery = useQuoteQuery(id);
  const updateMutation = useUpdateQuoteMutation(id);

  // Teklifin urunleri her zaman tek bir urun listesine ait (create sirasinda secilen
  // katalog) - bu yuzden edit sayfasinda katalog secici yok, ilk kalemden turetilir.
  // Sorgu sonucu gelince state'i "render sirasinda" kurma deseni (React docs: Adjusting
  // state when props change) kullanilir - useEffect+setState yerine, gereksiz bir ekstra
  // render'i onlemek icin.
  const [items, setItems] = useState<EditableItem[] | null>(null);
  const [productListId, setProductListId] = useState<string | undefined>(undefined);
  const [initializedForQuoteId, setInitializedForQuoteId] = useState<string | null>(null);

  if (quoteQuery.data && quoteQuery.data.id !== initializedForQuoteId) {
    setInitializedForQuoteId(quoteQuery.data.id);
    setItems(
      quoteQuery.data.items.map((item) => ({
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPct: item.discountPct,
        vatPct: item.vatPct,
      })),
    );
    setProductListId(quoteQuery.data.items[0]?.product.productListId);
  }

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
  const [addVatPct, setAddVatPct] = useState('0');

  function handleToggleAdd(product: Product) {
    if (addingProductId === product.id) {
      setAddingProductId(null);
      return;
    }
    setAddingProductId(product.id);
    setAddQuantity('1');
    setAddUnitPrice(product.price ?? '');
    setAddDiscountPct('0');
    setAddVatPct('0');
  }

  function handleAddItem(product: Product) {
    setItems((prev) => [
      ...(prev ?? []),
      {
        productId: product.id,
        productName: product.name,
        quantity: addQuantity || '1',
        unitPrice: addUnitPrice,
        discountPct: addDiscountPct || '0',
        vatPct: addVatPct || '0',
      },
    ]);
    setAddingProductId(null);
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
    setItems((prev) =>
      (prev ?? []).map((item, i) =>
        i === index
          ? {
              ...item,
              quantity: editQuantity || '1',
              unitPrice: editUnitPrice,
              discountPct: editDiscountPct || '0',
              vatPct: editVatPct || '0',
            }
          : item,
      ),
    );
    setEditingIndex(null);
  }

  function handleRemoveItem(index: number) {
    setItems((prev) => (prev ?? []).filter((_, i) => i !== index));
    setEditingIndex(null);
  }

  const summaryRows = (items ?? []).map((item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    const discountPct = Number(item.discountPct) || 0;
    const vatPct = Number(item.vatPct) || 0;
    const lineSubtotal = quantity * unitPrice * (1 - discountPct / 100);
    const lineTotal = lineSubtotal * (1 + vatPct / 100);
    return {
      productName: item.productName,
      quantity,
      discountPct,
      vatPct,
      lineSubtotal,
      lineTotal,
    };
  });
  const summarySubtotal = summaryRows.reduce((sum, row) => sum + row.lineSubtotal, 0);
  const summaryGrandTotal = summaryRows.reduce((sum, row) => sum + row.lineTotal, 0);
  const summaryVatTotal = summaryGrandTotal - summarySubtotal;

  function handleSubmit() {
    if (!items || items.length === 0) {
      toast.error(tr.crm.quotes.edit.itemsRequired);
      return;
    }
    updateMutation.mutate(
      {
        items: items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitPrice: item.unitPrice ? Number(item.unitPrice) : undefined,
          discountPct: item.discountPct ? Number(item.discountPct) : 0,
          vatPct: item.vatPct ? Number(item.vatPct) : 0,
        })),
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
  const isEditable = quote.status === 'DRAFT' || quote.status === 'PENDING_APPROVAL';

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

  return (
    <AppShell>
      <BackLink to={`/teklifler/${quote.id}`} label={tr.crm.quotes.edit.back} />

      <div className="mt-6">
        <h1 className="text-lg font-bold text-app-text">
          {tr.crm.quotes.edit.title} — {quote.quoteNumber}
        </h1>

        <div className="mt-6 flex flex-col gap-6">
          <FormError message={apiErrorMessage} />

          <div className="grid grid-cols-1 gap-4 border-t border-app-border pt-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs font-semibold text-app-muted">
                {tr.crm.quotes.edit.accountLabel}
              </p>
              <p className="mt-1 text-sm font-semibold text-app-text">{quote.account.name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-app-muted">
                {tr.crm.quotes.edit.productListLabel}
              </p>
              <p className="mt-1 text-sm text-app-text">
                {quote.items[0]?.product.productList?.name ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-app-muted">
                {tr.crm.quotes.edit.contactLabel}
              </p>
              <p className="mt-1 text-sm text-app-text">
                {quote.contact
                  ? `${quote.contact.firstName} ${quote.contact.lastName}`
                  : tr.crm.quotes.edit.noContact}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-app-border bg-app-surface p-4">
              <span className="text-sm font-semibold text-app-text">
                {tr.crm.quotes.form.itemsSectionTitle}
              </span>

              <p className="mt-1 text-xs text-app-muted">{tr.crm.quotes.form.pickerHint}</p>

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
                  className="w-full rounded-lg border border-app-border bg-app-surface py-2.5 pr-3 pl-9 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
                />
              </div>

              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="text-xs font-semibold uppercase text-app-muted">
                    <tr>
                      <th className="py-2 pr-3">{tr.crm.quotes.form.pickerProductColumn}</th>
                      <th className="w-24 py-2 pr-3">{tr.crm.quotes.form.pickerUnitColumn}</th>
                      <th className="w-32 py-2 pr-3">{tr.crm.quotes.form.pickerPriceColumn}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pickerProducts.map((product) => (
                      <Fragment key={product.id}>
                        <tr
                          onClick={() => handleToggleAdd(product)}
                          className={`cursor-pointer border-t border-app-border hover:bg-blue-50 ${
                            addingProductId === product.id ? 'bg-blue-50' : ''
                          }`}
                        >
                          <td className="py-2 pr-3 font-semibold text-app-text">
                            {product.name}
                            {product.sku && (
                              <span className="ml-1.5 font-normal text-app-muted">
                                ({product.sku})
                              </span>
                            )}
                          </td>
                          <td className="py-2 pr-3 text-app-muted">{product.unit}</td>
                          <td className="py-2 pr-3 text-app-muted">
                            {product.price !== null
                              ? `${plainNumber.format(Number(product.price))} ${product.currency}`
                              : '—'}
                          </td>
                        </tr>
                        {addingProductId === product.id && (
                          <tr className="border-t border-app-border bg-app-bg">
                            <td colSpan={3} className="p-4">
                              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:items-end lg:grid-cols-5">
                                <TextField
                                  type="text"
                                  inputMode="decimal"
                                  label={tr.crm.quotes.form.quantityLabel}
                                  value={addQuantity}
                                  onChange={(event) =>
                                    setAddQuantity(sanitizeDecimalInput(event.target.value))
                                  }
                                />
                                <TextField
                                  type="text"
                                  inputMode="decimal"
                                  label={tr.crm.quotes.form.unitPriceLabel}
                                  value={addUnitPrice}
                                  onChange={(event) =>
                                    setAddUnitPrice(sanitizeDecimalInput(event.target.value))
                                  }
                                />
                                <TextField
                                  type="text"
                                  inputMode="decimal"
                                  label={tr.crm.quotes.form.discountPctLabel}
                                  value={addDiscountPct}
                                  onChange={(event) =>
                                    setAddDiscountPct(sanitizeDecimalInput(event.target.value))
                                  }
                                />
                                <TextField
                                  type="text"
                                  inputMode="decimal"
                                  label={tr.crm.quotes.form.vatPctLabel}
                                  value={addVatPct}
                                  onChange={(event) =>
                                    setAddVatPct(sanitizeDecimalInput(event.target.value))
                                  }
                                />
                                <div className="col-span-2 sm:col-span-4 lg:col-span-1">
                                  <Button
                                    type="button"
                                    className="w-full"
                                    onClick={() => handleAddItem(product)}
                                  >
                                    {tr.crm.quotes.form.addToQuote}
                                  </Button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

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

                {summaryRows.length === 0 ? (
                  <p className="text-xs text-app-muted">{tr.crm.quotes.form.summaryEmpty}</p>
                ) : (
                  <>
                    <p className="text-xs text-app-muted">{tr.crm.quotes.edit.editRowHint}</p>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[280px] text-left text-sm">
                        <thead className="text-xs font-semibold uppercase text-app-muted">
                          <tr>
                            <th className="py-2 pr-3">{tr.crm.quotes.form.pickerProductColumn}</th>
                            <th className="w-16 py-2 pr-3">{tr.crm.quotes.form.quantityLabel}</th>
                            <th className="w-24 py-2 pr-3">
                              {tr.crm.quotes.detail.lineTotalColumn}
                            </th>
                            <th className="w-8 py-2" aria-hidden="true" />
                          </tr>
                        </thead>
                        <tbody>
                          {summaryRows.map((row, index) => (
                            <Fragment key={`${items?.[index]?.productId ?? 'row'}-${index}`}>
                              <tr
                                onClick={() => handleToggleEditRow(index)}
                                className={`cursor-pointer border-t border-app-border hover:bg-blue-50 ${
                                  editingIndex === index ? 'bg-blue-50' : ''
                                }`}
                              >
                                <td className="py-2 pr-3 align-top">
                                  <div className="font-semibold text-app-text">
                                    {row.productName ?? tr.crm.quotes.form.summaryIncompleteRow}
                                  </div>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-app-muted">
                                    {row.discountPct > 0 && (
                                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold text-app-success">
                                        -%{row.discountPct}
                                      </span>
                                    )}
                                    {row.vatPct > 0 && (
                                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold text-app-danger">
                                        +KDV %{row.vatPct}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 pr-3 align-top text-app-muted">
                                  {row.quantity}
                                </td>
                                <td className="py-2 pr-3 align-top font-semibold whitespace-nowrap text-app-text">
                                  {currency.format(row.lineTotal)}
                                </td>
                                <td className="py-2 align-top">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleRemoveItem(index);
                                    }}
                                    aria-label={tr.crm.quotes.form.removeItem}
                                    className="rounded-lg p-1 text-app-muted hover:bg-app-danger/10 hover:text-app-danger"
                                  >
                                    <X size={14} />
                                  </button>
                                </td>
                              </tr>
                              {editingIndex === index && (
                                <tr className="border-t border-app-border bg-app-bg">
                                  <td colSpan={4} className="p-4">
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:items-end lg:grid-cols-5">
                                      <TextField
                                        type="text"
                                        inputMode="decimal"
                                        label={tr.crm.quotes.form.quantityLabel}
                                        value={editQuantity}
                                        onChange={(event) =>
                                          setEditQuantity(sanitizeDecimalInput(event.target.value))
                                        }
                                      />
                                      <TextField
                                        type="text"
                                        inputMode="decimal"
                                        label={tr.crm.quotes.form.unitPriceLabel}
                                        value={editUnitPrice}
                                        onChange={(event) =>
                                          setEditUnitPrice(sanitizeDecimalInput(event.target.value))
                                        }
                                      />
                                      <TextField
                                        type="text"
                                        inputMode="decimal"
                                        label={tr.crm.quotes.form.discountPctLabel}
                                        value={editDiscountPct}
                                        onChange={(event) =>
                                          setEditDiscountPct(
                                            sanitizeDecimalInput(event.target.value),
                                          )
                                        }
                                      />
                                      <TextField
                                        type="text"
                                        inputMode="decimal"
                                        label={tr.crm.quotes.form.vatPctLabel}
                                        value={editVatPct}
                                        onChange={(event) =>
                                          setEditVatPct(sanitizeDecimalInput(event.target.value))
                                        }
                                      />
                                      <div className="col-span-2 sm:col-span-4 lg:col-span-1">
                                        <Button
                                          type="button"
                                          className="w-full"
                                          onClick={() => handleSaveEditRow(index)}
                                        >
                                          {tr.crm.quotes.edit.saveRow}
                                        </Button>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                <div className="flex flex-col gap-1.5 border-t border-app-border pt-4 text-sm">
                  <div className="flex justify-between text-app-muted">
                    <span>{tr.crm.quotes.detail.subtotalLabel}</span>
                    <span>{currency.format(summarySubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-app-muted">
                    <span>{tr.crm.quotes.detail.vatTotalLabel}</span>
                    <span>{currency.format(summaryVatTotal)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-app-text">
                    <span>{tr.crm.quotes.detail.grandTotalLabel}</span>
                    <span>{currency.format(summaryGrandTotal)}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <Button type="button" disabled={updateMutation.isPending} onClick={handleSubmit}>
                    {updateMutation.isPending
                      ? tr.crm.quotes.edit.submitting
                      : tr.crm.quotes.edit.submit}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => navigate(`/teklifler/${quote.id}`)}
                  >
                    {tr.crm.quotes.edit.cancel}
                  </Button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
