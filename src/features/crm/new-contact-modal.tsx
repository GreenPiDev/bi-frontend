import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '../../components/ui/button';
import { FormError } from '../../components/ui/form-error';
import { Modal } from '../../components/ui/modal';
import { useToast } from '../../components/ui/toast-context';
import { ContactFormFields } from './contact-form-fields';
import { cleanEmptyStrings, contactFormSchema, type ContactFormValues } from './schemas';
import { useCreateContactMutation } from './use-contacts';
import { ApiError, type Contact } from '../../lib/api';
import { tr } from '../../i18n/tr';

interface NewContactModalProps {
  defaultFirstName?: string;
  onClose: () => void;
  onCreated: (contact: Contact) => void;
}

export function NewContactModal({ defaultFirstName, onClose, onCreated }: NewContactModalProps) {
  const toast = useToast();
  const createMutation = useCreateContactMutation();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: { status: 'ACTIVE', firstName: defaultFirstName ?? '' },
  });

  const onSubmit = handleSubmit((values) => {
    createMutation.mutate(cleanEmptyStrings(values), {
      onSuccess: (contact) => {
        toast.success(tr.crm.contacts.form.createSuccess);
        onCreated(contact);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  });

  const apiErrorMessage =
    createMutation.error instanceof ApiError ? createMutation.error.message : undefined;

  return (
    <Modal title={tr.crm.contacts.form.newTitle} onClose={onClose} width="lg">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <FormError message={apiErrorMessage} />
        <ContactFormFields register={register} control={control} errors={errors} />
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
