import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';
import { Select } from '../components/ui/select';
import { TextField } from '../components/ui/text-field';
import { TextareaField } from '../components/ui/textarea-field';
import { useToast } from '../components/ui/toast-context';
import { useTransferStockMutation } from '../features/crm/use-stock-items';
import { useWarehousesQuery } from '../features/crm/use-warehouses';
import { ApiError, type StockItem } from '../lib/api';
import { tr } from '../i18n/tr';

const transferFormSchema = z
  .object({
    fromWarehouseId: z.string().min(1, 'Kaynak depo seçimi gerekli.'),
    toWarehouseId: z.string().min(1, 'Hedef depo seçimi gerekli.'),
    quantity: z
      .string()
      .min(1, 'Miktar gerekli.')
      .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, "Miktar 0'dan büyük olmalı."),
    note: z.string().max(500).optional(),
  })
  .refine((values) => values.fromWarehouseId !== values.toWarehouseId, {
    message: 'Kaynak ve hedef depo farklı olmalı.',
    path: ['toWarehouseId'],
  });

type TransferFormValues = z.infer<typeof transferFormSchema>;

interface StockTransferModalProps {
  item: StockItem;
  fromWarehouseId: string;
  onClose: () => void;
}

export function StockTransferModal({ item, fromWarehouseId, onClose }: StockTransferModalProps) {
  const toast = useToast();
  const mutation = useTransferStockMutation();
  const warehousesQuery = useWarehousesQuery({ pageSize: 100 });
  const allWarehouses = warehousesQuery.data?.data ?? [];
  const fromOptions = item.warehouses;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<TransferFormValues>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: { fromWarehouseId, toWarehouseId: '', quantity: '', note: '' },
  });

  const fromWarehouseIdValue = watch('fromWarehouseId');
  const availableQuantity = Number(
    fromOptions.find((w) => w.warehouseId === fromWarehouseIdValue)?.quantity ?? 0,
  );
  const toOptions = allWarehouses.filter((w) => w.id !== fromWarehouseIdValue);

  function onSubmit(values: TransferFormValues) {
    mutation.mutate(
      {
        productId: item.productId,
        fromWarehouseId: values.fromWarehouseId,
        toWarehouseId: values.toWarehouseId,
        quantity: Number(values.quantity),
        note: values.note,
      },
      {
        onSuccess: () => {
          toast.success(tr.crm.stock.transfer.success);
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
      title={tr.crm.stock.transfer.title}
      subtitle={item.product.name}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            {tr.crm.stock.cancel}
          </Button>
          <Button type="submit" form="stock-transfer-form" disabled={mutation.isPending}>
            {mutation.isPending ? tr.crm.stock.saving : tr.crm.stock.save}
          </Button>
        </>
      }
    >
      <form
        id="stock-transfer-form"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <Select
          label={tr.crm.stock.transfer.fromLabel}
          placeholder={tr.crm.stock.warehousePlaceholder}
          required
          error={errors.fromWarehouseId?.message}
          options={fromOptions.map((w) => ({
            value: w.warehouseId,
            label: `${w.warehouseName} (${w.quantity})`,
          }))}
          {...register('fromWarehouseId')}
        />
        <Select
          label={tr.crm.stock.transfer.toLabel}
          placeholder={tr.crm.stock.warehousePlaceholder}
          required
          error={errors.toWarehouseId?.message}
          options={toOptions.map((w) => ({ value: w.id, label: w.name }))}
          {...register('toWarehouseId')}
        />
        <div className="flex flex-col gap-1">
          <TextField
            label={tr.crm.stock.transfer.quantityLabel}
            inputMode="decimal"
            error={errors.quantity?.message}
            required
            autoFocus
            {...register('quantity')}
          />
          {!errors.quantity && (
            <p className="text-xs text-app-muted">
              {tr.crm.stock.transfer.availableHint(availableQuantity)}
            </p>
          )}
        </div>
        <TextareaField
          label={tr.crm.stock.noteLabel}
          rows={3}
          error={errors.note?.message}
          {...register('note')}
        />
      </form>
    </Modal>
  );
}
