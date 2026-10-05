import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { useEffect } from 'react';
import { Controller, useFieldArray, useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { AccountAutocomplete } from '../features/crm/account-autocomplete';
import { BackLink } from '../components/ui/back-link';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { IconActionButton } from '../components/ui/icon-action-button';
import { PageHelp } from '../components/ui/page-help';
import { Select } from '../components/ui/select';
import { Table, type TableColumn } from '../components/ui/table';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { ProductAutocomplete } from '../features/crm/product-autocomplete';
import { useProductListsQuery } from '../features/crm/use-product-lists';
import { useQuotesQuery } from '../features/crm/use-quotes';
import {
  usePurchaseOrderQuery,
  useUpdatePurchaseOrderMutation,
} from '../features/crm/use-purchase-orders';
import { purchaseOrderFormSchema, type PurchaseOrderFormValues } from '../features/crm/schemas';
import { ApiError, type PurchaseOrderStatus } from '../lib/api';
import { tr } from '../i18n/tr';

interface ItemRow {
  id: string;
  index: number;
}

const STATUS_BADGE_VARIANT: Record<PurchaseOrderStatus, 'success' | 'neutral'> = {
  DRAFT: 'neutral',
  CONFIRMED: 'success',
};

function decimalOnly(registration: UseFormRegisterReturn) {
  return {
    ...registration,
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      event.target.value = event.target.value.replace(/[^0-9.]/g, '');
      return registration.onChange(event);
    },
  };
}

export function PurchaseOrderEditPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const purchaseOrderQuery = usePurchaseOrderQuery(id);
  const updateMutation = useUpdatePurchaseOrderMutation(id);

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderFormSchema),
    defaultValues: { items: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const productListsQuery = useProductListsQuery({ pageSize: 100 });
  const productListOptions = (productListsQuery.data?.data ?? []).map((productList) => ({
    value: productList.id,
    label: productList.name,
  }));

  const selectedAccountId = watch('accountId');
  const quotesQuery = useQuotesQuery(
    { accountId: selectedAccountId, pageSize: 100 },
    { enabled: Boolean(selectedAccountId) },
  );
  const quoteOptions = (quotesQuery.data?.data ?? []).map((quote) => ({
    value: quote.id,
    label: quote.quoteNumber,
  }));

  useEffect(() => {
    if (purchaseOrderQuery.data) {
      reset({
        accountId: purchaseOrderQuery.data.quote?.accountId ?? undefined,
        quoteId: purchaseOrderQuery.data.quoteId ?? undefined,
        title: purchaseOrderQuery.data.title ?? undefined,
        items: purchaseOrderQuery.data.items.map((item) => ({
          id: item.id,
          productListId: item.product?.productListId ?? undefined,
          productId: item.productId ?? undefined,
          description: item.description,
          quantity: item.quantity,
          source: item.source,
        })),
      });
    }
  }, [purchaseOrderQuery.data, reset]);

  if (purchaseOrderQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-app-muted">{tr.common.loading}</p>
      </AppShell>
    );
  }

  if (!purchaseOrderQuery.data) {
    return null;
  }

  const purchaseOrder = purchaseOrderQuery.data;

  const itemRows: ItemRow[] = fields.map((field, index) => ({ id: field.id, index }));

  const itemColumns: TableColumn<ItemRow>[] = [
    {
      key: 'productList',
      header: tr.crm.purchaseOrders.detail.productListColumn,
      className: 'align-top min-w-[160px]',
      render: (row) => (
        <Controller
          control={control}
          name={`items.${row.index}.productListId` as const}
          render={({ field }) => (
            <Select
              label={tr.crm.purchaseOrders.detail.productListColumn}
              placeholder={tr.crm.purchaseOrders.detail.productListPlaceholder}
              options={productListOptions}
              clearable
              onClear={() => {
                field.onChange('');
                setValue(`items.${row.index}.productId` as const, undefined);
              }}
              value={field.value ?? ''}
              onChange={(event) => {
                field.onChange(event.target.value);
                setValue(`items.${row.index}.productId` as const, undefined);
              }}
            />
          )}
        />
      ),
    },
    {
      key: 'product',
      header: tr.crm.purchaseOrders.detail.productColumn,
      className: 'align-top min-w-[180px]',
      render: (row) => {
        const productListId = watch(`items.${row.index}.productListId` as const);
        return (
          <Controller
            control={control}
            name={`items.${row.index}.productId` as const}
            render={({ field }) => (
              <ProductAutocomplete
                label={tr.crm.purchaseOrders.detail.productColumn}
                placeholder={
                  productListId
                    ? tr.crm.purchaseOrders.detail.productPlaceholder
                    : tr.crm.purchaseOrders.detail.productDisabledPlaceholder
                }
                value={field.value}
                onChange={field.onChange}
                productListId={productListId || undefined}
                disabled={!productListId}
                clearable
              />
            )}
          />
        );
      },
    },
    {
      key: 'description',
      header: tr.crm.purchaseOrders.detail.descriptionColumn,
      className: 'align-top min-w-[180px]',
      render: (row) => (
        <TextField
          label={tr.crm.purchaseOrders.detail.descriptionLabel}
          error={errors.items?.[row.index]?.description?.message}
          {...register(`items.${row.index}.description` as const)}
        />
      ),
    },
    {
      key: 'quantity',
      header: tr.crm.purchaseOrders.detail.quantityColumn,
      className: 'align-top w-32',
      render: (row) => (
        <TextField
          type="text"
          inputMode="decimal"
          label={tr.crm.purchaseOrders.detail.quantityLabel}
          required
          error={errors.items?.[row.index]?.quantity?.message}
          {...decimalOnly(register(`items.${row.index}.quantity` as const))}
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'align-top w-px',
      render: (row) => (
        <IconActionButton
          icon={X}
          tooltip={tr.crm.purchaseOrders.detail.removeItem}
          variant="danger"
          onClick={() => remove(row.index)}
        />
      ),
    },
  ];

  const onSubmit = handleSubmit((values) => {
    updateMutation.mutate(
      {
        quoteId: values.quoteId || null,
        title: values.title || null,
        items: values.items.map((item) => ({
          id: item.id,
          productId: item.productId || undefined,
          description: item.description,
          quantity: Number(item.quantity),
          source: item.source,
        })),
      },
      {
        onSuccess: () => {
          toast.success(tr.crm.purchaseOrders.detail.saveSuccess);
          navigate(`/siparisler/${id}`);
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  });

  return (
    <AppShell>
      <BackLink to={'/siparisler'} label={tr.crm.purchaseOrders.detail.back} />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold text-app-text">{purchaseOrder.orderNumber}</h1>
        <PageHelp text={tr.help.purchaseOrderDetail} />
        <Badge variant={STATUS_BADGE_VARIANT[purchaseOrder.status]}>
          {tr.crm.purchaseOrders.statusOptions[purchaseOrder.status]}
        </Badge>
      </div>

      <form onSubmit={onSubmit} className="mt-6 border-t border-app-border p-6">
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <Controller
            name="accountId"
            control={control}
            render={({ field }) => (
              <AccountAutocomplete
                label={tr.crm.purchaseOrders.form.accountLabel}
                hint={tr.crm.purchaseOrders.form.accountHint}
                value={field.value}
                onChange={(accountId) => {
                  field.onChange(accountId);
                  setValue('quoteId', '');
                }}
                clearable
              />
            )}
          />
          <Controller
            name="quoteId"
            control={control}
            render={({ field }) => (
              <Select
                label={tr.crm.purchaseOrders.form.quoteLabel}
                placeholder={tr.crm.purchaseOrders.form.quotePlaceholder}
                hint={
                  selectedAccountId
                    ? tr.crm.purchaseOrders.form.quoteHint
                    : tr.crm.purchaseOrders.form.quoteNoAccountHint
                }
                options={quoteOptions}
                disabled={!selectedAccountId}
                clearable
                onClear={() => field.onChange('')}
                {...field}
              />
            )}
          />
        </div>

        <div className="mt-4">
          <TextField
            label={tr.crm.purchaseOrders.form.titleLabel}
            placeholder={tr.crm.purchaseOrders.form.titlePlaceholder}
            hint={tr.crm.purchaseOrders.form.titleHint}
            error={errors.title?.message}
            {...register('title')}
          />
        </div>

        <h2 className="mt-6 text-sm font-bold text-app-text">
          {tr.crm.purchaseOrders.detail.itemsTitle}
        </h2>
        <FormError message={errors.items?.message} />

        <div className="mt-3 flex flex-col gap-3">
          <Table
            columns={itemColumns}
            data={itemRows}
            keyField={(row) => row.id}
            emptyMessage={tr.crm.purchaseOrders.detail.itemsEmpty}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              append({
                description: '',
                quantity: '1',
                source: 'EXTRA',
                productId: undefined,
                productListId: undefined,
              })
            }
          >
            {tr.crm.purchaseOrders.detail.addExtraItem}
          </Button>
        </div>

        <div className="mt-4">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending
              ? tr.crm.purchaseOrders.detail.saving
              : tr.crm.purchaseOrders.detail.save}
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
