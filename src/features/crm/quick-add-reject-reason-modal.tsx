import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/modal';
import { TextField } from '../../components/ui/text-field';
import { useToast } from '../../components/ui/toast-context';
import { tr } from '../../i18n/tr';
import { ApiError } from '../../lib/api';
import { useCreateQuoteRejectionReasonOptionMutation } from './use-quote-rejection-reason-options';

interface QuickAddRejectReasonModalProps {
  onClose: () => void;
  /** Yeni deger olusturulunca formdaki secime otomatik yansitmak icin. */
  onCreated: (label: string) => void;
}

/** "Red Sebebi" alaninin yaninda beliren "+" butonuyla acilan kucuk ekleme modali -
 * quick-add-reminder-type-modal.tsx ile ayni desen: /settings?tab=crm'e gitmeden hizli
 * deger ekler. Ayni liste OptionListManager (crm-settings-section.tsx) uzerinden de
 * yonetilebilir, bu sadece hizli bir kisayol. */
export function QuickAddRejectReasonModal({ onClose, onCreated }: QuickAddRejectReasonModalProps) {
  const toast = useToast();
  const [label, setLabel] = useState('');
  const createMutation = useCreateQuoteRejectionReasonOptionMutation();

  function handleSubmit() {
    const trimmed = label.trim();
    if (!trimmed) {
      return;
    }
    createMutation.mutate(trimmed, {
      onSuccess: (option) => {
        toast.success(tr.settings.crm.quoteRejectionReasonOptions.addSuccess);
        onCreated(option.label);
        onClose();
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  }

  return (
    <Modal
      title={tr.crm.quotes.detail.quickAddRejectReason.title}
      onClose={onClose}
      width="sm"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            {tr.crm.stock.cancel}
          </Button>
          <Button
            type="button"
            disabled={createMutation.isPending || !label.trim()}
            onClick={handleSubmit}
          >
            {createMutation.isPending
              ? tr.crm.calendar.form.submitting
              : tr.crm.quotes.detail.quickAddRejectReason.submit}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <TextField
          label={tr.crm.quotes.detail.quickAddRejectReason.label}
          placeholder={tr.settings.crm.quoteRejectionReasonOptions.addPlaceholder}
          required
          autoFocus
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
      </form>
    </Modal>
  );
}
