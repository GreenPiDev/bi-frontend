import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Autocomplete } from '../components/ui/autocomplete';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { MultiSelect } from '../components/ui/multi-select';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { PhoneField } from '../features/crm/phone-field';
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
import { useSectorOptionsQuery } from '../features/crm/use-sector-options';
import { ApiError, type AccountType } from '../lib/api';
import { tr } from '../i18n/tr';

const ACCOUNT_TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: 'CUSTOMER', label: tr.crm.accounts.accountTypeOptions.CUSTOMER },
  { value: 'SUPPLIER', label: tr.crm.accounts.accountTypeOptions.SUPPLIER },
];

export function AccountFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const accountQuery = useAccountQuery(id ?? '');
  const sectorOptionsQuery = useSectorOptionsQuery();
  const createMutation = useCreateAccountMutation();
  const updateMutation = useUpdateAccountMutation(id ?? '');
  const mutation = isEdit ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: { accountTypes: [] },
  });

  useEffect(() => {
    if (accountQuery.data) {
      reset({
        name: accountQuery.data.name,
        taxNumber: accountQuery.data.taxNumber ?? undefined,
        taxOffice: accountQuery.data.taxOffice ?? undefined,
        sector: accountQuery.data.sector ?? undefined,
        accountTypes: accountQuery.data.accountTypes,
        website: accountQuery.data.website ?? undefined,
        phone: accountQuery.data.phone ?? undefined,
        email: accountQuery.data.email ?? undefined,
        address: accountQuery.data.address ?? undefined,
        city: accountQuery.data.city ?? undefined,
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
    mutation.mutate(cleanEmptyStrings(values), {
      onSuccess: (account) => {
        toast.success(
          isEdit ? tr.crm.accounts.form.updateSuccess : tr.crm.accounts.form.createSuccess,
        );
        navigate(`/firmalar/${account.id}`);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  });

  const apiErrorMessage = mutation.error instanceof ApiError ? mutation.error.message : undefined;

  return (
    <AppShell>
      <button
        type="button"
        onClick={() => navigate('/firmalar')}
        className="text-sm font-semibold text-app-muted hover:text-app-text"
      >
        {'←'} {tr.crm.accounts.detail.back}
      </button>

      <div className="mx-auto mt-6 max-w-xl rounded-xl border border-app-border bg-app-surface p-8">
        <h1 className="text-lg font-bold text-app-text">
          {isEdit ? tr.crm.accounts.form.editTitle : tr.crm.accounts.form.newTitle}
        </h1>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
          <FormError message={apiErrorMessage} />
          <TextField
            label={tr.crm.accounts.form.nameLabel}
            error={errors.name?.message}
            {...register('name')}
          />
          <TextField
            label={tr.crm.accounts.form.taxNumberLabel}
            error={errors.taxNumber?.message}
            {...register('taxNumber')}
          />
          <TextField
            label={tr.crm.accounts.form.taxOfficeLabel}
            error={errors.taxOffice?.message}
            {...register('taxOffice')}
          />
          <Controller
            name="sector"
            control={control}
            render={({ field }) => (
              <Autocomplete
                label={tr.crm.accounts.form.sectorLabel}
                placeholder={tr.crm.accounts.form.sectorPlaceholder}
                value={field.value ?? ''}
                onChange={field.onChange}
                options={(sectorOptionsQuery.data ?? []).map((option) => option.label)}
                error={errors.sector?.message}
              />
            )}
          />
          <Controller
            name="accountTypes"
            control={control}
            render={({ field }) => (
              <MultiSelect
                label={tr.crm.accounts.form.accountTypesLabel}
                placeholder={tr.crm.accounts.form.accountTypesPlaceholder}
                value={field.value ?? []}
                onChange={(value) => field.onChange(value as AccountType[])}
                options={ACCOUNT_TYPE_OPTIONS}
              />
            )}
          />
          <TextField
            label={tr.crm.accounts.form.websiteLabel}
            placeholder="https://"
            error={errors.website?.message}
            {...register('website')}
          />
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <PhoneField
                label={tr.crm.accounts.form.phoneLabel}
                value={field.value ?? ''}
                onChange={field.onChange}
                error={errors.phone?.message}
              />
            )}
          />
          <TextField
            label={tr.crm.accounts.form.emailLabel}
            type="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <TextField
            label={tr.crm.accounts.form.addressLabel}
            error={errors.address?.message}
            {...register('address')}
          />
          <TextField
            label={tr.crm.accounts.form.cityLabel}
            error={errors.city?.message}
            {...register('city')}
          />
          <div className="mt-1 flex gap-2">
            <Button type="submit" disabled={mutation.isPending}>
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
