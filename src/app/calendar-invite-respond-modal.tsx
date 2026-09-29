import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';
import { TextareaField } from '../components/ui/textarea-field';
import { tr } from '../i18n/tr';

interface CalendarInviteRespondModalProps {
  mode: 'ACCEPT' | 'DECLINE';
  isPending: boolean;
  onConfirm: (responseNote: string | undefined) => void;
  onCancel: () => void;
}

/** Kabul/red - ikisi de bir not girme penceresi acar (kullanici istegi): reddederken
 * not zorunlu, kabul ederken opsiyonel. ConfirmModal metin girisi desteklemedigi icin
 * (bkz. components/ui/confirm-modal.tsx) ayri, kucuk bir modal. */
export function CalendarInviteRespondModal({
  mode,
  isPending,
  onConfirm,
  onCancel,
}: CalendarInviteRespondModalProps) {
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  const isDecline = mode === 'DECLINE';
  const error =
    isDecline && touched && !note.trim() ? tr.crm.calendar.respondModal.noteRequired : undefined;

  function handleSubmit() {
    if (isDecline) {
      setTouched(true);
      if (!note.trim()) {
        return;
      }
    }
    onConfirm(note.trim() || undefined);
  }

  return (
    <Modal
      title={
        isDecline
          ? tr.crm.calendar.respondModal.declineTitle
          : tr.crm.calendar.respondModal.acceptTitle
      }
      onClose={onCancel}
      width="sm"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isPending}>
            {tr.crm.calendar.respondModal.cancel}
          </Button>
          <Button
            type="button"
            variant={isDecline ? 'danger' : 'primary'}
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isDecline
              ? tr.crm.calendar.respondModal.declineSubmit
              : tr.crm.calendar.respondModal.acceptSubmit}
          </Button>
        </>
      }
    >
      <TextareaField
        label={tr.crm.calendar.respondModal.noteLabel}
        hint={
          isDecline
            ? tr.crm.calendar.respondModal.noteHintRequired
            : tr.crm.calendar.respondModal.noteHintOptional
        }
        error={error}
        required={isDecline}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        autoFocus
      />
    </Modal>
  );
}
