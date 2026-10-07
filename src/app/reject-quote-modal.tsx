import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';
import { Select } from '../components/ui/select';
import { TextareaField } from '../components/ui/textarea-field';
import { useQuoteRejectionReasonOptionsQuery } from '../features/crm/use-quote-rejection-reason-options';
import { rejectQuoteFormSchema, type RejectQuoteFormValues } from '../features/crm/schemas';
import { tr } from '../i18n/tr';

interface RejectQuoteModalProps {
  isPending: boolean;
  onConfirm: (reason: string, note?: string) => void;
  onCancel: () => void;
}

/** Teklif reddi onaylandiktan (ConfirmModal "evet, degistir") sonra acilan geri
 * bildirim modali: kullanici tanimli red sebepleri listesinden birini secer,
 * istege bagli bir ek aciklama ekleyebilir - ApproveQuoteModal'daki depo secimi
 * ile ayni "once onay, sonra form" deseni. */
export function RejectQuoteModal({ isPending, onConfirm, onCancel }: RejectQuoteModalProps) {
  const reasonsQuery = useQuoteRejectionReasonOptionsQuery();
  const reasons = reasonsQuery.data ?? [];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RejectQuoteFormValues>({
    resolver: zodResolver(rejectQuoteFormSchema),
    defaultValues: { reason: '', note: '' },
  });

  function onSubmit(values: RejectQuoteFormValues) {
    onConfirm(values.reason, values.note?.trim() ? values.note.trim() : undefined);
  }

  return (
    <Modal
      title={tr.crm.quotes.detail.rejectModalTitle}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onCancel}>
            {tr.crm.stock.cancel}
          </Button>
          <Button type="submit" form="reject-quote-form" disabled={isPending}>
            {tr.crm.quotes.detail.rejectConfirmButton}
          </Button>
        </>
      }
    >
      <form
        id="reject-quote-form"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <p className="text-sm text-app-muted">{tr.crm.quotes.detail.rejectModalMessage}</p>
        <Select
          label={tr.crm.quotes.detail.rejectReasonLabel}
          placeholder={tr.crm.quotes.detail.rejectReasonPlaceholder}
          required
          error={errors.reason?.message}
          options={reasons.map((r) => ({ value: r.label, label: r.label }))}
          {...register('reason')}
        />
        <TextareaField
          label={tr.crm.quotes.detail.rejectNoteLabel}
          placeholder={tr.crm.quotes.detail.rejectNotePlaceholder}
          error={errors.note?.message}
          {...register('note')}
        />
      </form>
    </Modal>
  );
}
