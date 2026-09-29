import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '../components/ui/button';
import { DateTimeField } from '../components/ui/date-time-field';
import { Modal } from '../components/ui/modal';
import { MultiSelect } from '../components/ui/multi-select';
import { TextareaField } from '../components/ui/textarea-field';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { useMeQuery } from '../features/auth/use-auth';
import { ReminderTypeSelect } from '../features/crm/reminder-type-select';
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
  const meQuery = useMeQuery();
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
          reminderType: event.reminderType ?? undefined,
          description: event.description ?? undefined,
          startAt: toDatetimeLocal(event.startAt),
          isMeeting: event.isMeeting,
          attendeeUserIds: event.attendees.map((a) => a.userId),
        }
      : {
          title: '',
          startAt: defaultStart ? toDatetimeLocal(defaultStart.toISOString()) : '',
          isMeeting: false,
          attendeeUserIds: meQuery.data ? [meQuery.data.id] : [],
        },
  });

  function onSubmit(values: CalendarEventFormValues) {
    const startAt = new Date(values.startAt).toISOString();
    const input = {
      title: values.title,
      reminderType: values.reminderType || undefined,
      description: values.description || undefined,
      startAt,
      endAt: startAt,
      allDay: false,
      isMeeting: values.isMeeting ?? false,
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
      allowPageScroll
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
        <Controller
          name="reminderType"
          control={control}
          render={({ field }) => (
            <ReminderTypeSelect
              label={tr.crm.calendar.form.reminderTypeLabel}
              value={field.value ?? ''}
              onChange={field.onChange}
              error={errors.reminderType?.message}
            />
          )}
        />
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-app-text">
            <input type="checkbox" className="accent-app-primary" {...register('isMeeting')} />
            {tr.crm.calendar.form.isMeetingLabel}
          </label>
          <p className="mt-1 pl-6 text-xs text-app-muted">{tr.crm.calendar.form.isMeetingHint}</p>
        </div>
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
              hint={`Opsiyonel, en fazla 50 kişi seçebilirsiniz. ${tr.crm.calendar.form.attendeesInviteHint}`}
              searchable
              menuPosition="absolute"
            />
          )}
        />
      </form>
    </Modal>
  );
}
