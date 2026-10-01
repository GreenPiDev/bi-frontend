import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';
import { Select } from '../components/ui/select';
import { useWarehousesQuery } from '../features/crm/use-warehouses';
import { approveQuoteFormSchema, type ApproveQuoteFormValues } from '../features/crm/schemas';
import { tr } from '../i18n/tr';

interface ApproveQuoteModalProps {
  isPending: boolean;
  onConfirm: (warehouseId: string) => void;
  onCancel: () => void;
}

/** Faz 4/5 (bkz. docs/PLAN_STOK_MALIYET.md): teklif onaylanmadan once kullanicidan
 * hangi depodan otomatik dusulecegini sorar - varsayilan depo gibi ortuk bir kural
 * yok, kullanici her onayda depoyu kendisi secer (karar 5). */
export function ApproveQuoteModal({ isPending, onConfirm, onCancel }: ApproveQuoteModalProps) {
  const warehousesQuery = useWarehousesQuery({ pageSize: 100 });
  const warehouses = warehousesQuery.data?.data ?? [];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApproveQuoteFormValues>({
    resolver: zodResolver(approveQuoteFormSchema),
    defaultValues: { warehouseId: '' },
  });

  function onSubmit(values: ApproveQuoteFormValues) {
    onConfirm(values.warehouseId);
  }

  return (
    <Modal
      title={tr.crm.quotes.detail.approveModalTitle}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onCancel}>
            {tr.crm.stock.cancel}
          </Button>
          <Button
            type="submit"
            form="approve-quote-form"
            disabled={isPending || warehouses.length === 0}
          >
            {tr.crm.quotes.detail.approveConfirmButton}
          </Button>
        </>
      }
    >
      <form
        id="approve-quote-form"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <p className="text-sm text-app-muted">{tr.crm.quotes.detail.approveModalMessage}</p>
        {warehouses.length === 0 ? (
          <div className="rounded-lg border border-dashed border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-muted">
            {tr.crm.quotes.detail.approveNoWarehousesMessage}{' '}
            <Link
              to="/depolar/yeni"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-app-brand hover:underline"
            >
              {tr.crm.quotes.detail.approveNoWarehousesLink}
            </Link>
          </div>
        ) : (
          <Select
            label={tr.crm.quotes.detail.approveWarehouseLabel}
            placeholder={tr.crm.quotes.detail.approveWarehousePlaceholder}
            required
            error={errors.warehouseId?.message}
            options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
            {...register('warehouseId')}
          />
        )}
      </form>
    </Modal>
  );
}
