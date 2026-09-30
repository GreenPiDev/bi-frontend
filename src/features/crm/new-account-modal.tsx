import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '../../components/ui/button';
import { FormError } from '../../components/ui/form-error';
import { Modal } from '../../components/ui/modal';
import { useToast } from '../../components/ui/toast-context';
import { AccountFormFields } from './account-form-fields';
import { accountFormSchema, cleanEmptyStrings, type AccountFormValues } from './schemas';
import { useCreateAccountMutation } from './use-accounts';
import { ApiError, type Account, type AccountInput } from '../../lib/api';
import { tr } from '../../i18n/tr';

interface NewAccountModalProps {
  defaultName?: string;
  onClose: () => void;
  onCreated: (account: Account) => void;
}

/** `NewProductModal`/`NewContactModal` ile aynı desen: sisteme kayıtlı olmayan bir
 * firmayı, teklif formundan ayrılmadan "+ Yeni Firma" ile hemen oluşturup çağırana
 * geri verir (bkz. `quote-form-page.tsx`). Alan kümesi `account-form-page.tsx` ile
 * paylaşılan `AccountFormFields`'ten gelir. */
export function NewAccountModal({ defaultName, onClose, onCreated }: NewAccountModalProps) {
  const toast = useToast();
  const createMutation = useCreateAccountMutation();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: { accountTypes: [], sector: [], name: defaultName ?? '' },
  });

  const onSubmit = handleSubmit((values) => {
    const {
      hasContact,
      contactFirstName,
      contactLastName,
      contactDepartment,
      contactTitle,
      contactPhone,
      contactExtension,
      ...accountValues
    } = values;

    const contactPayload = hasContact
      ? {
          firstName: contactFirstName ?? '',
          lastName: contactLastName ?? '',
          department: contactDepartment || undefined,
          title: contactTitle || undefined,
          phone: contactPhone || undefined,
          extension: contactExtension || undefined,
        }
      : undefined;

    const payload: AccountInput = {
      ...cleanEmptyStrings(accountValues),
      ...(contactPayload ? { contact: contactPayload } : {}),
    };

    createMutation.mutate(payload, {
      onSuccess: (account) => {
        toast.success(tr.crm.quotes.form.newAccountCreatedAndAdded);
        onCreated(account);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  });

  const apiErrorMessage =
    createMutation.error instanceof ApiError ? createMutation.error.message : undefined;

  return (
    <Modal title={tr.crm.accounts.form.newTitle} onClose={onClose} width="lg">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <FormError message={apiErrorMessage} />
        <AccountFormFields
          register={register}
          control={control}
          setValue={setValue}
          errors={errors}
        />
        <div className="mt-1 flex gap-2">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending
              ? tr.crm.accounts.form.submitting
              : tr.crm.accounts.form.submit}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            {tr.crm.accounts.form.cancel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
