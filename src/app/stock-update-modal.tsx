import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';
import { TextField } from '../components/ui/text-field';
import { TextareaField } from '../components/ui/textarea-field';
import { useToast } from '../components/ui/toast-context';
import { stockUpdateFormSchema, type StockUpdateFormValues } from '../features/crm/schemas';
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
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StockUpdateFormValues>({
    resolver: zodResolver(stockUpdateFormSchema),
    defaultValues: { quantity: item.quantity, note: '' },
  });

  function onSubmit(values: StockUpdateFormValues) {
    mutation.mutate(
      { productId: item.productId, quantity: Number(values.quantity), note: values.note },
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
          <Button type="submit" form="stock-update-form" disabled={mutation.isPending}>
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
        <TextField
          label={tr.crm.stock.newQuantityLabel}
          inputMode="decimal"
          error={errors.quantity?.message}
          required
          autoFocus
          {...register('quantity')}
        />
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
