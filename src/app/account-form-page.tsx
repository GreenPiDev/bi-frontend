import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { useToast } from '../components/ui/toast-context';
import { AccountFormFields } from '../features/crm/account-form-fields';
import { buildAccountSlug, extractAccountId } from '../features/crm/account-slug';
import {
  accountFormSchema,
  cleanEmptyStrings,
  type AccountFormValues,
} from '../features/crm/schemas';
import {
  useAccountQuery,
  useCreateAccountMutation,
  useUpdateAccountMutation,
} from '../features/crm/use-accounts';
import { useCreateContactMutation } from '../features/crm/use-contacts';
import { ApiError, type AccountInput } from '../lib/api';
import { tr } from '../i18n/tr';

export function AccountFormPage() {
  const { slug } = useParams();
  const id = slug ? extractAccountId(slug) : undefined;
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const accountQuery = useAccountQuery(id ?? '');
  const createMutation = useCreateAccountMutation();
  const updateMutation = useUpdateAccountMutation(id ?? '');
  const mutation = isEdit ? updateMutation : createMutation;
  const createContactMutation = useCreateContactMutation();

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: { accountTypes: [], sector: [] },
  });

  useEffect(() => {
    if (accountQuery.data) {
      reset({
        name: accountQuery.data.name,
        taxNumber: accountQuery.data.taxNumber ?? undefined,
        taxOffice: accountQuery.data.taxOffice ?? undefined,
        sector: accountQuery.data.sector ?? [],
        accountTypes: accountQuery.data.accountTypes,
        website: accountQuery.data.website ?? undefined,
        phone: accountQuery.data.phone ?? undefined,
        landlinePhone: accountQuery.data.landlinePhone ?? undefined,
        email: accountQuery.data.email ?? undefined,
        address: accountQuery.data.address ?? undefined,
        city: accountQuery.data.city ?? undefined,
        district: accountQuery.data.district ?? undefined,
      });
    }
  }, [accountQuery.data, reset]);

  if (isEdit && accountQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-app-muted">{tr.common.loading}</p>
      </AppShell>
    );
  }

  const onSubmit = handleSubmit((values) => {
    const {
      hasContact: submitHasContact,
      contactFirstName,
      contactLastName,
      contactDepartment,
      contactTitle,
      contactPhone,
      contactExtension,
      ...accountValues
    } = values;

    const contactPayload = submitHasContact
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
      // Duzenleme modunda backend'in nested-create'i yok (sadece hesap
      // olusturulurken calisir) - bu yuzden edit'te yetkili kisi ayri bir
      // POST /contacts istegiyle, hesap kaydedildikten sonra eklenir.
      ...(!isEdit && contactPayload ? { contact: contactPayload } : {}),
    };

    mutation.mutate(payload, {
      onSuccess: (account) => {
        const finish = () => {
          toast.success(
            isEdit ? tr.crm.accounts.form.updateSuccess : tr.crm.accounts.form.createSuccess,
          );
          navigate(`/firmalar/${buildAccountSlug(account)}`);
        };

        if (isEdit && contactPayload) {
          createContactMutation.mutate(
            { ...contactPayload, accountId: account.id },
            {
              onSuccess: finish,
              onError: (error) => {
                toast.error(
                  error instanceof ApiError
                    ? error.message
                    : tr.crm.accounts.form.contactCreateError,
                );
                navigate(`/firmalar/${buildAccountSlug(account)}`);
              },
            },
          );
        } else {
          finish();
        }
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  });

  const apiErrorMessage = mutation.error instanceof ApiError ? mutation.error.message : undefined;

  return (
    <AppShell>
      <BackLink to={'/firmalar'} label={tr.crm.accounts.detail.back} />

      <div className="mt-6">
        <h1 className="text-lg font-bold text-app-text">
          {isEdit ? tr.crm.accounts.form.editTitle : tr.crm.accounts.form.newTitle}
        </h1>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
          <FormError message={apiErrorMessage} />
          <AccountFormFields
            register={register}
            control={control}
            setValue={setValue}
            errors={errors}
          />
          <div className="mt-1 flex gap-2">
            <Button type="submit" disabled={mutation.isPending || createContactMutation.isPending}>
              {mutation.isPending ? tr.crm.accounts.form.submitting : tr.crm.accounts.form.submit}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/firmalar')}>
              {tr.crm.accounts.form.cancel}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
