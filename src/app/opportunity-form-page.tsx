import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Button } from '../components/ui/button';
import { DateField } from '../components/ui/date-field';
import { DateTimeField } from '../components/ui/date-time-field';
import { FormError } from '../components/ui/form-error';
import { MultiSelect } from '../components/ui/multi-select';
import { Select } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { TextareaField } from '../components/ui/textarea-field';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { useAccountsQuery } from '../features/crm/use-accounts';
import { useAssignableCalendarUsersQuery } from '../features/crm/use-calendar-events';
import {
  useCreateOpportunityMutation,
  useOpportunityQuery,
  useUpdateOpportunityMutation,
} from '../features/crm/use-opportunities';
import { opportunityFormSchema, type OpportunityFormValues } from '../features/crm/schemas';
import {
  ApiError,
  type CreateOpportunityInput,
  type CurrencyCode,
  type OpportunityStage,
} from '../lib/api';
import { tr } from '../i18n/tr';

const STAGE_OPTIONS: { value: OpportunityStage; label: string }[] = (
  ['NEW', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'] as const
).map((stage) => ({ value: stage, label: tr.crm.opportunities.stageOptions[stage] }));

const CURRENCY_OPTIONS: { value: CurrencyCode; label: string }[] = (
  ['TRY', 'USD', 'EUR', 'GBP', 'CHF', 'JPY'] as const
).map((currency) => ({
  value: currency,
  label: tr.crm.opportunities.form.currencyOptions[currency],
}));

function todayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function OpportunityFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillAccountId = searchParams.get('accountId') ?? undefined;
  const toast = useToast();
  const accountsQuery = useAccountsQuery();
  const assignableUsersQuery = useAssignableCalendarUsersQuery();
  const opportunityQuery = useOpportunityQuery(id ?? '');
  const createMutation = useCreateOpportunityMutation();
  const updateMutation = useUpdateOpportunityMutation(id ?? '');
  const mutation = isEdit ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunityFormSchema),
    defaultValues: {
      accountId: prefillAccountId,
      estimatedValueCurrency: 'TRY',
      occurredAt: todayDateString(),
      hasReminder: false,
    },
  });

  const hasReminder = watch('hasReminder');

  useEffect(() => {
    if (opportunityQuery.data) {
      reset({
        accountId: opportunityQuery.data.accountId,
        name: opportunityQuery.data.name,
        stage: opportunityQuery.data.stage,
        estimatedValue: opportunityQuery.data.estimatedValue ?? undefined,
        estimatedValueCurrency: opportunityQuery.data.estimatedValueCurrency,
        description: opportunityQuery.data.description ?? undefined,
        occurredAt: opportunityQuery.data.occurredAt.slice(0, 10),
      });
    }
  }, [opportunityQuery.data, reset]);

  if (isEdit && opportunityQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-app-muted">{tr.common.loading}</p>
      </AppShell>
    );
  }

  const onSubmit = handleSubmit((values) => {
    const baseInput = {
      accountId: values.accountId,
      name: values.name,
      stage: values.stage,
      estimatedValue: values.estimatedValue ? Number(values.estimatedValue) : undefined,
      estimatedValueCurrency: values.estimatedValue ? values.estimatedValueCurrency : undefined,
      description: values.description ? values.description.trim() : undefined,
      occurredAt: new Date(values.occurredAt).toISOString(),
    };

    if (isEdit) {
      updateMutation.mutate(baseInput, {
        onSuccess: (opportunity) => {
          toast.success(tr.crm.opportunities.form.updateSuccess);
          navigate(`/firsatlar/${opportunity.id}`);
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      });
      return;
    }

    const input: CreateOpportunityInput = {
      ...baseInput,
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
        toast.success(tr.crm.opportunities.form.createSuccess);
        for (const conflict of result.reminderConflicts) {
          toast.info(
            tr.crm.opportunities.reminderConflictNotice(
              new Date(conflict.suggestedStartAt).toLocaleString('tr-TR'),
            ),
          );
        }
        navigate(`/firsatlar/${result.opportunity.id}`);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  });

  const apiErrorMessage = mutation.error instanceof ApiError ? mutation.error.message : undefined;

  return (
    <AppShell>
      <BackLink to={'/firsatlar'} label={tr.crm.opportunities.title} />

      <div className="mt-6">
        <h1 className="text-lg font-bold text-app-text">
          {isEdit ? tr.crm.opportunities.form.editTitle : tr.crm.opportunities.form.newTitle}
        </h1>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-6" noValidate>
          <FormError message={apiErrorMessage} />

          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <Select
              label={tr.crm.opportunities.form.accountLabel}
              required
              hint={tr.crm.opportunities.form.accountHint}
              error={errors.accountId?.message}
              options={(accountsQuery.data?.data ?? []).map((account) => ({
                value: account.id,
                label: account.name,
              }))}
              {...register('accountId')}
            />
            <TextField
              label={tr.crm.opportunities.form.nameLabel}
              required
              hint={tr.crm.opportunities.form.nameHint}
              error={errors.name?.message}
              {...register('name')}
            />
            <Select
              label={tr.crm.opportunities.form.stageLabel}
              hint={tr.crm.opportunities.form.stageHint}
              options={STAGE_OPTIONS}
              error={errors.stage?.message}
              {...register('stage')}
            />
            <Controller
              name="occurredAt"
              control={control}
              render={({ field }) => (
                <DateField
                  label={tr.crm.opportunities.form.occurredAtLabel}
                  required
                  hint={tr.crm.opportunities.form.occurredAtHint}
                  error={errors.occurredAt?.message}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              )}
            />
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <TextField
                  label={tr.crm.opportunities.form.valueLabel}
                  type="number"
                  step="0.01"
                  hint={tr.crm.opportunities.form.valueHint}
                  error={errors.estimatedValue?.message}
                  {...register('estimatedValue')}
                />
              </div>
              <div className="w-32">
                <Select
                  label={tr.crm.opportunities.form.currencyLabel}
                  options={CURRENCY_OPTIONS}
                  error={errors.estimatedValueCurrency?.message}
                  {...register('estimatedValueCurrency')}
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <TextareaField
                label={tr.crm.opportunities.form.descriptionLabel}
                hint={tr.crm.opportunities.form.descriptionHint}
                error={errors.description?.message}
                rows={3}
                {...register('description')}
              />
            </div>
          </div>

          {!isEdit && (
            <div className="rounded-lg border border-app-border bg-app-surface p-4">
              <Controller
                name="hasReminder"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Switch checked={field.value ?? false} onChange={field.onChange} />
                    <span className="text-sm font-semibold text-app-text">
                      {tr.crm.opportunities.form.reminderCheckboxLabel}
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
                        label={tr.crm.opportunities.form.reminderDateLabel}
                        required
                        hint={tr.crm.opportunities.form.reminderDateHint}
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
                        label={tr.crm.opportunities.form.reminderAssigneesLabel}
                        placeholder={tr.crm.opportunities.form.reminderAssigneesPlaceholder}
                        required
                        hint={tr.crm.opportunities.form.reminderAssigneesHint}
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
                    label={tr.crm.opportunities.form.reminderNoteLabel}
                    hint={tr.crm.opportunities.form.reminderNoteHint}
                    error={errors.reminderNote?.message}
                    {...register('reminderNote')}
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? tr.crm.opportunities.form.submitting
                : tr.crm.opportunities.form.submit}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/firsatlar')}>
              {tr.crm.opportunities.form.cancel}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
