import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { Select } from '../components/ui/select';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { useAccountsQuery } from '../features/crm/use-accounts';
import {
  useCreateOpportunityMutation,
  useOpportunityQuery,
  useUpdateOpportunityMutation,
} from '../features/crm/use-opportunities';
import { opportunityFormSchema, type OpportunityFormValues } from '../features/crm/schemas';
import { ApiError, type OpportunityStage } from '../lib/api';
import { tr } from '../i18n/tr';

const STAGE_OPTIONS: { value: OpportunityStage; label: string }[] = (
  ['NEW', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'] as const
).map((stage) => ({ value: stage, label: tr.crm.opportunities.stageOptions[stage] }));

export function OpportunityFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillAccountId = searchParams.get('accountId') ?? undefined;
  const toast = useToast();
  const accountsQuery = useAccountsQuery();
  const opportunityQuery = useOpportunityQuery(id ?? '');
  const createMutation = useCreateOpportunityMutation();
  const updateMutation = useUpdateOpportunityMutation(id ?? '');
  const mutation = isEdit ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunityFormSchema),
    defaultValues: { accountId: prefillAccountId },
  });

  useEffect(() => {
    if (opportunityQuery.data) {
      reset({
        accountId: opportunityQuery.data.accountId,
        name: opportunityQuery.data.name,
        stage: opportunityQuery.data.stage,
        estimatedValue: opportunityQuery.data.estimatedValue ?? undefined,
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
    const input = {
      accountId: values.accountId,
      name: values.name,
      stage: values.stage,
      estimatedValue: values.estimatedValue ? Number(values.estimatedValue) : undefined,
    };
    mutation.mutate(input, {
      onSuccess: (opportunity) => {
        toast.success(
          isEdit
            ? tr.crm.opportunities.form.updateSuccess
            : tr.crm.opportunities.form.createSuccess,
        );
        navigate(`/firsatlar/${opportunity.id}`);
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

        <form
          onSubmit={onSubmit}
          className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2"
          noValidate
        >
          <div className="sm:col-span-2">
            <FormError message={apiErrorMessage} />
          </div>
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
            {...register('stage')}
          />
          <TextField
            label={tr.crm.opportunities.form.valueLabel}
            type="number"
            step="0.01"
            hint={tr.crm.opportunities.form.valueHint}
            error={errors.estimatedValue?.message}
            {...register('estimatedValue')}
          />
          <div className="mt-1 flex gap-2 sm:col-span-2">
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
