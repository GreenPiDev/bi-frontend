import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';
import { Select } from '../components/ui/select';
import { TextField } from '../components/ui/text-field';
import { TextareaField } from '../components/ui/textarea-field';
import { useToast } from '../components/ui/toast-context';
import { stockAdjustFormSchema, type StockAdjustFormValues } from '../features/crm/schemas';
import { useWarehousesQuery } from '../features/crm/use-warehouses';
import { useUpsertStockItemMutation } from '../features/crm/use-stock-items';
import { ApiError, type StockItem } from '../lib/api';
import { tr } from '../i18n/tr';

interface StockAdjustModalProps {
  item: StockItem;
  mode: 'increase' | 'decrease';
  onClose: () => void;
}

export function StockAdjustModal({ item, mode, onClose }: StockAdjustModalProps) {
  const toast = useToast();
  const mutation = useUpsertStockItemMutation();
  const warehousesQuery = useWarehousesQuery({ pageSize: 100 });
  const warehouses = warehousesQuery.data?.data ?? [];
  const defaultWarehouseId = item.warehouses[0]?.warehouseId ?? warehouses[0]?.id ?? '';

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<StockAdjustFormValues>({
    resolver: zodResolver(stockAdjustFormSchema),
    defaultValues: { warehouseId: defaultWarehouseId, amount: '', note: '' },
  });

  const warehouseIdValue = watch('warehouseId');
  const amountValue = watch('amount');
  const parsedAmount = Number(amountValue);
  const hasValidAmount = amountValue !== '' && Number.isFinite(parsedAmount) && parsedAmount > 0;
  const amountHint = hasValidAmount
    ? mode === 'increase'
      ? { text: tr.crm.stock.increaseAmountHint(parsedAmount), className: 'text-app-success' }
      : { text: tr.crm.stock.decreaseAmountHint(parsedAmount), className: 'text-app-danger' }
    : undefined;

  function onSubmit(values: StockAdjustFormValues) {
    const amount = Number(values.amount);
    const currentQuantity = Number(
      item.warehouses.find((w) => w.warehouseId === values.warehouseId)?.quantity ?? 0,
    );
    const newQuantity = mode === 'increase' ? currentQuantity + amount : currentQuantity - amount;
    mutation.mutate(
      {
        productId: item.productId,
        warehouseId: values.warehouseId,
        quantity: newQuantity,
        note: values.note,
      },
      {
        onSuccess: () => {
          toast.success(tr.crm.stock.saveSuccess);
          onClose();
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  }

  return (
    <Modal
      title={
        mode === 'increase' ? tr.crm.stock.increaseModalTitle : tr.crm.stock.decreaseModalTitle
      }
      subtitle={item.product.name}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            {tr.crm.stock.cancel}
          </Button>
          <Button
            type="submit"
            form="stock-adjust-form"
            disabled={mutation.isPending || warehouses.length === 0}
          >
            {mutation.isPending ? tr.crm.stock.saving : tr.crm.stock.save}
          </Button>
        </>
      }
    >
      <form
        id="stock-adjust-form"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        {warehouses.length === 0 ? (
          <div className="rounded-lg border border-dashed border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-muted">
            {tr.crm.stock.noWarehousesMessage}{' '}
            <Link
              to="/depolar/yeni"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-app-brand hover:underline"
            >
              {tr.crm.stock.noWarehousesLink}
            </Link>
          </div>
        ) : (
          <Select
            label={tr.crm.stock.warehouseLabel}
            placeholder={tr.crm.stock.warehousePlaceholder}
            required
            error={errors.warehouseId?.message}
            options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
            {...register('warehouseId')}
          />
        )}
        {warehouseIdValue && (
          <p className="text-xs text-app-muted">
            {tr.crm.stock.breakdown.quantityColumn}:{' '}
            {item.warehouses.find((w) => w.warehouseId === warehouseIdValue)?.quantity ?? 0}
          </p>
        )}
        <div className="flex flex-col gap-1">
          <TextField
            label={tr.crm.stock.amountLabel}
            inputMode="decimal"
            prefix={mode === 'decrease' ? '-' : undefined}
            error={errors.amount?.message}
            required
            autoFocus
            {...register('amount')}
          />
          {!errors.amount && amountHint && (
            <p className={`text-xs font-medium ${amountHint.className}`}>{amountHint.text}</p>
          )}
        </div>
        <TextareaField
          label={tr.crm.stock.noteLabel}
          hint={tr.crm.stock.noteHint}
          rows={3}
          error={errors.note?.message}
          {...register('note')}
        />
      </form>
    </Modal>
  );
}
