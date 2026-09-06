import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { Select } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { useAccountsQuery } from '../features/crm/use-accounts';
import { usePriceListsQuery } from '../features/crm/use-price-lists';
import { useProductsQuery } from '../features/crm/use-products';
import { useCreateQuoteMutation } from '../features/crm/use-quotes';
import { quoteFormSchema, type QuoteFormValues } from '../features/crm/schemas';
import { ApiError, type CreateQuoteInput, type OpportunityStage } from '../lib/api';
import { tr } from '../i18n/tr';

const STAGE_OPTIONS: { value: OpportunityStage; label: string }[] = (
  ['NEW', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'] as const
).map((stage) => ({ value: stage, label: tr.crm.opportunities.stageOptions[stage] }));

export function QuoteFormPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const accountsQuery = useAccountsQuery();
  const priceListsQuery = usePriceListsQuery();
  const productsQuery = useProductsQuery();
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
      items: [{ productId: '', quantity: '1', unitPrice: '', discountPct: '0', vatPct: '0' }],
      hasOpportunity: false,
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const hasOpportunity = watch('hasOpportunity');

  const productOptions = (productsQuery.data?.data ?? []).map((product) => ({
    value: product.id,
    label: product.name,
  }));

  const onSubmit = handleSubmit((values) => {
    const input: CreateQuoteInput = {
      accountId: values.accountId,
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

      <div className="mx-auto mt-6 max-w-3xl rounded-xl border border-app-border bg-app-surface p-8">
        <h1 className="text-lg font-bold text-app-text">{tr.crm.quotes.form.newTitle}</h1>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-6" noValidate>
          <FormError message={apiErrorMessage} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label={tr.crm.quotes.form.accountLabel}
              error={errors.accountId?.message}
              options={(accountsQuery.data?.data ?? []).map((account) => ({
                value: account.id,
                label: account.name,
              }))}
              {...register('accountId')}
            />
            <Select
              label={tr.crm.quotes.form.priceListLabel}
              error={errors.priceListId?.message}
              options={(priceListsQuery.data?.data ?? []).map((priceList) => ({
                value: priceList.id,
                label: priceList.name,
              }))}
              {...register('priceListId')}
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
                  className="grid grid-cols-2 gap-2 rounded-lg border border-app-border p-3 sm:grid-cols-5"
                >
                  <div className="col-span-2 sm:col-span-1">
                    <Select
                      label={tr.crm.quotes.form.productLabel}
                      options={productOptions}
                      error={errors.items?.[index]?.productId?.message}
                      {...register(`items.${index}.productId` as const)}
                    />
                  </div>
                  <TextField
                    type="number"
                    step="0.001"
                    label={tr.crm.quotes.form.quantityLabel}
                    error={errors.items?.[index]?.quantity?.message}
                    {...register(`items.${index}.quantity` as const)}
                  />
                  <TextField
                    type="number"
                    step="0.01"
                    label={tr.crm.quotes.form.unitPriceLabel}
                    {...register(`items.${index}.unitPrice` as const)}
                  />
                  <TextField
                    type="number"
                    step="0.01"
                    label={tr.crm.quotes.form.discountPctLabel}
                    {...register(`items.${index}.discountPct` as const)}
                  />
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <TextField
                        type="number"
                        step="0.01"
                        label={tr.crm.quotes.form.vatPctLabel}
                        {...register(`items.${index}.vatPct` as const)}
                      />
                    </div>
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
                  error={errors.opportunityName?.message}
                  {...register('opportunityName')}
                />
                <Select
                  label={tr.crm.quotes.form.opportunityStageLabel}
                  options={STAGE_OPTIONS}
                  {...register('opportunityStage')}
                />
                <TextField
                  type="number"
                  step="0.01"
                  label={tr.crm.quotes.form.opportunityValueLabel}
                  {...register('opportunityValue')}
                />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? tr.crm.quotes.form.submitting : tr.crm.quotes.form.submit}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/teklifler')}>
              {tr.crm.quotes.form.cancel}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
