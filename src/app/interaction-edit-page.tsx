import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Autocomplete } from '../components/ui/autocomplete';
import { BackLink } from '../components/ui/back-link';
import { Button } from '../components/ui/button';
import { DateTimeField } from '../components/ui/date-time-field';
import { FormError } from '../components/ui/form-error';
import { Switch } from '../components/ui/switch';
import { TextareaField } from '../components/ui/textarea-field';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { InteractionTypeSelect } from '../features/crm/interaction-type-select';
import { useAssignableCalendarUsersQuery } from '../features/crm/use-calendar-events';
import {
  useInteractionQuery,
  useUpdateInteractionMutation,
} from '../features/crm/use-interactions';
import { interactionEditFormSchema, type InteractionEditFormValues } from '../features/crm/schemas';
import { ApiError } from '../lib/api';
import { tr } from '../i18n/tr';

/** occurredAt backend'den UTC ISO string olarak gelir - DateTimeField ise native
 * datetime-local input'u gibi yerel saat bekler (bkz. date-time-field.tsx). Duz
 * `.slice(0, 16)` UTC saatini oldugu gibi gosterirdi (orn. 16:55 yerine 13:55) -
 * bkz. calendar-event-form-modal.tsx'teki ayni desen (toDatetimeLocal). */
function toDatetimeLocal(iso: string): string {
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

/** Backend PATCH /interactions/:id sadece type/notes/occurredAt/status/participants gunceller -
 * bu yuzden bu form, olusturma formunun (interaction-form-page.tsx) aksine firsat/hatirlatma
 * alanlarini icermez. Firma/Gorusulen Kisi degistirilemez ama baglami gormek icin salt
 * okunur (readOnly+disabled, forma submit edilmez) olarak gosterilir. "Diger Katilimcilar"
 * (M10) ise create formuyla ayni Autocomplete/Switch deseniyle duzenlenebilir. */
export function InteractionEditPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const interactionQuery = useInteractionQuery(id);
  const updateMutation = useUpdateInteractionMutation(id);
  const assignableUsersQuery = useAssignableCalendarUsersQuery();

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<InteractionEditFormValues>({
    resolver: zodResolver(interactionEditFormSchema),
    defaultValues: { participants: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'participants' });

  useEffect(() => {
    if (interactionQuery.data) {
      reset({
        type: interactionQuery.data.type,
        subject: interactionQuery.data.subject ?? undefined,
        notes: interactionQuery.data.notes ?? undefined,
        occurredAt: toDatetimeLocal(interactionQuery.data.occurredAt),
        participants: interactionQuery.data.participants.map((participant) => ({
          name: participant.name,
          isInternal: participant.isInternal,
          note: participant.note ?? '',
        })),
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
      {
        ...values,
        occurredAt: new Date(values.occurredAt).toISOString(),
        participants: (values.participants ?? [])
          .filter((p) => p.name.trim().length > 0)
          .map((p) => ({ name: p.name, isInternal: p.isInternal, note: p.note || undefined })),
      },
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
            <TextField
              label={tr.crm.interactions.form.accountLabel}
              value={interactionQuery.data?.account?.name ?? ''}
              readOnly
              disabled
            />
            <TextField
              label={tr.crm.interactions.form.contactLabel}
              value={
                interactionQuery.data?.contact
                  ? `${interactionQuery.data.contact.firstName} ${interactionQuery.data.contact.lastName}`
                  : ''
              }
              readOnly
              disabled
            />
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <InteractionTypeSelect
                  label={tr.crm.interactions.form.typeLabel}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  error={errors.type?.message}
                />
              )}
            />
            <TextField
              label={tr.crm.interactions.form.subjectLabel}
              hint={tr.crm.interactions.form.subjectHint}
              error={errors.subject?.message}
              {...register('subject')}
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
                rows={4}
                hint={tr.crm.interactions.form.notesHint}
                error={errors.notes?.message}
                {...register('notes')}
              />
            </div>
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
                    <div className="flex-1">
                      <TextField
                        label={tr.crm.interactions.form.participantNoteLabel}
                        {...register(`participants.${index}.note` as const)}
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
