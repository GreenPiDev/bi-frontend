import { Modal } from '../components/ui/modal';
import { MessageComposeForm } from '../features/crm/message-compose-form';
import type { MessageComposeFormValues } from '../features/crm/schemas';
import { tr } from '../i18n/tr';

interface NewMessageModalProps {
  onClose: () => void;
  defaultToUserIds?: string[];
  defaultRelatedEntity?: MessageComposeFormValues['relatedEntity'];
  defaultRelatedEntityId?: string;
}

export function NewMessageModal({
  onClose,
  defaultToUserIds,
  defaultRelatedEntity,
  defaultRelatedEntityId,
}: NewMessageModalProps) {
  return (
    <Modal title={tr.crm.messages.newButton} onClose={onClose} width="lg">
      <MessageComposeForm
        mode="new"
        onCancel={onClose}
        onSuccess={onClose}
        defaultToUserIds={defaultToUserIds}
        defaultRelatedEntity={defaultRelatedEntity}
        defaultRelatedEntityId={defaultRelatedEntityId}
      />
    </Modal>
  );
}
