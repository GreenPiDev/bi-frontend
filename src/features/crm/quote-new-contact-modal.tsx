import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '../../components/ui/button';
import { FormError } from '../../components/ui/form-error';
import { Modal } from '../../components/ui/modal';
import { TextField } from '../../components/ui/text-field';
import { useToast } from '../../components/ui/toast-context';
import { quickContactFormSchema, type QuickContactFormValues } from './schemas';
import { useCreateContactMutation } from './use-contacts';
import { ApiError, type Contact } from '../../lib/api';
import { tr } from '../../i18n/tr';

interface QuoteNewContactModalProps {
  accountId: string;
  accountName: string;
  onClose: () => void;
  onCreated: (contact: Contact) => void;
}

/** Teklif formunda firma zaten seçili olduğu için `NewContactModal`'ın tam alan
 * kümesi (departman/unvan/e-posta/telefon...) yerine sadece ad/soyad sorulan,
 * `/gorusmeler/yeni`'deki "+ Yeni Kişi" ile aynı amaca hizmet eden küçültülmüş bir
 * varyant - bkz. `quote-form-page.tsx`, `tr.crm.quotes.form.newContactButton`. */
export function QuoteNewContactModal({
  accountId,
  accountName,
  onClose,
  onCreated,
}: QuoteNewContactModalProps) {
  const toast = useToast();
  const createMutation = useCreateContactMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<QuickContactFormValues>({
    resolver: zodResolver(quickContactFormSchema),
    defaultValues: { firstName: '', lastName: '' },
  });

  const onSubmit = handleSubmit((values) => {
    createMutation.mutate(
      { ...values, accountId },
      {
        onSuccess: (contact) => {
          toast.success(tr.crm.contacts.form.createSuccess);
          onCreated(contact);
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  });

  const apiErrorMessage =
    createMutation.error instanceof ApiError ? createMutation.error.message : undefined;

  return (
    <Modal title={tr.crm.contacts.form.newTitle} onClose={onClose} width="sm">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <FormError message={apiErrorMessage} />
        <p className="text-sm text-app-muted">
          {tr.crm.quotes.form.newContactAccountNotice(accountName)}
        </p>
        <TextField
          label={tr.crm.contacts.form.firstNameLabel}
          required
          autoFocus
          error={errors.firstName?.message}
          {...register('firstName')}
        />
        <TextField
          label={tr.crm.contacts.form.lastNameLabel}
          required
          error={errors.lastName?.message}
          {...register('lastName')}
        />
        <div className="mt-1 flex gap-2">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending
              ? tr.crm.contacts.form.submitting
              : tr.crm.contacts.form.submit}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            {tr.crm.contacts.form.cancel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
