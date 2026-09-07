import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { Select } from '../components/ui/select';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { useAccountsQuery } from '../features/crm/use-accounts';
import { useQuotesQuery } from '../features/crm/use-quotes';
import {
  useCreateProjectMutation,
  useProjectQuery,
  useUpdateProjectMutation,
} from '../features/crm/use-projects';
import { projectFormSchema, type ProjectFormValues } from '../features/crm/schemas';
import { ApiError } from '../lib/api';
import { tr } from '../i18n/tr';

export function ProjectFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const accountsQuery = useAccountsQuery();
  const projectQuery = useProjectQuery(id ?? '');
  const createMutation = useCreateProjectMutation();
  const updateMutation = useUpdateProjectMutation(id ?? '');
  const mutation = isEdit ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProjectFormValues>({ resolver: zodResolver(projectFormSchema) });

  const selectedAccountId = watch('accountId');
  const quotesQuery = useQuotesQuery({ accountId: selectedAccountId || undefined });
  const quoteOptions = (quotesQuery.data?.data ?? []).map((quote) => ({
    value: quote.id,
    label: quote.quoteNumber,
  }));

  useEffect(() => {
    if (projectQuery.data) {
      reset({
        accountId: projectQuery.data.accountId,
        quoteId: projectQuery.data.quoteId ?? undefined,
        name: projectQuery.data.name,
        estimatedBudget: projectQuery.data.estimatedBudget,
        actualCost: projectQuery.data.actualCost ?? undefined,
      });
    }
  }, [projectQuery.data, reset]);

  if (isEdit && projectQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-app-muted">{tr.common.loading}</p>
      </AppShell>
    );
  }

  const onSubmit = handleSubmit((values) => {
    const input = {
      accountId: values.accountId,
      quoteId: values.quoteId || undefined,
      name: values.name,
      estimatedBudget: Number(values.estimatedBudget),
      actualCost: values.actualCost ? Number(values.actualCost) : undefined,
    };
    mutation.mutate(input, {
      onSuccess: (project) => {
        toast.success(
          isEdit ? tr.crm.projects.form.updateSuccess : tr.crm.projects.form.createSuccess,
        );
        navigate(`/projeler/${project.id}`);
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
        onClick={() => navigate('/projeler')}
        className="text-sm font-semibold text-app-muted hover:text-app-text"
      >
        {'←'} {tr.crm.projects.title}
      </button>

      <div className="mx-auto mt-6 max-w-xl rounded-xl border border-app-border bg-app-surface p-8">
        <h1 className="text-lg font-bold text-app-text">
          {isEdit ? tr.crm.projects.form.editTitle : tr.crm.projects.form.newTitle}
        </h1>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
          <FormError message={apiErrorMessage} />
          <Select
            label={tr.crm.projects.form.accountLabel}
            required
            hint={tr.crm.projects.form.accountHint}
            error={errors.accountId?.message}
            options={(accountsQuery.data?.data ?? []).map((account) => ({
              value: account.id,
              label: account.name,
            }))}
            {...register('accountId')}
          />
          <Select
            label={tr.crm.projects.form.quoteLabel}
            placeholder={tr.crm.projects.form.quotePlaceholder}
            hint={tr.crm.projects.form.quoteHint}
            options={quoteOptions}
            {...register('quoteId')}
          />
          <TextField
            label={tr.crm.projects.form.nameLabel}
            required
            hint={tr.crm.projects.form.nameHint}
            error={errors.name?.message}
            {...register('name')}
          />
          <TextField
            label={tr.crm.projects.form.estimatedBudgetLabel}
            required
            type="number"
            step="0.01"
            hint={tr.crm.projects.form.estimatedBudgetHint}
            error={errors.estimatedBudget?.message}
            {...register('estimatedBudget')}
          />
          <TextField
            label={tr.crm.projects.form.actualCostLabel}
            type="number"
            step="0.01"
            hint={tr.crm.projects.form.actualCostHint}
            error={errors.actualCost?.message}
            {...register('actualCost')}
          />
          <div className="mt-1 flex gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? tr.crm.projects.form.submitting : tr.crm.projects.form.submit}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/projeler')}>
              {tr.crm.projects.form.cancel}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
