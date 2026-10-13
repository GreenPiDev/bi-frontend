import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../../components/ui/button';
import { FormError } from '../../components/ui/form-error';
import { Modal } from '../../components/ui/modal';
import { useToast } from '../../components/ui/toast-context';
import { AccountFormFields } from './account-form-fields';
import { AddOptionModal } from './add-option-modal';
import { accountFormSchema, cleanEmptyStrings, type AccountFormValues } from './schemas';
import { useCreateAccountMutation } from './use-accounts';
import { useCreateSectorOptionMutation } from './use-sector-options';
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
  const createSectorOptionMutation = useCreateSectorOptionMutation();
  const [showAddSectorModal, setShowAddSectorModal] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
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
    <>
      <Modal title={tr.crm.accounts.form.newTitle} onClose={onClose} width="lg">
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormError message={apiErrorMessage} />
          <AccountFormFields
            register={register}
            control={control}
            setValue={setValue}
            errors={errors}
            onRequestAddSector={() => setShowAddSectorModal(true)}
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

      {showAddSectorModal && (
        <AddOptionModal
          title={tr.crm.accounts.form.sectorNewModalTitle}
          fieldLabel={tr.crm.accounts.form.sectorNewFieldLabel}
          placeholder={tr.crm.accounts.form.sectorNewPlaceholder}
          successMessage={tr.crm.accounts.form.sectorNewSuccess}
          createMutation={createSectorOptionMutation}
          onClose={() => setShowAddSectorModal(false)}
          onCreated={(label) => {
            const currentSectors = getValues('sector') ?? [];
            setValue('sector', [...currentSectors, label], { shouldValidate: true });
            setShowAddSectorModal(false);
          }}
        />
      )}
    </>
  );
}
