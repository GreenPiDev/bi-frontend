import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Autocomplete } from '../components/ui/autocomplete';
import { Button } from '../components/ui/button';
import { DateTimeField } from '../components/ui/date-time-field';
import { FormError } from '../components/ui/form-error';
import { MultiSelect } from '../components/ui/multi-select';
import { Select } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { TextareaField } from '../components/ui/textarea-field';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { NewContactModal } from '../features/crm/new-contact-modal';
import { useAccountQuery, useAccountsQuery } from '../features/crm/use-accounts';
import { useContactsQuery } from '../features/crm/use-contacts';
import { useAssignableCalendarUsersQuery } from '../features/crm/use-calendar-events';
import { useCreateInteractionMutation } from '../features/crm/use-interactions';
import { interactionFormSchema, type InteractionFormValues } from '../features/crm/schemas';
import {
  ApiError,
  type CreateInteractionInput,
  type CurrencyCode,
  type OpportunityStage,
} from '../lib/api';
import { useDebouncedValue } from '../lib/use-debounced-value';
import { tr } from '../i18n/tr';

const ACCOUNT_SEARCH_PAGE_SIZE = 20;

const TYPE_OPTIONS = (['CALL', 'VISIT', 'MEETING', 'EMAIL', 'OTHER'] as const).map((type) => ({
  value: type,
  label: tr.crm.interactions.typeOptions[type],
}));

const STAGE_OPTIONS: { value: OpportunityStage; label: string }[] = (
  ['NEW', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'] as const
).map((stage) => ({ value: stage, label: tr.crm.opportunities.stageOptions[stage] }));

const CURRENCY_OPTIONS: { value: CurrencyCode; label: string }[] = (
  ['TRY', 'USD', 'EUR', 'GBP', 'CHF', 'JPY'] as const
).map((currency) => ({
  value: currency,
  label: tr.crm.opportunities.form.currencyOptions[currency],
}));

export function InteractionFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillAccountId = searchParams.get('accountId');
  const toast = useToast();
  const contactsQuery = useContactsQuery();
  const assignableUsersQuery = useAssignableCalendarUsersQuery();
  const createMutation = useCreateInteractionMutation();
  const [isNewContactModalOpen, setIsNewContactModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InteractionFormValues>({
    resolver: zodResolver(interactionFormSchema),
    defaultValues: {
      type: 'CALL',
      participants: [],
      hasOpportunity: false,
      opportunityValueCurrency: 'TRY',
      hasReminder: false,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'participants' });

  // prefillAccountId'nin adini coz - sayfalanmis/aramali accountsQuery'nin o an yuklu
  // sayfasinda olmayabilecegi icin dogrudan getById ile cekilir (bkz. asagidaki not).
  const prefillAccountQuery = useAccountQuery(prefillAccountId ?? '');
  useEffect(() => {
    if (prefillAccountQuery.data) {
      setValue('accountName', prefillAccountQuery.data.name);
    }
  }, [prefillAccountQuery.data, setValue]);

  const accountNameValue = watch('accountName') ?? '';
  // Firma onerileri ve esleme, yazilan metne gore SUNUCUDAN aranir - sabit ilk sayfa
  // (varsayilan isim-alfabetik siralama) yerine, boylece "A" ile baslamayan bir firma
  // adi yazildiginda da (orn. "Demsan") o firma bulunabilir ve M2'nin "zaten var olan
  // firmayi tekrar olusturma" garantisi de dogru calisir.
  const debouncedAccountName = useDebouncedValue(accountNameValue);
  const accountsQuery = useAccountsQuery({
    q: debouncedAccountName || undefined,
    pageSize: ACCOUNT_SEARCH_PAGE_SIZE,
  });
  const matchedAccount = (accountsQuery.data?.data ?? []).find(
    (account) => account.name.toLowerCase() === accountNameValue.trim().toLowerCase(),
  );
  const contactSuggestions = (contactsQuery.data?.data ?? [])
    .filter((contact) => !matchedAccount || contact.account?.id === matchedAccount.id)
    .map((contact) => `${contact.firstName} ${contact.lastName}`);

  const hasOpportunity = watch('hasOpportunity');
  const hasReminder = watch('hasReminder');

  const onSubmit = handleSubmit((values) => {
    const accountName = values.accountName?.trim();
    const contactName = values.contactName?.trim();
    const matchedContact = contactName
      ? (contactsQuery.data?.data ?? []).find(
          (contact) =>
            `${contact.firstName} ${contact.lastName}`.toLowerCase() === contactName.toLowerCase(),
        )
      : undefined;

    const input: CreateInteractionInput = {
      ...(accountName ? (matchedAccount ? { accountId: matchedAccount.id } : { accountName }) : {}),
      ...(contactName ? (matchedContact ? { contactId: matchedContact.id } : { contactName }) : {}),
      type: values.type,
      notes: values.notes,
      occurredAt: new Date(values.occurredAt).toISOString(),
      participants: (values.participants ?? [])
        .filter((p) => p.name.trim().length > 0)
        .map((p) => ({ name: p.name, isInternal: p.isInternal, note: p.note || undefined })),
      ...(values.hasOpportunity && values.opportunityName
        ? {
            opportunity: {
              name: values.opportunityName,
              stage: values.opportunityStage,
              estimatedValue: values.opportunityValue ? Number(values.opportunityValue) : undefined,
              estimatedValueCurrency: values.opportunityValue
                ? values.opportunityValueCurrency
                : undefined,
            },
          }
        : {}),
      ...(values.hasReminder && values.reminderStartAt && values.reminderTitle
        ? {
            reminder: {
              startAt: new Date(values.reminderStartAt).toISOString(),
              title: values.reminderTitle,
              description: values.reminderDescription || undefined,
              assignees: (values.reminderAssigneeUserIds ?? []).map((userId) => ({
                userId,
              })),
            },
          }
        : {}),
    };

    createMutation.mutate(input, {
      onSuccess: (result) => {
        toast.success(tr.crm.interactions.form.createSuccess);
        if (result.interaction.accountAutoCreated && result.interaction.account) {
          toast.info(tr.crm.interactions.accountAutoCreatedNotice(result.interaction.account.name));
        }
        if (result.interaction.contactAutoCreated && result.interaction.contact) {
          toast.info(
            tr.crm.interactions.contactAutoCreatedNotice(
              `${result.interaction.contact.firstName} ${result.interaction.contact.lastName}`,
            ),
          );
        }
        for (const conflict of result.reminderConflicts) {
          toast.info(
            tr.crm.interactions.reminderConflictNotice(
              new Date(conflict.suggestedStartAt).toLocaleString('tr-TR'),
            ),
          );
        }
        navigate(`/gorusmeler/${result.interaction.id}`);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  });

  const apiErrorMessage =
    createMutation.error instanceof ApiError ? createMutation.error.message : undefined;

  return (
    <AppShell>
      <BackLink to={'/gorusmeler'} label={tr.crm.interactions.detail.back} />

      <div className="mt-6">
        <h1 className="text-lg font-bold text-app-text">{tr.crm.interactions.form.newTitle}</h1>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-6" noValidate>
          <FormError message={apiErrorMessage} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Controller
              name="accountName"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  label={tr.crm.interactions.form.accountLabel}
                  placeholder={tr.crm.interactions.form.accountPlaceholder}
                  hint={tr.crm.interactions.form.accountHint}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  options={(accountsQuery.data?.data ?? []).map((account) => account.name)}
                  error={errors.accountName?.message}
                />
              )}
            />
            <Controller
              name="contactName"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  label={tr.crm.interactions.form.contactLabel}
                  placeholder={tr.crm.interactions.form.contactPlaceholder}
                  hint={tr.crm.interactions.form.contactHint}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  options={contactSuggestions}
                  error={errors.contactName?.message}
                  trailingAction={
                    <Button
                      type="button"
                      variant="navy"
                      className="shrink-0"
                      onClick={() => setIsNewContactModalOpen(true)}
                    >
                      {tr.crm.interactions.form.newContactButton}
                    </Button>
                  }
                />
              )}
            />
            <Select
              label={tr.crm.interactions.form.typeLabel}
              required
              hint={tr.crm.interactions.form.typeHint}
              options={TYPE_OPTIONS}
              error={errors.type?.message}
              {...register('type')}
            />
            <div className="sm:col-span-2">
              <TextareaField
                label={tr.crm.interactions.form.notesLabel}
                required
                rows={4}
                hint={tr.crm.interactions.form.notesHint}
                error={errors.notes?.message}
                {...register('notes')}
              />
            </div>
            <Controller
              name="occurredAt"
              control={control}
              render={({ field }) => (
                <DateTimeField
                  label={tr.crm.interactions.form.occurredAtLabel}
                  required
                  hint={tr.crm.interactions.form.occurredAtHint}
                  error={errors.occurredAt?.message}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  disableFutureDates
                />
              )}
            />
          </div>

          <div className="rounded-lg border border-app-border bg-app-surface p-4">
            <Controller
              name="hasOpportunity"
              control={control}
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Switch checked={field.value ?? false} onChange={field.onChange} />
                  <span className="text-sm font-semibold text-app-text">
                    {tr.crm.interactions.form.opportunityCheckboxLabel}
                  </span>
                </div>
              )}
            />
            {hasOpportunity && (
              <div className="mt-4 flex flex-col gap-4">
                <TextField
                  label={tr.crm.interactions.form.opportunityNameLabel}
                  required
                  hint={tr.crm.interactions.form.opportunityNameHint}
                  error={errors.opportunityName?.message}
                  {...register('opportunityName')}
                />
                <Select
                  label={tr.crm.interactions.form.opportunityStageLabel}
                  hint={tr.crm.interactions.form.opportunityStageHint}
                  options={STAGE_OPTIONS}
                  error={errors.opportunityStage?.message}
                  {...register('opportunityStage')}
                />
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <TextField
                      type="number"
                      step="0.01"
                      label={tr.crm.interactions.form.opportunityValueLabel}
                      hint={tr.crm.interactions.form.opportunityValueHint}
                      error={errors.opportunityValue?.message}
                      {...register('opportunityValue')}
                    />
                  </div>
                  <div className="w-32">
                    <Select
                      label={tr.crm.opportunities.form.currencyLabel}
                      options={CURRENCY_OPTIONS}
                      error={errors.opportunityValueCurrency?.message}
                      {...register('opportunityValueCurrency')}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-app-border bg-app-surface p-4">
            <span className="text-sm font-semibold text-app-text">
              {tr.crm.interactions.form.participantsSectionTitle}
            </span>
            <div className="mt-3 flex flex-col gap-3">
              {fields.map((field, index) => {
                const isInternal = watch(`participants.${index}.isInternal` as const);
                return (
                  <div key={field.id} className="flex items-end gap-2">
                    <div className="flex-1">
                      <Controller
                        name={`participants.${index}.name` as const}
                        control={control}
                        render={({ field: nameField }) => (
                          <Autocomplete
                            label={tr.crm.interactions.form.participantNamePlaceholder}
                            value={nameField.value ?? ''}
                            onChange={nameField.onChange}
                            options={
                              isInternal
                                ? (assignableUsersQuery.data ?? []).map((user) => user.name)
                                : []
                            }
                          />
                        )}
                      />
                    </div>
                    <Controller
                      name={`participants.${index}.isInternal` as const}
                      control={control}
                      render={({ field: internalField }) => (
                        <div className="flex items-center gap-1.5 pb-2.5">
                          <Switch
                            checked={internalField.value ?? false}
                            onChange={internalField.onChange}
                          />
                          <span className="text-xs text-app-muted">
                            {tr.crm.interactions.form.participantInternalLabel}
                          </span>
                        </div>
                      )}
                    />
                    <Button type="button" variant="secondary" onClick={() => remove(index)}>
                      {tr.crm.interactions.form.removeParticipant}
                    </Button>
                  </div>
                );
              })}
              <Button
                type="button"
                variant="secondary"
                onClick={() => append({ name: '', isInternal: false, note: '' })}
              >
                {tr.crm.interactions.form.addParticipant}
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-app-border bg-app-surface p-4">
            <Controller
              name="hasReminder"
              control={control}
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Switch checked={field.value ?? false} onChange={field.onChange} />
                  <span className="text-sm font-semibold text-app-text">
                    {tr.crm.interactions.form.reminderCheckboxLabel}
                  </span>
                </div>
              )}
            />
            {hasReminder && (
              <div className="mt-4 flex flex-col gap-4">
                <Controller
                  name="reminderStartAt"
                  control={control}
                  render={({ field }) => (
                    <DateTimeField
                      label={tr.crm.interactions.form.reminderDateLabel}
                      required
                      hint={tr.crm.interactions.form.reminderDateHint}
                      error={errors.reminderStartAt?.message}
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                  )}
                />
                <Controller
                  name="reminderAssigneeUserIds"
                  control={control}
                  render={({ field }) => (
                    <MultiSelect
                      label={tr.crm.interactions.form.reminderAssigneesLabel}
                      placeholder={tr.crm.interactions.form.reminderAssigneesPlaceholder}
                      required
                      hint={tr.crm.interactions.form.reminderAssigneesHint}
                      value={field.value ?? []}
                      onChange={field.onChange}
                      options={(assignableUsersQuery.data ?? []).map((user) => ({
                        value: user.id,
                        label: user.name,
                      }))}
                      error={errors.reminderAssigneeUserIds?.message}
                    />
                  )}
                />
                <TextField
                  label={tr.crm.interactions.form.reminderTitleLabel}
                  required
                  hint={tr.crm.interactions.form.reminderTitleHint}
                  error={errors.reminderTitle?.message}
                  {...register('reminderTitle')}
                />
                <TextareaField
                  label={tr.crm.interactions.form.reminderDescriptionLabel}
                  rows={3}
                  hint={tr.crm.interactions.form.reminderDescriptionHint}
                  error={errors.reminderDescription?.message}
                  {...register('reminderDescription')}
                />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending
                ? tr.crm.interactions.form.submitting
                : tr.crm.interactions.form.submit}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/gorusmeler')}>
              {tr.crm.interactions.form.cancel}
            </Button>
          </div>
        </form>
      </div>

      {isNewContactModalOpen && (
        <NewContactModal
          defaultFirstName={watch('contactName') ?? ''}
          onClose={() => setIsNewContactModalOpen(false)}
          onCreated={(contact) => {
            setValue('contactName', `${contact.firstName} ${contact.lastName}`);
            if (!accountNameValue && contact.account) {
              setValue('accountName', contact.account.name);
            }
            setIsNewContactModalOpen(false);
          }}
        />
      )}
    </AppShell>
  );
}
