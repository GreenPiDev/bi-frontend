import { Modal } from '../components/ui/modal';
import { MessageComposeForm } from '../features/crm/message-compose-form';
import { tr } from '../i18n/tr';

interface NewMessageModalProps {
  onClose: () => void;
}

export function NewMessageModal({ onClose }: NewMessageModalProps) {
  return (
    <Modal title={tr.crm.messages.newButton} onClose={onClose} width="lg">
      <MessageComposeForm mode="new" onCancel={onClose} onSuccess={onClose} />
    </Modal>
  );
}
