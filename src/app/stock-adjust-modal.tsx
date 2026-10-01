import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';
import { TextField } from '../components/ui/text-field';
import { TextareaField } from '../components/ui/textarea-field';
import { useToast } from '../components/ui/toast-context';
import { stockAdjustFormSchema, type StockAdjustFormValues } from '../features/crm/schemas';
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
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<StockAdjustFormValues>({
    resolver: zodResolver(stockAdjustFormSchema),
    defaultValues: { amount: '', note: '' },
  });

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
    const currentQuantity = Number(item.quantity);
    const newQuantity = mode === 'increase' ? currentQuantity + amount : currentQuantity - amount;
    mutation.mutate(
      { productId: item.productId, quantity: newQuantity, note: values.note },
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
          <Button type="submit" form="stock-adjust-form" disabled={mutation.isPending}>
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
