import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { Select } from '../components/ui/select';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { PhoneField } from '../features/crm/phone-field';
import {
  cleanEmptyStrings,
  contactFormSchema,
  type ContactFormValues,
} from '../features/crm/schemas';
import { useAccountsQuery } from '../features/crm/use-accounts';
import {
  useContactQuery,
  useCreateContactMutation,
  useUpdateContactMutation,
} from '../features/crm/use-contacts';
import { ApiError } from '../lib/api';
import { tr } from '../i18n/tr';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: tr.crm.contacts.statusActive },
  { value: 'INACTIVE', label: tr.crm.contacts.statusInactive },
];

export function ContactFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const contactQuery = useContactQuery(id ?? '');
  const accountsQuery = useAccountsQuery();
  const createMutation = useCreateContactMutation();
  const updateMutation = useUpdateContactMutation(id ?? '');
  const mutation = isEdit ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: { status: 'ACTIVE' },
  });

  useEffect(() => {
    if (contactQuery.data) {
      reset({
        firstName: contactQuery.data.firstName,
        lastName: contactQuery.data.lastName,
        accountId: contactQuery.data.accountId ?? undefined,
        title: contactQuery.data.title ?? undefined,
        email: contactQuery.data.email ?? undefined,
        phone: contactQuery.data.phone ?? undefined,
        status: contactQuery.data.status,
        lastContactedAt: contactQuery.data.lastContactedAt?.slice(0, 10) ?? undefined,
      });
    }
  }, [contactQuery.data, reset]);

  if (isEdit && contactQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-app-muted">{tr.common.loading}</p>
      </AppShell>
    );
  }

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(cleanEmptyStrings(values), {
      onSuccess: (contact) => {
        toast.success(
          isEdit ? tr.crm.contacts.form.updateSuccess : tr.crm.contacts.form.createSuccess,
        );
        navigate(`/kisiler/${contact.id}`);
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
        onClick={() => navigate('/kisiler')}
        className="text-sm font-semibold text-app-muted hover:text-app-text"
      >
        {'←'} {tr.crm.accounts.detail.back}
      </button>

      <div className="mx-auto mt-6 max-w-xl rounded-xl border border-app-border bg-app-surface p-8">
        <h1 className="text-lg font-bold text-app-text">
          {isEdit ? tr.crm.contacts.form.editTitle : tr.crm.contacts.form.newTitle}
        </h1>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
          <FormError message={apiErrorMessage} />
          <TextField
            label={tr.crm.contacts.form.firstNameLabel}
            error={errors.firstName?.message}
            {...register('firstName')}
          />
          <TextField
            label={tr.crm.contacts.form.lastNameLabel}
            error={errors.lastName?.message}
            {...register('lastName')}
          />
          <Select
            label={tr.crm.contacts.form.accountLabel}
            placeholder={tr.crm.contacts.form.accountPlaceholder}
            options={(accountsQuery.data?.data ?? []).map((account) => ({
              value: account.id,
              label: account.name,
            }))}
            {...register('accountId')}
          />
          <TextField
            label={tr.crm.contacts.form.titleLabel}
            error={errors.title?.message}
            {...register('title')}
          />
          <TextField
            label={tr.crm.contacts.form.emailLabel}
            type="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <PhoneField
                label={tr.crm.contacts.form.phoneLabel}
                value={field.value ?? ''}
                onChange={field.onChange}
                error={errors.phone?.message}
              />
            )}
          />
          <Select
            label={tr.crm.contacts.form.statusLabel}
            options={STATUS_OPTIONS}
            {...register('status')}
          />
          <TextField
            label={tr.crm.contacts.form.lastContactedAtLabel}
            type="date"
            error={errors.lastContactedAt?.message}
            {...register('lastContactedAt')}
          />
          <div className="mt-1 flex gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? tr.crm.contacts.form.submitting : tr.crm.contacts.form.submit}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/kisiler')}>
              {tr.crm.contacts.form.cancel}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
