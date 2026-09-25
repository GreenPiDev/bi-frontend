import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '../components/ui/button';
import { DateTimeField } from '../components/ui/date-time-field';
import { Modal } from '../components/ui/modal';
import { MultiSelect } from '../components/ui/multi-select';
import { TextareaField } from '../components/ui/textarea-field';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { calendarEventFormSchema, type CalendarEventFormValues } from '../features/crm/schemas';
import {
  useAssignableCalendarUsersQuery,
  useCreateCalendarEventMutation,
  useUpdateCalendarEventMutation,
} from '../features/crm/use-calendar-events';
import { ApiError, type CalendarEvent } from '../lib/api';
import { tr } from '../i18n/tr';

function toDatetimeLocal(iso: string): string {
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

interface CalendarEventFormModalProps {
  /** Duzenleme modu icin mevcut etkinlik; olusturma modunda undefined. */
  event?: CalendarEvent;
  /** Yeni etkinlik olustururken ay/gun tikinden gelen varsayilan baslangic. */
  defaultStart?: Date;
  onClose: () => void;
}

export function CalendarEventFormModal({
  event,
  defaultStart,
  onClose,
}: CalendarEventFormModalProps) {
  const isEdit = Boolean(event);
  const toast = useToast();
  const assignableUsersQuery = useAssignableCalendarUsersQuery();
  const createMutation = useCreateCalendarEventMutation();
  const updateMutation = useUpdateCalendarEventMutation(event?.id ?? '');
  const mutation = isEdit ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CalendarEventFormValues>({
    resolver: zodResolver(calendarEventFormSchema),
    defaultValues: event
      ? {
          title: event.title,
          description: event.description ?? undefined,
          startAt: toDatetimeLocal(event.startAt),
          attendeeUserIds: event.attendees.map((a) => a.userId),
        }
      : {
          title: '',
          startAt: defaultStart ? toDatetimeLocal(defaultStart.toISOString()) : '',
          attendeeUserIds: [],
        },
  });

  function onSubmit(values: CalendarEventFormValues) {
    const startAt = new Date(values.startAt).toISOString();
    const input = {
      title: values.title,
      description: values.description || undefined,
      startAt,
      endAt: startAt,
      allDay: false,
      attendees: (values.attendeeUserIds ?? []).map((userId) => ({ userId })),
    };
    mutation.mutate(input, {
      onSuccess: () => {
        toast.success(
          isEdit ? tr.crm.calendar.form.updateSuccess : tr.crm.calendar.form.createSuccess,
        );
        onClose();
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.crm.calendar.deleteError);
      },
    });
  }

  return (
    <Modal
      title={isEdit ? tr.crm.calendar.form.editTitle : tr.crm.calendar.form.newTitle}
      onClose={onClose}
      width="lg"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            {tr.crm.calendar.form.cancel}
          </Button>
          <Button type="submit" form="calendar-event-form" disabled={mutation.isPending}>
            {mutation.isPending ? tr.crm.calendar.form.submitting : tr.crm.calendar.form.submit}
          </Button>
        </>
      }
    >
      <form
        id="calendar-event-form"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <TextField
          label={tr.crm.calendar.form.titleLabel}
          error={errors.title?.message}
          hint="En az 2, en fazla 200 karakter olmalı."
          required
          {...register('title')}
        />
        <TextareaField
          label={tr.crm.calendar.form.descriptionLabel}
          rows={3}
          error={errors.description?.message}
          hint="Opsiyonel, en fazla 2000 karakter."
          {...register('description')}
        />
        <Controller
          name="startAt"
          control={control}
          render={({ field }) => (
            <DateTimeField
              label={tr.crm.calendar.form.startLabel}
              error={errors.startAt?.message}
              hint="Etkinliğin tarih ve saati."
              required
              value={field.value ?? ''}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          name="attendeeUserIds"
          control={control}
          render={({ field }) => (
            <MultiSelect
              label={tr.crm.calendar.form.attendeesLabel}
              placeholder={tr.crm.calendar.form.attendeesPlaceholder}
              value={field.value ?? []}
              onChange={field.onChange}
              options={(assignableUsersQuery.data ?? []).map((user) => ({
                value: user.id,
                label: user.name,
              }))}
              error={errors.attendeeUserIds?.message}
              hint="Opsiyonel, en fazla 50 kişi seçebilirsiniz."
            />
          )}
        />
      </form>
    </Modal>
  );
}
