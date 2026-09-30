import {
  Controller,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from 'react-hook-form';
import { Autocomplete } from '../../components/ui/autocomplete';
import { MultiSelect } from '../../components/ui/multi-select';
import { Switch } from '../../components/ui/switch';
import { TextField } from '../../components/ui/text-field';
import { PhoneField } from './phone-field';
import { LandlineField } from './landline-field';
import { DepartmentSelect } from './department-select';
import { SectorMultiSelect } from './sector-multi-select';
import { TitleSelect } from './title-select';
import type { AccountFormValues } from './schemas';
import type { AccountType } from '../../lib/api';
import { TURKISH_CITIES } from '../../lib/turkish-cities';
import { TURKISH_DISTRICTS_BY_CITY } from '../../lib/turkish-districts';
import { TURKISH_TAX_OFFICES_BY_CITY } from '../../lib/turkish-tax-offices';
import { tr } from '../../i18n/tr';

const ACCOUNT_TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: 'CUSTOMER', label: tr.crm.accounts.accountTypeOptions.CUSTOMER },
  { value: 'SUPPLIER', label: tr.crm.accounts.accountTypeOptions.SUPPLIER },
  { value: 'CONTRACTOR', label: tr.crm.accounts.accountTypeOptions.CONTRACTOR },
  { value: 'SUBCONTRACTOR', label: tr.crm.accounts.accountTypeOptions.SUBCONTRACTOR },
];

interface AccountFormFieldsProps {
  register: UseFormRegister<AccountFormValues>;
  control: Control<AccountFormValues>;
  setValue: UseFormSetValue<AccountFormValues>;
  errors: FieldErrors<AccountFormValues>;
}

/** `account-form-page.tsx` (`/firmalar/yeni`, `/firmalar/:id/duzenle`) ve
 * `new-account-modal.tsx` (teklif formundan "+ Yeni Firma") arasinda paylasilan alan
 * kumesi - `ContactFormFields`/`ProductFormFields` ile ayni desen. */
export function AccountFormFields({ register, control, setValue, errors }: AccountFormFieldsProps) {
  const taxNumberRegistration = register('taxNumber');
  const selectedCity = useWatch({ control, name: 'city' });
  const districtOptions = selectedCity ? (TURKISH_DISTRICTS_BY_CITY[selectedCity] ?? []) : [];
  const taxOfficeOptions = selectedCity ? (TURKISH_TAX_OFFICES_BY_CITY[selectedCity] ?? []) : [];
  const hasContact = useWatch({ control, name: 'hasContact' });

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
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
    </div>
  );
}
