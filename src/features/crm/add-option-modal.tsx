import { useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/button';
import { FormError } from '../../components/ui/form-error';
import { Modal } from '../../components/ui/modal';
import { TextField } from '../../components/ui/text-field';
import { useToast } from '../../components/ui/toast-context';
import { ApiError } from '../../lib/api';
import { tr } from '../../i18n/tr';

interface CreatedOption {
  label: string;
}

interface CreateOptionMutationLike {
  mutate: (
    label: string,
    callbacks: { onSuccess: (option: CreatedOption) => void; onError: (error: unknown) => void },
  ) => void;
  isPending: boolean;
}

interface AddOptionModalProps {
  title: string;
  fieldLabel: string;
  placeholder?: string;
  successMessage: string;
  createMutation: CreateOptionMutationLike;
  onClose: () => void;
  onCreated: (label: string) => void;
}

/** Birim/Kategori/Marka `Select`'lerinin yanındaki "+ Yeni ..." butonuyla açılan,
 * kullanıcının Ayarlar → Tanımlamalar'a gitmeden tek bir değer eklemesini sağlayan
 * genel modal. Sadece en az 1 tanımlı değer varken gösterilir (`UnitSelect` vb.) -
 * hiç değer yokken zaten ayarlara yönlendiren ayrı bir boş-durum mesajı var. */
export function AddOptionModal({
  title,
  fieldLabel,
  placeholder,
  successMessage,
  createMutation,
  onClose,
  onCreated,
}: AddOptionModalProps) {
  const toast = useToast();
  const [label, setLabel] = useState('');
  const [apiErrorMessage, setApiErrorMessage] = useState<string | undefined>();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) {
      return;
    }
    createMutation.mutate(trimmed, {
      onSuccess: (option) => {
        toast.success(successMessage);
        onCreated(option.label);
      },
      onError: (error) => {
        setApiErrorMessage(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  }

  return (
    <Modal title={title} onClose={onClose} width="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <FormError message={apiErrorMessage} />
        <TextField
          label={fieldLabel}
          autoFocus
          placeholder={placeholder}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={createMutation.isPending}>
            {tr.common.save}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            {tr.common.cancel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
