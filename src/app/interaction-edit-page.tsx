import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Button } from '../components/ui/button';
import { DateTimeField } from '../components/ui/date-time-field';
import { FormError } from '../components/ui/form-error';
import { Select } from '../components/ui/select';
import { TextareaField } from '../components/ui/textarea-field';
import { useToast } from '../components/ui/toast-context';
import {
  useInteractionQuery,
  useUpdateInteractionMutation,
} from '../features/crm/use-interactions';
import { interactionEditFormSchema, type InteractionEditFormValues } from '../features/crm/schemas';
import { ApiError } from '../lib/api';
import { tr } from '../i18n/tr';

const TYPE_OPTIONS = (['CALL', 'VISIT', 'MEETING', 'EMAIL', 'OTHER'] as const).map((type) => ({
  value: type,
  label: tr.crm.interactions.typeOptions[type],
}));

/** Backend PATCH /interactions/:id sadece type/notes/occurredAt/status gunceller - bu yuzden
 * bu form, olusturma formunun (interaction-form-page.tsx) aksine firma/kisi/katilimci/
 * firsat/hatirlatma alanlarini icermez, sadece gercekten guncellenebilen alanlari gosterir. */
export function InteractionEditPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const interactionQuery = useInteractionQuery(id);
  const updateMutation = useUpdateInteractionMutation(id);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<InteractionEditFormValues>({
    resolver: zodResolver(interactionEditFormSchema),
  });

  useEffect(() => {
    if (interactionQuery.data) {
      reset({
        type: interactionQuery.data.type,
        notes: interactionQuery.data.notes,
        occurredAt: interactionQuery.data.occurredAt.slice(0, 16),
      });
    }
  }, [interactionQuery.data, reset]);

  if (interactionQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-app-muted">{tr.common.loading}</p>
      </AppShell>
    );
  }

  const onSubmit = handleSubmit((values) => {
    updateMutation.mutate(
      { ...values, occurredAt: new Date(values.occurredAt).toISOString() },
      {
        onSuccess: () => {
          toast.success(tr.crm.interactions.form.updateSuccess);
          navigate(`/gorusmeler/${id}`);
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  });

  const apiErrorMessage =
    updateMutation.error instanceof ApiError ? updateMutation.error.message : undefined;

  return (
    <AppShell>
      <BackLink to={`/gorusmeler/${id}`} label={tr.crm.interactions.detail.back} />

      <div className="mt-6 max-w-xl">
        <h1 className="text-lg font-bold text-app-text">{tr.crm.interactions.form.editTitle}</h1>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
          <FormError message={apiErrorMessage} />

          <Select
            label={tr.crm.interactions.form.typeLabel}
            required
            hint={tr.crm.interactions.form.typeHint}
            options={TYPE_OPTIONS}
            error={errors.type?.message}
            {...register('type')}
          />
          <TextareaField
            label={tr.crm.interactions.form.notesLabel}
            required
            rows={4}
            hint={tr.crm.interactions.form.notesHint}
            error={errors.notes?.message}
            {...register('notes')}
          />
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

          <div className="mt-1 flex gap-2">
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending
                ? tr.crm.interactions.form.submitting
                : tr.crm.interactions.form.submit}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate(`/gorusmeler/${id}`)}>
              {tr.crm.interactions.form.cancel}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
