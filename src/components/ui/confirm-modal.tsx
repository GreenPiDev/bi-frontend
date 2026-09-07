import { Button } from './button';
import { Modal } from './modal';
import { tr } from '../../i18n/tr';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  variant?: 'primary' | 'danger';
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Yikici (silme vb.) aksiyonlar icin genel onay modali - tarayicinin native
 * window.confirm()'unun yerine gecer, projenin Modal/Button bilesenleriyle tutarli. */
export function ConfirmModal({
  title,
  message,
  confirmLabel,
  variant = 'danger',
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      width="sm"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isPending}>
            {tr.common.cancel}
          </Button>
          <Button type="button" variant={variant} onClick={onConfirm} disabled={isPending}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-app-text">{message}</p>
    </Modal>
  );
}
