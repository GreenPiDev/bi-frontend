import { Controller, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import { Autocomplete } from '../../components/ui/autocomplete';
import { DateField } from '../../components/ui/date-field';
import { Select } from '../../components/ui/select';
import { TextField } from '../../components/ui/text-field';
import { AccountAutocomplete } from './account-autocomplete';
import { PhoneField } from './phone-field';
import type { ContactFormValues } from './schemas';
import type { useDepartmentOptionsQuery } from './use-department-options';
import type { useTitleOptionsQuery } from './use-title-options';
import { tr } from '../../i18n/tr';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: tr.crm.contacts.statusActive },
  { value: 'INACTIVE', label: tr.crm.contacts.statusInactive },
];

interface ContactFormFieldsProps {
  register: UseFormRegister<ContactFormValues>;
  control: Control<ContactFormValues>;
  errors: FieldErrors<ContactFormValues>;
  departmentOptionsQuery: ReturnType<typeof useDepartmentOptionsQuery>;
  titleOptionsQuery: ReturnType<typeof useTitleOptionsQuery>;
}

export function ContactFormFields({
  register,
  control,
  errors,
  departmentOptionsQuery,
  titleOptionsQuery,
}: ContactFormFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      <TextField
        label={tr.crm.contacts.form.firstNameLabel}
        required
        hint={tr.crm.contacts.form.firstNameHint}
        error={errors.firstName?.message}
        {...register('firstName')}
      />
      <TextField
        label={tr.crm.contacts.form.lastNameLabel}
        required
        hint={tr.crm.contacts.form.lastNameHint}
        error={errors.lastName?.message}
        {...register('lastName')}
      />
      <Controller
        name="accountId"
        control={control}
        render={({ field }) => (
          <AccountAutocomplete
            label={tr.crm.contacts.form.accountLabel}
            placeholder={tr.crm.contacts.form.accountPlaceholder}
            hint={tr.crm.contacts.form.accountHint}
            value={field.value}
            onChange={field.onChange}
            error={errors.accountId?.message}
          />
        )}
      />
      <Controller
        name="department"
        control={control}
        render={({ field }) => (
          <Autocomplete
            label={tr.crm.contacts.form.departmentLabel}
            placeholder={tr.crm.contacts.form.departmentPlaceholder}
            value={field.value ?? ''}
            onChange={field.onChange}
            options={(departmentOptionsQuery.data ?? []).map((option) => option.label)}
            error={errors.department?.message}
            hint={
              (departmentOptionsQuery.data?.length ?? 0) > 0
                ? tr.crm.contacts.form.departmentHintRestricted
                : tr.crm.contacts.form.departmentHintFree
            }
          />
        )}
      />
      <Controller
        name="title"
        control={control}
        render={({ field }) => (
          <Autocomplete
            label={tr.crm.contacts.form.titleLabel}
            placeholder={tr.crm.contacts.form.titlePlaceholder}
            value={field.value ?? ''}
            onChange={field.onChange}
            options={(titleOptionsQuery.data ?? []).map((option) => option.label)}
            error={errors.title?.message}
            hint={
              (titleOptionsQuery.data?.length ?? 0) > 0
                ? tr.crm.contacts.form.titleHintRestricted
                : tr.crm.contacts.form.titleHintFree
            }
          />
        )}
      />
      <TextField
        label={tr.crm.contacts.form.emailLabel}
        type="email"
        hint={tr.crm.contacts.form.emailHint}
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
            hint={tr.crm.contacts.form.phoneHint}
            error={errors.phone?.message}
          />
        )}
      />
      <TextField
        label={tr.crm.contacts.form.extensionLabel}
        hint={tr.crm.contacts.form.extensionHint}
        error={errors.extension?.message}
        {...register('extension')}
      />
      <Select
        label={tr.crm.contacts.form.statusLabel}
        hint={tr.crm.contacts.form.statusHint}
        options={STATUS_OPTIONS}
        error={errors.status?.message}
        {...register('status')}
      />
      <Controller
        name="lastContactedAt"
        control={control}
        render={({ field }) => (
          <DateField
            label={tr.crm.contacts.form.lastContactedAtLabel}
            hint={tr.crm.contacts.form.lastContactedAtHint}
            error={errors.lastContactedAt?.message}
            value={field.value ?? ''}
            onChange={field.onChange}
          />
        )}
      />
    </div>
  );
}
