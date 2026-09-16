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
  const [searchParams] = useSearchParams();
  const prefillAccountId = searchParams.get('accountId') ?? undefined;
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
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: { accountId: prefillAccountId },
  });

  const estimatedBudgetField = register('estimatedBudget');
  const actualCostField = register('actualCost');

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
      <BackLink to={'/projeler'} label={tr.crm.projects.title} />

      <div className="mt-6">
        <h1 className="text-lg font-bold text-app-text">
          {isEdit ? tr.crm.projects.form.editTitle : tr.crm.projects.form.newTitle}
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
            type="text"
            inputMode="decimal"
            hint={tr.crm.projects.form.estimatedBudgetHint}
            error={errors.estimatedBudget?.message}
            {...estimatedBudgetField}
            onChange={(event) => {
              event.target.value = event.target.value.replace(/[^0-9.]/g, '');
              estimatedBudgetField.onChange(event);
            }}
          />
          <TextField
            label={tr.crm.projects.form.actualCostLabel}
            type="text"
            inputMode="decimal"
            hint={tr.crm.projects.form.actualCostHint}
            error={errors.actualCost?.message}
            {...actualCostField}
            onChange={(event) => {
              event.target.value = event.target.value.replace(/[^0-9.]/g, '');
              actualCostField.onChange(event);
            }}
          />
          <div className="mt-1 flex gap-2 sm:col-span-2">
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
