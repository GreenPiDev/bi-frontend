import { Controller, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import { DateField } from '../../components/ui/date-field';
import { Select } from '../../components/ui/select';
import { TextField } from '../../components/ui/text-field';
import { AccountAutocomplete } from './account-autocomplete';
import { DepartmentSelect } from './department-select';
import { PhoneField } from './phone-field';
import type { ContactFormValues } from './schemas';
import { TitleSelect } from './title-select';
import { tr } from '../../i18n/tr';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: tr.crm.contacts.statusActive },
  { value: 'INACTIVE', label: tr.crm.contacts.statusInactive },
];

interface ContactFormFieldsProps {
  register: UseFormRegister<ContactFormValues>;
  control: Control<ContactFormValues>;
  errors: FieldErrors<ContactFormValues>;
}

export function ContactFormFields({ register, control, errors }: ContactFormFieldsProps) {
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
          <DepartmentSelect
            value={field.value ?? ''}
            onChange={field.onChange}
            error={errors.department?.message}
          />
        )}
      />
      <Controller
        name="title"
        control={control}
        render={({ field }) => (
          <TitleSelect
            value={field.value ?? ''}
            onChange={field.onChange}
            error={errors.title?.message}
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
