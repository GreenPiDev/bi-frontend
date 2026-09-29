import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/modal';
import { TextField } from '../../components/ui/text-field';
import { useToast } from '../../components/ui/toast-context';
import { tr } from '../../i18n/tr';
import { ApiError } from '../../lib/api';
import { useCreateReminderTypeOptionMutation } from './use-reminder-type-options';

interface QuickAddReminderTypeModalProps {
  onClose: () => void;
  /** Yeni deger olusturulunca formdaki secime otomatik yansitmak icin. */
  onCreated: (label: string) => void;
}

/** "Hatirlatici Turu" alaninin yaninda, en az bir deger tanimliyken beliren "+" butonuyla
 * acilan kucuk ekleme modali - /settings?tab=crm > Ajanda'ya gitmeden hizli deger ekler.
 * Ayni etiket tum tenant'ta OptionListManager (crm-settings-section.tsx) uzerinden de
 * yonetilebilir, bu sadece hizli bir kisayol. */
export function QuickAddReminderTypeModal({ onClose, onCreated }: QuickAddReminderTypeModalProps) {
  const toast = useToast();
  const [label, setLabel] = useState('');
  const createMutation = useCreateReminderTypeOptionMutation();

  function handleSubmit() {
    const trimmed = label.trim();
    if (!trimmed) {
      return;
    }
    createMutation.mutate(trimmed, {
      onSuccess: (option) => {
        toast.success(tr.settings.crm.reminderTypeOptions.addSuccess);
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
      title={tr.crm.calendar.form.quickAddReminderType.title}
      onClose={onClose}
      width="sm"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            {tr.crm.calendar.form.cancel}
          </Button>
          <Button
            type="button"
            disabled={createMutation.isPending || !label.trim()}
            onClick={handleSubmit}
          >
            {createMutation.isPending
              ? tr.crm.calendar.form.submitting
              : tr.crm.calendar.form.quickAddReminderType.submit}
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
          label={tr.crm.calendar.form.quickAddReminderType.label}
          placeholder={tr.settings.crm.reminderTypeOptions.addPlaceholder}
          required
          autoFocus
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
      </form>
    </Modal>
  );
}
