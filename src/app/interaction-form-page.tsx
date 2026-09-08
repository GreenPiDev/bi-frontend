import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Autocomplete } from '../components/ui/autocomplete';
import { Button } from '../components/ui/button';
import { DateTimeField } from '../components/ui/date-time-field';
import { FormError } from '../components/ui/form-error';
import { MultiSelect } from '../components/ui/multi-select';
import { Select } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { useAccountsQuery } from '../features/crm/use-accounts';
import { useContactsQuery } from '../features/crm/use-contacts';
import { useAssignableCalendarUsersQuery } from '../features/crm/use-calendar-events';
import { useCreateInteractionMutation } from '../features/crm/use-interactions';
import { interactionFormSchema, type InteractionFormValues } from '../features/crm/schemas';
import { ApiError, type CreateInteractionInput, type OpportunityStage } from '../lib/api';
import { tr } from '../i18n/tr';

const TYPE_OPTIONS = (['CALL', 'VISIT', 'MEETING', 'EMAIL', 'OTHER'] as const).map((type) => ({
  value: type,
  label: tr.crm.interactions.typeOptions[type],
}));

const STAGE_OPTIONS: { value: OpportunityStage; label: string }[] = (
  ['NEW', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'] as const
).map((stage) => ({ value: stage, label: tr.crm.opportunities.stageOptions[stage] }));

export function InteractionFormPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const accountsQuery = useAccountsQuery();
  const contactsQuery = useContactsQuery();
  const assignableUsersQuery = useAssignableCalendarUsersQuery();
  const createMutation = useCreateInteractionMutation();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<InteractionFormValues>({
    resolver: zodResolver(interactionFormSchema),
    defaultValues: {
      type: 'CALL',
      participants: [],
      hasOpportunity: false,
      hasReminder: false,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'participants' });

  const accountNameValue = watch('accountName') ?? '';
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
            },
          }
        : {}),
      ...(values.hasReminder && values.reminderStartAt
        ? {
            reminder: {
              startAt: new Date(values.reminderStartAt).toISOString(),
              assignees: (values.reminderAssigneeUserIds ?? []).map((userId) => ({
                userId,
                note: values.reminderNote || undefined,
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
      <button
        type="button"
        onClick={() => navigate('/gorusmeler')}
        className="text-sm font-semibold text-app-muted hover:text-app-text"
      >
        {'←'} {tr.crm.interactions.detail.back}
      </button>

      <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-app-border bg-app-surface p-8">
        <h1 className="text-lg font-bold text-app-text">{tr.crm.interactions.form.newTitle}</h1>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-6" noValidate>
          <FormError message={apiErrorMessage} />

          <div className="flex flex-col gap-4">
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
                />
              )}
            />
            <Select
              label={tr.crm.interactions.form.typeLabel}
              required
              hint={tr.crm.interactions.form.typeHint}
              options={TYPE_OPTIONS}
              {...register('type')}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-app-muted">
                {tr.crm.interactions.form.notesLabel}
                <span className="ml-0.5 text-app-danger" aria-hidden="true">
                  *
                </span>
              </label>
              <textarea
                rows={4}
                className="rounded-lg border border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
                {...register('notes')}
              />
              {errors.notes ? (
                <FormError message={errors.notes.message} />
              ) : (
                <p className="text-xs text-app-muted">{tr.crm.interactions.form.notesHint}</p>
              )}
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
                />
              )}
            />
          </div>

          <div className="rounded-lg border border-app-border p-4">
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
                  {...register('opportunityStage')}
                />
                <TextField
                  type="number"
                  step="0.01"
                  label={tr.crm.interactions.form.opportunityValueLabel}
                  hint={tr.crm.interactions.form.opportunityValueHint}
                  {...register('opportunityValue')}
                />
              </div>
            )}
          </div>

          <div className="rounded-lg border border-app-border p-4">
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

          <div className="rounded-lg border border-app-border p-4">
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
                  label={tr.crm.interactions.form.reminderNoteLabel}
                  hint={tr.crm.interactions.form.reminderNoteHint}
                  {...register('reminderNote')}
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
    </AppShell>
  );
}
