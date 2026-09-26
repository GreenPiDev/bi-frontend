import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Autocomplete } from '../components/ui/autocomplete';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { MultiSelect } from '../components/ui/multi-select';
import { Switch } from '../components/ui/switch';
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
import { useCreateContactMutation } from '../features/crm/use-contacts';
import { DepartmentSelect } from '../features/crm/department-select';
import { SectorMultiSelect } from '../features/crm/sector-multi-select';
import { TitleSelect } from '../features/crm/title-select';
import { LandlineField } from '../features/crm/landline-field';
import { ApiError, type AccountInput, type AccountType } from '../lib/api';
import { TURKISH_CITIES } from '../lib/turkish-cities';
import { TURKISH_DISTRICTS_BY_CITY } from '../lib/turkish-districts';
import { TURKISH_TAX_OFFICES_BY_CITY } from '../lib/turkish-tax-offices';
import { tr } from '../i18n/tr';

const ACCOUNT_TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: 'CUSTOMER', label: tr.crm.accounts.accountTypeOptions.CUSTOMER },
  { value: 'SUPPLIER', label: tr.crm.accounts.accountTypeOptions.SUPPLIER },
  { value: 'CONTRACTOR', label: tr.crm.accounts.accountTypeOptions.CONTRACTOR },
  { value: 'SUBCONTRACTOR', label: tr.crm.accounts.accountTypeOptions.SUBCONTRACTOR },
];

export function AccountFormPage() {
  const { id } = useParams();
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

  const taxNumberRegistration = register('taxNumber');
  const selectedCity = useWatch({ control, name: 'city' });
  const districtOptions = selectedCity ? (TURKISH_DISTRICTS_BY_CITY[selectedCity] ?? []) : [];
  const taxOfficeOptions = selectedCity ? (TURKISH_TAX_OFFICES_BY_CITY[selectedCity] ?? []) : [];
  const hasContact = useWatch({ control, name: 'hasContact' });

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
          navigate(`/firmalar/${account.id}`);
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
                navigate(`/firmalar/${account.id}`);
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

        <form
          onSubmit={onSubmit}
          className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2"
          noValidate
        >
          <div className="sm:col-span-2">
            <FormError message={apiErrorMessage} />
          </div>
          <TextField
            label={tr.crm.accounts.form.nameLabel}
            error={errors.name?.message}
            required
            hint={tr.crm.accounts.form.nameHint}
            {...register('name')}
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
                error={errors.accountTypes?.message}
                hint={tr.crm.accounts.form.accountTypesHint}
              />
            )}
          />
          <Controller
            name="sector"
            control={control}
            render={({ field }) => (
              <SectorMultiSelect
                value={field.value ?? []}
                onChange={field.onChange}
                error={errors.sector?.message}
              />
            )}
          />
          <TextField
            label={tr.crm.accounts.form.taxNumberLabel}
            error={errors.taxNumber?.message}
            hint={tr.crm.accounts.form.taxNumberHint}
            inputMode="numeric"
            maxLength={11}
            {...taxNumberRegistration}
            onChange={(event) => {
              event.target.value = event.target.value.replace(/\D/g, '').slice(0, 11);
              taxNumberRegistration.onChange(event);
            }}
          />
          <div className="grid grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-3">
            <Controller
              name="city"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  label={tr.crm.accounts.form.cityLabel}
                  value={field.value ?? ''}
                  onChange={(value) => {
                    field.onChange(value);
                    setValue('district', '');
                    setValue('taxOffice', '');
                  }}
                  options={TURKISH_CITIES}
                  error={errors.city?.message}
                  hint={tr.crm.accounts.form.cityHint}
                />
              )}
            />
            <Controller
              name="district"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  label={tr.crm.accounts.form.districtLabel}
                  placeholder={selectedCity ? undefined : tr.crm.accounts.form.districtPlaceholder}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  options={districtOptions}
                  error={errors.district?.message}
                  hint={tr.crm.accounts.form.districtHint}
                />
              )}
            />
            <Controller
              name="taxOffice"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  label={tr.crm.accounts.form.taxOfficeLabel}
                  placeholder={selectedCity ? undefined : tr.crm.accounts.form.taxOfficePlaceholder}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  options={taxOfficeOptions}
                  error={errors.taxOffice?.message}
                  hint={tr.crm.accounts.form.taxOfficeHint}
                />
              )}
            />
          </div>
          <TextField
            label={tr.crm.accounts.form.websiteLabel}
            placeholder="https://"
            error={errors.website?.message}
            hint={tr.crm.accounts.form.websiteHint}
            {...register('website')}
          />
          <TextField
            label={tr.crm.accounts.form.emailLabel}
            type="email"
            error={errors.email?.message}
            hint={tr.crm.accounts.form.emailHint}
            {...register('email')}
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
                hint={tr.crm.accounts.form.phoneHint}
              />
            )}
          />
          <Controller
            name="landlinePhone"
            control={control}
            render={({ field }) => (
              <LandlineField
                label={tr.crm.accounts.form.landlinePhoneLabel}
                value={field.value ?? ''}
                onChange={field.onChange}
                error={errors.landlinePhone?.message}
                hint={tr.crm.accounts.form.landlinePhoneHint}
              />
            )}
          />
          <div className="sm:col-span-2">
            <TextField
              label={tr.crm.accounts.form.addressLabel}
              error={errors.address?.message}
              hint={tr.crm.accounts.form.addressHint}
              {...register('address')}
            />
          </div>
          <div className="rounded-lg border border-app-border bg-app-surface p-4 sm:col-span-2">
            <Controller
              name="hasContact"
              control={control}
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Switch checked={field.value ?? false} onChange={field.onChange} />
                  <span className="text-sm font-semibold text-app-text">
                    {tr.crm.accounts.form.contactCheckboxLabel}
                  </span>
                </div>
              )}
            />
            {hasContact && (
              <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <TextField
                  label={tr.crm.accounts.form.contactFirstNameLabel}
                  required
                  error={errors.contactFirstName?.message}
                  {...register('contactFirstName')}
                />
                <TextField
                  label={tr.crm.accounts.form.contactLastNameLabel}
                  required
                  error={errors.contactLastName?.message}
                  {...register('contactLastName')}
                />
                <Controller
                  name="contactDepartment"
                  control={control}
                  render={({ field }) => (
                    <DepartmentSelect
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      error={errors.contactDepartment?.message}
                    />
                  )}
                />
                <Controller
                  name="contactTitle"
                  control={control}
                  render={({ field }) => (
                    <TitleSelect
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      error={errors.contactTitle?.message}
                    />
                  )}
                />
                <Controller
                  name="contactPhone"
                  control={control}
                  render={({ field }) => (
                    <PhoneField
                      label={tr.crm.accounts.form.contactPhoneLabel}
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      error={errors.contactPhone?.message}
                      hint={tr.crm.accounts.form.contactPhoneHint}
                    />
                  )}
                />
                <TextField
                  label={tr.crm.accounts.form.contactExtensionLabel}
                  hint={tr.crm.accounts.form.contactExtensionHint}
                  error={errors.contactExtension?.message}
                  {...register('contactExtension')}
                />
              </div>
            )}
          </div>
          <div className="mt-1 flex gap-2 sm:col-span-2">
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
