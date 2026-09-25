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

/** occurredAt backend'den UTC ISO string olarak gelir - DateTimeField ise native
 * datetime-local input'u gibi yerel saat bekler (bkz. date-time-field.tsx). Duz
 * `.slice(0, 16)` UTC saatini oldugu gibi gosterirdi (orn. 16:55 yerine 13:55) -
 * bkz. calendar-event-form-modal.tsx'teki ayni desen (toDatetimeLocal). */
function toDatetimeLocal(iso: string): string {
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

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
        occurredAt: toDatetimeLocal(interactionQuery.data.occurredAt),
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
      <BackLink to={'/gorusmeler'} label={tr.crm.interactions.detail.back} />

      <div className="mt-6">
        <h1 className="text-lg font-bold text-app-text">{tr.crm.interactions.form.editTitle}</h1>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-6" noValidate>
          <FormError message={apiErrorMessage} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label={tr.crm.interactions.form.typeLabel}
              required
              hint={tr.crm.interactions.form.typeHint}
              options={TYPE_OPTIONS}
              error={errors.type?.message}
              {...register('type')}
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
          </div>

          <div className="flex gap-2">
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
