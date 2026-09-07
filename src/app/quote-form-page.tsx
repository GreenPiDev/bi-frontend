import { zodResolver } from '@hookform/resolvers/zod';
import type { ChangeEvent } from 'react';
import { Controller, useFieldArray, useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { Select } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { useAccountsQuery } from '../features/crm/use-accounts';
import { useContactsQuery } from '../features/crm/use-contacts';
import { usePriceListsQuery } from '../features/crm/use-price-lists';
import { useProductsQuery } from '../features/crm/use-products';
import { useCreateQuoteMutation } from '../features/crm/use-quotes';
import { quoteFormSchema, type QuoteFormValues } from '../features/crm/schemas';
import { ApiError, type CreateQuoteInput, type OpportunityStage } from '../lib/api';
import { tr } from '../i18n/tr';

const STAGE_OPTIONS: { value: OpportunityStage; label: string }[] = (
  ['NEW', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'] as const
).map((stage) => ({ value: stage, label: tr.crm.opportunities.stageOptions[stage] }));

const currency = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' });

/** Sayısal metin alanları icin: type="number" spinner oklarini kaldirmak amaciyla
 * type="text" kullanilir, bu yuzden rakam/nokta disindaki karakterler onChange'de
 * filtrelenir. */
function decimalOnly(registration: UseFormRegisterReturn) {
  return {
    ...registration,
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      event.target.value = event.target.value.replace(/[^0-9.]/g, '');
      return registration.onChange(event);
    },
  };
}

export function QuoteFormPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const accountsQuery = useAccountsQuery();
  const contactsQuery = useContactsQuery();
  const priceListsQuery = usePriceListsQuery();
  const productsQuery = useProductsQuery();
  const createMutation = useCreateQuoteMutation();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      items: [{ productId: '', quantity: '1', unitPrice: '', discountPct: '0', vatPct: '0' }],
      hasOpportunity: false,
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const hasOpportunity = watch('hasOpportunity');
  const selectedAccountId = watch('accountId');
  const selectedPriceListId = watch('priceListId');
  const watchedItems = watch('items');

  const products = productsQuery.data?.data ?? [];
  const productOptions = products.map((product) => ({ value: product.id, label: product.name }));
  const productNameById = new Map(products.map((product) => [product.id, product.name]));

  const selectedPriceList = (priceListsQuery.data?.data ?? []).find(
    (priceList) => priceList.id === selectedPriceListId,
  );
  const priceListUnitPriceByProductId = new Map(
    (selectedPriceList?.items ?? []).map((item) => [item.productId, Number(item.unitPrice)]),
  );

  const contactOptions = (contactsQuery.data?.data ?? [])
    .filter((contact) => !selectedAccountId || contact.accountId === selectedAccountId)
    .map((contact) => ({
      value: contact.id,
      label: `${contact.firstName} ${contact.lastName}`,
    }));

  const summaryRows = (watchedItems ?? []).map((item) => {
    const quantity = Number(item.quantity) || 0;
    const manualPrice = item.unitPrice ? Number(item.unitPrice) : undefined;
    const listPrice = priceListUnitPriceByProductId.get(item.productId);
    const unitPrice = manualPrice ?? listPrice ?? 0;
    const isFromPriceList = manualPrice === undefined && listPrice !== undefined;
    const discountPct = Number(item.discountPct) || 0;
    const vatPct = Number(item.vatPct) || 0;
    const lineSubtotal = quantity * unitPrice * (1 - discountPct / 100);
    const lineTotal = lineSubtotal * (1 + vatPct / 100);
    return {
      productName: productNameById.get(item.productId),
      quantity,
      unitPrice,
      isFromPriceList,
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
      priceListId: values.priceListId,
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
      <button
        type="button"
        onClick={() => navigate('/teklifler')}
        className="text-sm font-semibold text-app-muted hover:text-app-text"
      >
        {'←'} {tr.crm.quotes.title}
      </button>

      <div className="mt-6">
        <h1 className="text-lg font-bold text-app-text">{tr.crm.quotes.form.newTitle}</h1>

        <form onSubmit={onSubmit} className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
          <div className="flex flex-col gap-6 rounded-xl border border-app-border bg-app-surface p-8">
            <FormError message={apiErrorMessage} />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Select
                label={tr.crm.quotes.form.accountLabel}
                required
                hint={tr.crm.quotes.form.accountHint}
                error={errors.accountId?.message}
                options={(accountsQuery.data?.data ?? []).map((account) => ({
                  value: account.id,
                  label: account.name,
                }))}
                {...register('accountId')}
              />
              <Select
                label={tr.crm.quotes.form.priceListLabel}
                required
                hint={tr.crm.quotes.form.priceListHint}
                error={errors.priceListId?.message}
                options={(priceListsQuery.data?.data ?? []).map((priceList) => ({
                  value: priceList.id,
                  label: priceList.name,
                }))}
                {...register('priceListId')}
              />
              <Select
                label={tr.crm.quotes.form.contactLabel}
                placeholder={tr.crm.quotes.form.contactPlaceholder}
                hint={tr.crm.quotes.form.contactHint}
                options={contactOptions}
                {...register('contactId')}
              />
            </div>

            <div className="rounded-lg border border-app-border p-4">
              <span className="text-sm font-semibold text-app-text">
                {tr.crm.quotes.form.itemsSectionTitle}
              </span>
              <FormError message={errors.items?.message} />
              <div className="mt-3 flex flex-col gap-3">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex flex-wrap items-start gap-3 rounded-lg border border-app-border p-3"
                  >
                    <div className="w-full min-w-[180px] flex-1 sm:w-auto">
                      <Select
                        label={tr.crm.quotes.form.productLabel}
                        required
                        options={productOptions}
                        error={errors.items?.[index]?.productId?.message}
                        {...register(`items.${index}.productId` as const, {
                          onChange: (event: ChangeEvent<HTMLSelectElement>) => {
                            const listPrice = priceListUnitPriceByProductId.get(event.target.value);
                            setValue(
                              `items.${index}.unitPrice`,
                              listPrice !== undefined ? String(listPrice) : '',
                            );
                          },
                        })}
                      />
                    </div>
                    <div className="w-24">
                      <TextField
                        type="text"
                        inputMode="decimal"
                        label={tr.crm.quotes.form.quantityLabel}
                        required
                        error={errors.items?.[index]?.quantity?.message}
                        {...decimalOnly(register(`items.${index}.quantity` as const))}
                      />
                    </div>
                    <div className="w-32">
                      <TextField
                        type="text"
                        inputMode="decimal"
                        label={tr.crm.quotes.form.unitPriceLabel}
                        hint={tr.crm.quotes.form.unitPriceHint}
                        {...decimalOnly(register(`items.${index}.unitPrice` as const))}
                      />
                    </div>
                    <div className="w-24">
                      <TextField
                        type="text"
                        inputMode="decimal"
                        label={tr.crm.quotes.form.discountPctLabel}
                        {...decimalOnly(register(`items.${index}.discountPct` as const))}
                      />
                    </div>
                    <div className="w-24">
                      <TextField
                        type="text"
                        inputMode="decimal"
                        label={tr.crm.quotes.form.vatPctLabel}
                        {...decimalOnly(register(`items.${index}.vatPct` as const))}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span
                        className="select-none text-sm font-semibold text-transparent"
                        aria-hidden="true"
                      >
                        &nbsp;
                      </span>
                      <Button type="button" variant="secondary" onClick={() => remove(index)}>
                        {tr.crm.quotes.form.removeItem}
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    append({
                      productId: '',
                      quantity: '1',
                      unitPrice: '',
                      discountPct: '0',
                      vatPct: '0',
                    })
                  }
                >
                  {tr.crm.quotes.form.addItem}
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-app-border p-4">
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
                    {...register('opportunityStage')}
                  />
                  <TextField
                    type="number"
                    step="0.01"
                    label={tr.crm.quotes.form.opportunityValueLabel}
                    hint={tr.crm.quotes.form.opportunityValueHint}
                    {...register('opportunityValue')}
                  />
                </div>
              )}
            </div>
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="flex flex-col gap-4 rounded-xl border border-app-border bg-app-surface p-6">
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
                <ul className="flex flex-col gap-3">
                  {summaryRows.map((row, index) => (
                    <li
                      key={fields[index]?.id ?? index}
                      className="flex flex-col gap-1 border-b border-app-border pb-3 last:border-b-0 last:pb-0"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-app-text">
                          {row.productName ?? tr.crm.quotes.form.summaryIncompleteRow}
                        </span>
                        <span className="whitespace-nowrap text-sm font-semibold text-app-text">
                          {currency.format(row.lineTotal)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-app-muted">
                        <span>
                          {row.quantity} × {currency.format(row.unitPrice)}
                        </span>
                        {row.isFromPriceList && (
                          <Badge variant="neutral">{tr.crm.quotes.form.summaryPriceFromList}</Badge>
                        )}
                        {row.discountPct > 0 && (
                          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold text-app-success">
                            -%{row.discountPct}
                          </span>
                        )}
                        {row.vatPct > 0 && (
                          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold text-app-danger">
                            +KDV %{row.vatPct}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
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
        </form>
      </div>
    </AppShell>
  );
}
