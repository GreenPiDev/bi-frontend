import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';
import { Select } from '../components/ui/select';
import { TextareaField } from '../components/ui/textarea-field';
import { useToast } from '../components/ui/toast-context';
import { QuoteRejectReasonSelect } from '../features/crm/quote-reject-reason-select';
import { reopenQuoteFormSchema, type ReopenQuoteFormValues } from '../features/crm/schemas';
import { useReopenQuoteMutation } from '../features/crm/use-quotes';
import { useWarehousesQuery } from '../features/crm/use-warehouses';
import { tr } from '../i18n/tr';
import { ApiError, type Quote, type QuoteStatus } from '../lib/api';
import { QUOTE_STATUS_OPTIONS } from '../lib/quote-totals';

interface ReopenQuoteModalProps {
  quote: Quote;
  /** Listedeki durum dropdown'undan gelindiyse hedef durum onceden secili gelir;
   * verilmezse (detay sayfasi) modal icinde secilir. */
  initialStatus?: QuoteStatus;
  onClose: () => void;
}

/** Kilitli (Onaylandi/Reddedildi) teklifin durumunu degistirme - APPROVE izni olan
 * kullanicilar icin. Gerekce her zaman zorunlu; hedef Onaylandi ise depo, Reddedildi
 * ise red sebebi istenir. Onaydan cikarken stok iadesi + satis siparisi iptali
 * backend'de otomatik yapilir (bkz. bi-backend QuotesService.reopen). */
export function ReopenQuoteModal({ quote, initialStatus, onClose }: ReopenQuoteModalProps) {
  const toast = useToast();
  const reopenMutation = useReopenQuoteMutation(quote.id);
  const warehousesQuery = useWarehousesQuery({ pageSize: 100 });
  const warehouses = warehousesQuery.data?.data ?? [];

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ReopenQuoteFormValues>({
    resolver: zodResolver(reopenQuoteFormSchema),
    defaultValues: {
      status: initialStatus ?? '',
      note: '',
      warehouseId: '',
      rejectionReason: '',
    },
  });
  const targetStatus = useWatch({ control, name: 'status' });
  const statusOptions = QUOTE_STATUS_OPTIONS.filter((option) => option.value !== quote.status);

  function onSubmit(values: ReopenQuoteFormValues) {
    const status = values.status as QuoteStatus;
    reopenMutation.mutate(
      {
        status,
        note: values.note.trim(),
        warehouseId: status === 'APPROVED' ? values.warehouseId : undefined,
        rejectionReason: status === 'REJECTED' ? values.rejectionReason : undefined,
      },
      {
        onSuccess: () => {
          toast.success(tr.crm.quotes.detail.reopenSuccess);
          onClose();
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.crm.quotes.detail.reopenError);
        },
      },
    );
  }

  return (
    <Modal
      title={tr.crm.quotes.detail.reopenModalTitle}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            {tr.crm.stock.cancel}
          </Button>
          <Button type="submit" form="reopen-quote-form" disabled={reopenMutation.isPending}>
            {tr.crm.quotes.detail.reopenConfirmButton}
          </Button>
        </>
      }
    >
      <form
        id="reopen-quote-form"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <p className="text-sm text-app-muted">
          {tr.crm.quotes.detail.reopenLockedInfo(tr.crm.quotes.statusOptions[quote.status])}
        </p>
        {quote.status === 'APPROVED' && (
          <div className="rounded-lg border border-app-border border-l-4 border-l-amber-500 bg-app-bg-muted px-3.5 py-3 text-sm text-app-text">
            <p className="leading-relaxed">{tr.crm.quotes.detail.reopenApprovedWarning}</p>
          </div>
        )}
        <Select
          label={tr.crm.quotes.detail.reopenStatusLabel}
          placeholder={tr.crm.quotes.detail.reopenStatusPlaceholder}
          required
          error={errors.status?.message}
          options={statusOptions}
          {...register('status')}
        />
        {targetStatus === 'APPROVED' && (
          <>
            <p className="text-sm text-app-muted">{tr.crm.quotes.detail.approveModalMessage}</p>
            <Select
              label={tr.crm.quotes.detail.approveWarehouseLabel}
              placeholder={tr.crm.quotes.detail.approveWarehousePlaceholder}
              required
              error={errors.warehouseId?.message}
              options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
              {...register('warehouseId')}
            />
          </>
        )}
        {targetStatus === 'REJECTED' && (
          <Controller
            name="rejectionReason"
            control={control}
            render={({ field }) => (
              <QuoteRejectReasonSelect
                value={field.value ?? ''}
                onChange={field.onChange}
                error={errors.rejectionReason?.message}
              />
            )}
          />
        )}
        <TextareaField
          label={tr.crm.quotes.detail.reopenNoteLabel}
          placeholder={tr.crm.quotes.detail.reopenNotePlaceholder}
          required
          error={errors.note?.message}
          {...register('note')}
        />
      </form>
    </Modal>
  );
}
