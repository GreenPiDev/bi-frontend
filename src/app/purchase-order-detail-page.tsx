import { zodResolver } from '@hookform/resolvers/zod';
import type { ChangeEvent } from 'react';
import { useEffect } from 'react';
import { useFieldArray, useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { Select } from '../components/ui/select';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { useProductsQuery } from '../features/crm/use-products';
import {
  useDeletePurchaseOrderMutation,
  usePurchaseOrderQuery,
  useUpdatePurchaseOrderMutation,
} from '../features/crm/use-purchase-orders';
import { purchaseOrderFormSchema, type PurchaseOrderFormValues } from '../features/crm/schemas';
import { ApiError, type PurchaseOrderStatus } from '../lib/api';
import { tr } from '../i18n/tr';

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

export function PurchaseOrderDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const purchaseOrderQuery = usePurchaseOrderQuery(id);
  const productsQuery = useProductsQuery();
  const updateMutation = useUpdatePurchaseOrderMutation(id);
  const deleteMutation = useDeletePurchaseOrderMutation();

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderFormSchema),
    defaultValues: { items: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  useEffect(() => {
    if (purchaseOrderQuery.data) {
      reset({
        items: purchaseOrderQuery.data.items.map((item) => ({
          id: item.id,
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
  const productOptions = (productsQuery.data?.data ?? []).map((product) => ({
    value: product.id,
    label: product.name,
  }));

  function handleDelete() {
    if (!window.confirm(tr.crm.purchaseOrders.deleteConfirm)) {
      return;
    }
    deleteMutation.mutate(id, { onSuccess: () => navigate('/siparisler') });
  }

  const onSubmit = handleSubmit((values) => {
    updateMutation.mutate(
      {
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
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  });

  return (
    <AppShell>
      <button
        type="button"
        onClick={() => navigate('/siparisler')}
        className="text-sm font-semibold text-app-muted hover:text-app-text"
      >
        {'←'} {tr.crm.purchaseOrders.detail.back}
      </button>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">{purchaseOrder.orderNumber}</h1>
            <Badge variant={STATUS_BADGE_VARIANT[purchaseOrder.status]}>
              {tr.crm.purchaseOrders.statusOptions[purchaseOrder.status]}
            </Badge>
          </div>
        </div>
        <Button type="button" variant="danger" onClick={handleDelete}>
          {tr.crm.purchaseOrders.detail.deleteButton}
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-4">
        <button
          type="button"
          onClick={() => navigate(`/teklifler/${purchaseOrder.quoteId}`)}
          className="text-sm font-semibold text-app-brand hover:underline"
        >
          {tr.crm.purchaseOrders.detail.relatedQuoteLink}
        </button>
        {purchaseOrder.projectId && (
          <button
            type="button"
            onClick={() => navigate(`/projeler/${purchaseOrder.projectId}`)}
            className="text-sm font-semibold text-app-brand hover:underline"
          >
            {tr.crm.purchaseOrders.detail.relatedProjectLink}
          </button>
        )}
      </div>

      <form
        onSubmit={onSubmit}
        className="mt-6 rounded-xl border border-app-border bg-app-surface p-6"
      >
        <h2 className="text-sm font-bold text-app-text">
          {tr.crm.purchaseOrders.detail.itemsTitle}
        </h2>
        <FormError message={errors.items?.message} />

        <div className="mt-3 flex flex-col gap-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="flex flex-wrap items-start gap-3 rounded-lg border border-app-border p-3"
            >
              <div className="w-full min-w-[180px] flex-1 sm:w-auto">
                <Select
                  label={tr.crm.purchaseOrders.detail.productColumn}
                  placeholder={tr.crm.purchaseOrders.detail.productPlaceholder}
                  options={productOptions}
                  {...register(`items.${index}.productId` as const)}
                />
              </div>
              <div className="w-full min-w-[180px] flex-1 sm:w-auto">
                <TextField
                  label={tr.crm.purchaseOrders.detail.descriptionLabel}
                  required
                  error={errors.items?.[index]?.description?.message}
                  {...register(`items.${index}.description` as const)}
                />
              </div>
              <div className="w-24">
                <TextField
                  type="text"
                  inputMode="decimal"
                  label={tr.crm.purchaseOrders.detail.quantityLabel}
                  required
                  error={errors.items?.[index]?.quantity?.message}
                  {...decimalOnly(register(`items.${index}.quantity` as const))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase text-app-muted">
                  {tr.crm.purchaseOrders.detail.sourceColumn}
                </span>
                <Badge variant="neutral">{tr.crm.purchaseOrders.sourceOptions[field.source]}</Badge>
              </div>
              <div className="flex flex-col gap-1.5">
                <span
                  className="select-none text-sm font-semibold text-transparent"
                  aria-hidden="true"
                >
                  &nbsp;
                </span>
                <Button type="button" variant="secondary" onClick={() => remove(index)}>
                  {tr.crm.purchaseOrders.detail.removeItem}
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              append({ description: '', quantity: '1', source: 'EXTRA', productId: undefined })
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
