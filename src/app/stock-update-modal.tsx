import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';
import { Select } from '../components/ui/select';
import { TextField } from '../components/ui/text-field';
import { TextareaField } from '../components/ui/textarea-field';
import { useToast } from '../components/ui/toast-context';
import { stockUpdateFormSchema, type StockUpdateFormValues } from '../features/crm/schemas';
import { useWarehousesQuery } from '../features/crm/use-warehouses';
import { useUpsertStockItemMutation } from '../features/crm/use-stock-items';
import { ApiError, type StockItem } from '../lib/api';
import { tr } from '../i18n/tr';

interface StockUpdateModalProps {
  item: StockItem;
  onClose: () => void;
}

export function StockUpdateModal({ item, onClose }: StockUpdateModalProps) {
  const toast = useToast();
  const mutation = useUpsertStockItemMutation();
  const warehousesQuery = useWarehousesQuery({ pageSize: 100 });
  const warehouses = warehousesQuery.data?.data ?? [];
  const defaultWarehouseId = item.warehouses[0]?.warehouseId ?? warehouses[0]?.id ?? '';

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StockUpdateFormValues>({
    resolver: zodResolver(stockUpdateFormSchema),
    defaultValues: {
      warehouseId: defaultWarehouseId,
      quantity: item.warehouses[0]?.quantity ?? '0',
      note: '',
    },
  });

  const warehouseIdValue = watch('warehouseId');

  // Depo secimi degisince, o depodaki mevcut miktar yeni baslangic degeri olur -
  // kullanici "Merkez Depo"dan "Sube Depo"ya gecince eski depo miktarini degil,
  // yeni deponun kendi miktarini gorup duzenlemeli.
  useEffect(() => {
    const warehouseQuantity = item.warehouses.find(
      (w) => w.warehouseId === warehouseIdValue,
    )?.quantity;
    setValue('quantity', warehouseQuantity ?? '0');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseIdValue]);

  const quantityValue = watch('quantity');
  const parsedQuantity = Number(quantityValue);
  const currentQuantity = Number(
    item.warehouses.find((w) => w.warehouseId === warehouseIdValue)?.quantity ?? 0,
  );
  const diff =
    quantityValue !== '' && Number.isFinite(parsedQuantity) ? parsedQuantity - currentQuantity : 0;
  const quantityHint =
    diff > 0
      ? { text: tr.crm.stock.quantityDiffIncrease(diff), className: 'text-app-success' }
      : diff < 0
        ? { text: tr.crm.stock.quantityDiffDecrease(Math.abs(diff)), className: 'text-app-danger' }
        : undefined;

  function onSubmit(values: StockUpdateFormValues) {
    mutation.mutate(
      {
        productId: item.productId,
        warehouseId: values.warehouseId,
        quantity: Number(values.quantity),
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
      title={tr.crm.stock.updateModalTitle}
      subtitle={item.product.name}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            {tr.crm.stock.cancel}
          </Button>
          <Button
            type="submit"
            form="stock-update-form"
            disabled={mutation.isPending || warehouses.length === 0}
          >
            {mutation.isPending ? tr.crm.stock.saving : tr.crm.stock.save}
          </Button>
        </>
      }
    >
      <form
        id="stock-update-form"
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
        <div className="flex flex-col gap-1">
          <TextField
            label={tr.crm.stock.newQuantityLabel}
            inputMode="decimal"
            error={errors.quantity?.message}
            required
            autoFocus
            {...register('quantity')}
          />
          {!errors.quantity && quantityHint && (
            <p className={`text-xs font-medium ${quantityHint.className}`}>{quantityHint.text}</p>
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
