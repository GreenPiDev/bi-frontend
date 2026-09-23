import { zodResolver } from '@hookform/resolvers/zod';
import { Search, X } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { Pagination } from '../components/ui/table';
import { Select } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { useAccountsQuery } from '../features/crm/use-accounts';
import { useContactsQuery } from '../features/crm/use-contacts';
import { useProductListsQuery } from '../features/crm/use-product-lists';
import { useProductsQuery } from '../features/crm/use-products';
import { useCreateQuoteMutation } from '../features/crm/use-quotes';
import { quoteFormSchema, type QuoteFormValues } from '../features/crm/schemas';
import { ApiError, type CreateQuoteInput, type OpportunityStage, type Product } from '../lib/api';
import { useDebouncedValue } from '../lib/use-debounced-value';
import { tr } from '../i18n/tr';

const STAGE_OPTIONS: { value: OpportunityStage; label: string }[] = (
  ['NEW', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'] as const
).map((stage) => ({ value: stage, label: tr.crm.opportunities.stageOptions[stage] }));

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

export function QuoteFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillAccountId = searchParams.get('accountId') ?? undefined;
  const toast = useToast();
  const accountsQuery = useAccountsQuery();
  const contactsQuery = useContactsQuery();
  const productListsQuery = useProductListsQuery();
  const createMutation = useCreateQuoteMutation();

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      accountId: prefillAccountId,
      items: [],
      hasOpportunity: false,
    },
  });
  const { fields, append, remove, replace, update } = useFieldArray({ control, name: 'items' });
  const hasOpportunity = watch('hasOpportunity');
  const selectedAccountId = watch('accountId');
  const selectedProductListId = watch('productListId');
  const watchedItems = watch('items');

  // Ürün seçici: soldan arama + sayfalama ile backend'den paginated çekilir, tüm liste
  // frontende çekilip filtrelenmez. Seçilen ürün listesine göre filtrelenir.
  const [pickerPage, setPickerPage] = useState(1);
  const [pickerQuery, setPickerQuery] = useState('');
  const debouncedPickerQuery = useDebouncedValue(pickerQuery.trim());
  const productsQuery = useProductsQuery(
    {
      page: pickerPage,
      pageSize: PICKER_PAGE_SIZE,
      q: debouncedPickerQuery || undefined,
      productListId: selectedProductListId || undefined,
    },
    { enabled: Boolean(selectedProductListId) },
  );
  const pickerProducts = productsQuery.data?.data ?? [];

  // Sağdaki özet, arama/sayfalama boyunca görünürden çıkan ürünleri de doğru
  // gösterebilsin diye görülen her ürün burada biriktirilir (id -> Product).
  const [productCatalog, setProductCatalog] = useState<Record<string, Product>>({});
  useEffect(() => {
    const data = productsQuery.data?.data;
    if (!data || data.length === 0) return;
    setProductCatalog((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const product of data) {
        if (next[product.id] !== product) {
          next[product.id] = product;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [productsQuery.data]);
  const productNameById = new Map(
    Object.values(productCatalog).map((product) => [product.id, product.name]),
  );
  const productPriceById = new Map(
    Object.values(productCatalog)
      .filter((product) => product.price !== null)
      .map((product) => [product.id, Number(product.price)]),
  );

  // Ürün satırına tıklayınca altında açılan miktar/iskonto/KDV giriş paneli.
  const [entryProductId, setEntryProductId] = useState<string | null>(null);
  const [entryQuantity, setEntryQuantity] = useState('1');
  const [entryUnitPrice, setEntryUnitPrice] = useState('');
  const [entryDiscountPct, setEntryDiscountPct] = useState('0');
  const [entryVatPct, setEntryVatPct] = useState('0');

  function handleToggleEntry(product: Product) {
    if (entryProductId === product.id) {
      setEntryProductId(null);
      return;
    }
    setEntryProductId(product.id);
    setEntryQuantity('1');
    setEntryUnitPrice(product.price ?? '');
    setEntryDiscountPct('0');
    setEntryVatPct('0');
  }

  function handleAddEntry(product: Product) {
    append({
      productId: product.id,
      quantity: entryQuantity || '1',
      unitPrice: entryUnitPrice,
      discountPct: entryDiscountPct || '0',
      vatPct: entryVatPct || '0',
    });
    setEntryProductId(null);
  }

  // Teklif özeti tablosundaki mevcut satırlara tıklayınca açılan düzenleme paneli -
  // ürün ekleme panelindeki aynı miktar/fiyat/iskonto/KDV deseni (bkz. quote-edit-page.tsx).
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
    const item = watchedItems?.[index];
    if (!item) return;
    setEditingIndex(index);
    setEditQuantity(item.quantity);
    setEditUnitPrice(item.unitPrice ?? '');
    setEditDiscountPct(item.discountPct ?? '0');
    setEditVatPct(item.vatPct ?? '0');
  }

  function handleSaveEditRow(index: number) {
    const item = watchedItems?.[index];
    if (!item) return;
    update(index, {
      productId: item.productId,
      quantity: editQuantity || '1',
      unitPrice: editUnitPrice,
      discountPct: editDiscountPct || '0',
      vatPct: editVatPct || '0',
    });
    setEditingIndex(null);
  }

  const contactOptions = (contactsQuery.data?.data ?? [])
    .filter((contact) => !selectedAccountId || contact.accountId === selectedAccountId)
    .map((contact) => ({
      value: contact.id,
      label: `${contact.firstName} ${contact.lastName}`,
    }));

  const summaryRows = (watchedItems ?? []).map((item) => {
    const quantity = Number(item.quantity) || 0;
    const manualPrice = item.unitPrice ? Number(item.unitPrice) : undefined;
    const productPrice = productPriceById.get(item.productId);
    const unitPrice = manualPrice ?? productPrice ?? 0;
    const isDefaultPrice = manualPrice === undefined && productPrice !== undefined;
    const discountPct = Number(item.discountPct) || 0;
    const vatPct = Number(item.vatPct) || 0;
    const lineSubtotal = quantity * unitPrice * (1 - discountPct / 100);
    const lineTotal = lineSubtotal * (1 + vatPct / 100);
    return {
      productName: productNameById.get(item.productId),
      quantity,
      unitPrice,
      isDefaultPrice,
      discountPct,
      vatPct,
      lineSubtotal,
      lineTotal,
    };
  });
  const summarySubtotal = summaryRows.reduce((sum, row) => sum + row.lineSubtotal, 0);
  const summaryGrandTotal = summaryRows.reduce((sum, row) => sum + row.lineTotal, 0);
  const summaryVatTotal = summaryGrandTotal - summarySubtotal;

  const onSubmit = handleSubmit((values) => {
    const input: CreateQuoteInput = {
      accountId: values.accountId,
      contactId: values.contactId || undefined,
      items: values.items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        unitPrice: item.unitPrice ? Number(item.unitPrice) : undefined,
        discountPct: item.discountPct ? Number(item.discountPct) : 0,
        vatPct: item.vatPct ? Number(item.vatPct) : 0,
      })),
      ...(values.hasOpportunity && values.opportunityName
        ? {
            opportunity: {
              name: values.opportunityName,
              stage: values.opportunityStage,
              estimatedValue: values.opportunityValue ? Number(values.opportunityValue) : undefined,
            },
          }
        : {}),
    };

    createMutation.mutate(input, {
      onSuccess: (quote) => {
        toast.success(tr.crm.quotes.form.createSuccess);
        navigate(`/teklifler/${quote.id}`);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  });

  const apiErrorMessage =
    createMutation.error instanceof ApiError ? createMutation.error.message : undefined;

  return (
    <AppShell>
      <BackLink to={'/teklifler'} label={tr.crm.quotes.title} />

      <div className="mt-6">
        <h1 className="text-lg font-bold text-app-text">{tr.crm.quotes.form.newTitle}</h1>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-6">
          <FormError message={apiErrorMessage} />

          <div className="grid grid-cols-1 gap-4 border-t border-app-border pt-6 sm:grid-cols-2 lg:grid-cols-3">
            <Select
              label={tr.crm.quotes.form.accountLabel}
              required
              placeholder={tr.crm.quotes.form.accountPlaceholder}
              hint={tr.crm.quotes.form.accountHint}
              error={errors.accountId?.message}
              options={(accountsQuery.data?.data ?? []).map((account) => ({
                value: account.id,
                label: account.name,
              }))}
              {...register('accountId')}
            />
            <Select
              label={tr.crm.quotes.form.productListLabel}
              required
              placeholder={tr.crm.quotes.form.productListPlaceholder}
              hint={tr.crm.quotes.form.productListHint}
              error={errors.productListId?.message}
              options={(productListsQuery.data?.data ?? []).map((productList) => ({
                value: productList.id,
                label: productList.name,
              }))}
              {...register('productListId', {
                onChange: () => {
                  replace([]);
                  setPickerPage(1);
                  setPickerQuery('');
                  setEntryProductId(null);
                  setEditingIndex(null);
                },
              })}
            />
            <Select
              label={tr.crm.quotes.form.contactLabel}
              placeholder={tr.crm.quotes.form.contactPlaceholder}
              hint={tr.crm.quotes.form.contactHint}
              options={contactOptions}
              error={errors.contactId?.message}
              {...register('contactId')}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-app-border bg-app-surface p-4">
              <span className="text-sm font-semibold text-app-text">
                {tr.crm.quotes.form.itemsSectionTitle}
              </span>
              <FormError message={errors.items?.message} />

              {!selectedProductListId ? (
                <p className="mt-3 rounded-lg border border-dashed border-app-border p-4 text-center text-sm text-app-muted">
                  {tr.crm.quotes.form.pickerSelectProductListFirst}
                </p>
              ) : (
                <>
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
                              onClick={() => handleToggleEntry(product)}
                              className={`cursor-pointer border-t border-app-border hover:bg-blue-50 ${
                                entryProductId === product.id ? 'bg-blue-50' : ''
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
                            {entryProductId === product.id && (
                              <tr className="border-t border-app-border bg-app-bg">
                                <td colSpan={3} className="p-4">
                                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:items-end lg:grid-cols-5">
                                    <TextField
                                      type="text"
                                      inputMode="decimal"
                                      label={tr.crm.quotes.form.quantityLabel}
                                      value={entryQuantity}
                                      onChange={(event) =>
                                        setEntryQuantity(sanitizeDecimalInput(event.target.value))
                                      }
                                    />
                                    <TextField
                                      type="text"
                                      inputMode="decimal"
                                      label={tr.crm.quotes.form.unitPriceLabel}
                                      value={entryUnitPrice}
                                      onChange={(event) =>
                                        setEntryUnitPrice(sanitizeDecimalInput(event.target.value))
                                      }
                                    />
                                    <TextField
                                      type="text"
                                      inputMode="decimal"
                                      label={tr.crm.quotes.form.discountPctLabel}
                                      value={entryDiscountPct}
                                      onChange={(event) =>
                                        setEntryDiscountPct(
                                          sanitizeDecimalInput(event.target.value),
                                        )
                                      }
                                    />
                                    <TextField
                                      type="text"
                                      inputMode="decimal"
                                      label={tr.crm.quotes.form.vatPctLabel}
                                      value={entryVatPct}
                                      onChange={(event) =>
                                        setEntryVatPct(sanitizeDecimalInput(event.target.value))
                                      }
                                    />
                                    <div className="col-span-2 sm:col-span-4 lg:col-span-1">
                                      <Button
                                        type="button"
                                        className="w-full"
                                        onClick={() => handleAddEntry(product)}
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
                </>
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
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[280px] text-left text-sm">
                      <thead className="text-xs font-semibold uppercase text-app-muted">
                        <tr>
                          <th className="py-2 pr-3">{tr.crm.quotes.form.pickerProductColumn}</th>
                          <th className="w-16 py-2 pr-3">{tr.crm.quotes.form.quantityLabel}</th>
                          <th className="w-16 py-2 pr-3">{tr.crm.quotes.detail.discountColumn}</th>
                          <th className="w-16 py-2 pr-3">{tr.crm.quotes.detail.vatColumn}</th>
                          <th className="w-24 py-2 pr-3">{tr.crm.quotes.detail.lineTotalColumn}</th>
                          <th className="w-8 py-2" aria-hidden="true" />
                        </tr>
                      </thead>
                      <tbody>
                        {summaryRows.map((row, index) => (
                          <Fragment key={fields[index]?.id ?? index}>
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
                                {row.isDefaultPrice && (
                                  <Badge variant="neutral" className="mt-0.5">
                                    {tr.crm.quotes.form.summaryPriceFromList}
                                  </Badge>
                                )}
                              </td>
                              <td className="py-2 pr-3 align-top text-app-muted">{row.quantity}</td>
                              <td className="py-2 pr-3 align-top text-app-muted">
                                {row.discountPct > 0 ? `%${row.discountPct}` : ''}
                              </td>
                              <td className="py-2 pr-3 align-top text-app-muted">
                                {row.vatPct > 0 ? `%${row.vatPct}` : ''}
                              </td>
                              <td className="py-2 pr-3 align-top font-semibold whitespace-nowrap text-app-text">
                                {currency.format(row.lineTotal)}
                              </td>
                              <td className="py-2 align-top">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    remove(index);
                                    if (editingIndex === index) setEditingIndex(null);
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
                                <td colSpan={6} className="p-4">
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
                                        setEditDiscountPct(sanitizeDecimalInput(event.target.value))
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
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending
                      ? tr.crm.quotes.form.submitting
                      : tr.crm.quotes.form.submit}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => navigate('/teklifler')}>
                    {tr.crm.quotes.form.cancel}
                  </Button>
                </div>
              </div>
            </aside>
          </div>

          <div className="rounded-lg border border-app-border bg-app-surface p-4">
            <Controller
              name="hasOpportunity"
              control={control}
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Switch checked={field.value ?? false} onChange={field.onChange} />
                  <span className="text-sm font-semibold text-app-text">
                    {tr.crm.quotes.form.opportunityCheckboxLabel}
                  </span>
                </div>
              )}
            />
            {hasOpportunity && (
              <div className="mt-4 flex flex-col gap-4">
                <TextField
                  label={tr.crm.quotes.form.opportunityNameLabel}
                  required
                  hint={tr.crm.quotes.form.opportunityNameHint}
                  error={errors.opportunityName?.message}
                  {...register('opportunityName')}
                />
                <Select
                  label={tr.crm.quotes.form.opportunityStageLabel}
                  hint={tr.crm.quotes.form.opportunityStageHint}
                  options={STAGE_OPTIONS}
                  error={errors.opportunityStage?.message}
                  {...register('opportunityStage')}
                />
                <TextField
                  type="number"
                  step="0.01"
                  label={tr.crm.quotes.form.opportunityValueLabel}
                  hint={tr.crm.quotes.form.opportunityValueHint}
                  error={errors.opportunityValue?.message}
                  {...register('opportunityValue')}
                />
              </div>
            )}
          </div>
        </form>
      </div>
    </AppShell>
  );
}
