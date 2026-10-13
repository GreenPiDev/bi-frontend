import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { Controller, useFieldArray, useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { AccountAutocomplete } from '../features/crm/account-autocomplete';
import { BackLink } from '../components/ui/back-link';
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
import { useCreateSalesOrderMutation } from '../features/crm/use-sales-orders';
import {
  salesOrderCreateFormSchema,
  type SalesOrderCreateFormValues,
} from '../features/crm/schemas';
import { ApiError } from '../lib/api';
import { tr } from '../i18n/tr';

interface ItemRow {
  id: string;
  index: number;
}

function decimalOnly(registration: UseFormRegisterReturn) {
  return {
    ...registration,
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      event.target.value = event.target.value.replace(/[^0-9.]/g, '');
      return registration.onChange(event);
    },
  };
}

export function SalesOrderCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const createMutation = useCreateSalesOrderMutation();

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SalesOrderCreateFormValues>({
    resolver: zodResolver(salesOrderCreateFormSchema),
    defaultValues: {
      accountId: '',
      items: [{ productListId: undefined, productId: '', quantity: '1', unitPrice: '' }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const productListsQuery = useProductListsQuery({ pageSize: 100 });
  const productListOptions = (productListsQuery.data?.data ?? []).map((productList) => ({
    value: productList.id,
    label: productList.name,
  }));

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
                setValue(`items.${row.index}.productId` as const, '');
              }}
              value={field.value ?? ''}
              onChange={(event) => {
                field.onChange(event.target.value);
                setValue(`items.${row.index}.productId` as const, '');
              }}
            />
          )}
        />
      ),
    },
    {
      key: 'product',
      header: tr.crm.salesOrders.detail.productColumn,
      className: 'align-top min-w-[220px]',
      render: (row) => {
        const productListId = watch(`items.${row.index}.productListId` as const);
        return (
          <Controller
            control={control}
            name={`items.${row.index}.productId` as const}
            render={({ field }) => (
              <ProductAutocomplete
                label={tr.crm.salesOrders.detail.productColumn}
                placeholder={
                  productListId
                    ? tr.crm.purchaseOrders.detail.productPlaceholder
                    : tr.crm.purchaseOrders.detail.productDisabledPlaceholder
                }
                error={errors.items?.[row.index]?.productId?.message}
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
      key: 'quantity',
      header: tr.crm.salesOrders.detail.quantityColumn,
      className: 'align-top w-32',
      render: (row) => (
        <TextField
          type="text"
          inputMode="decimal"
          label={tr.crm.salesOrders.detail.quantityColumn}
          required
          error={errors.items?.[row.index]?.quantity?.message}
          {...decimalOnly(register(`items.${row.index}.quantity` as const))}
        />
      ),
    },
    {
      key: 'unitPrice',
      header: tr.crm.salesOrders.detail.unitPriceColumn,
      className: 'align-top w-36',
      render: (row) => (
        <TextField
          type="text"
          inputMode="decimal"
          label={tr.crm.salesOrders.detail.unitPriceColumn}
          required
          error={errors.items?.[row.index]?.unitPrice?.message}
          {...decimalOnly(register(`items.${row.index}.unitPrice` as const))}
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
    createMutation.mutate(
      {
        accountId: values.accountId,
        items: values.items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      },
      {
        onSuccess: (salesOrder) => {
          toast.success(tr.crm.salesOrders.form.createSuccess);
          navigate(`/satis-siparisleri/${salesOrder.id}`);
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  });

  const apiErrorMessage =
    createMutation.error instanceof ApiError ? createMutation.error.message : undefined;

  return (
    <AppShell>
      <BackLink to="/siparisler?tab=salesOrders" label={tr.crm.salesOrders.detail.back} />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold text-app-text">{tr.crm.salesOrders.form.newTitle}</h1>
        <PageHelp text={tr.help.salesOrderCreate} />
      </div>

      <form onSubmit={onSubmit} className="mt-6 border-t border-app-border p-6" noValidate>
        <FormError message={apiErrorMessage} />

        <Controller
          name="accountId"
          control={control}
          render={({ field }) => (
            <AccountAutocomplete
              label={tr.crm.salesOrders.form.accountLabel}
              error={errors.accountId?.message}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />

        <h2 className="mt-6 text-sm font-bold text-app-text">
          {tr.crm.salesOrders.detail.itemsTitle}
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
              append({ productListId: undefined, productId: '', quantity: '1', unitPrice: '' })
            }
          >
            {tr.crm.purchaseOrders.detail.addExtraItem}
          </Button>
        </div>

        <div className="mt-6">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending
              ? tr.crm.salesOrders.form.creating
              : tr.crm.salesOrders.form.create}
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
