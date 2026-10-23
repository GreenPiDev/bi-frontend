import { zodResolver } from '@hookform/resolvers/zod';
import { clsx } from 'clsx';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '../components/ui/button';
import { DateTimeField } from '../components/ui/date-time-field';
import { Modal } from '../components/ui/modal';
import { Switch } from '../components/ui/switch';
import { TextareaField } from '../components/ui/textarea-field';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { NOTE_COLORS, NOTE_COLOR_STYLES } from '../features/home/note-colors';
import { noteFormSchema, type NoteFormValues } from '../features/home/schemas';
import { useCreateNoteMutation, useUpdateNoteMutation } from '../features/home/use-notes';
import { ApiError, type Note, type NoteColor } from '../lib/api';
import { tr } from '../i18n/tr';

function toDatetimeLocal(iso: string): string {
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

interface NoteFormModalProps {
  /** Duzenleme modu icin mevcut not; olusturma modunda undefined. */
  note?: Note;
  onClose: () => void;
}

export function NoteFormModal({ note, onClose }: NoteFormModalProps) {
  const isEdit = Boolean(note);
  const toast = useToast();
  const createMutation = useCreateNoteMutation();
  const updateMutation = useUpdateNoteMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;
  const t = tr.home.notes.form;

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<NoteFormValues>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: note
      ? {
          content: note.content,
          color: note.color,
          isPrivate: note.isPrivate,
          hasReminder: Boolean(note.reminder),
          reminderStartAt: note.reminder ? toDatetimeLocal(note.reminder.startAt) : undefined,
          reminderTitle: note.reminder?.title,
          reminderDescription: note.reminder?.description ?? undefined,
        }
      : {
          content: '',
          color: 'YELLOW',
          isPrivate: true,
          hasReminder: false,
        },
  });

  const hasReminder = watch('hasReminder');

  function onSubmit(values: NoteFormValues) {
    const reminder =
      values.hasReminder && values.reminderStartAt && values.reminderTitle
        ? {
            startAt: new Date(values.reminderStartAt).toISOString(),
            title: values.reminderTitle,
            description: values.reminderDescription?.trim() || undefined,
          }
        : undefined;

    function handleSettled(isSuccess: boolean, error?: unknown) {
      if (isSuccess) {
        toast.success(isEdit ? t.updateSuccess : t.createSuccess);
        onClose();
      } else {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      }
    }

    if (isEdit && note) {
      updateMutation.mutate(
        {
          id: note.id,
          input: {
            content: values.content,
            color: values.color,
            isPrivate: values.isPrivate,
            reminder: reminder ?? null,
          },
        },
        {
          onSuccess: () => handleSettled(true),
          onError: (error) => handleSettled(false, error),
        },
      );
    } else {
      createMutation.mutate(
        { content: values.content, color: values.color, isPrivate: values.isPrivate, reminder },
        {
          onSuccess: () => handleSettled(true),
          onError: (error) => handleSettled(false, error),
        },
      );
    }
  }

  return (
    <Modal
      title={isEdit ? t.editTitle : t.newTitle}
      onClose={onClose}
      width="md"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button type="submit" form="note-form" disabled={isPending}>
            {isPending ? t.submitting : t.submit}
          </Button>
        </>
      }
    >
      <form id="note-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <TextareaField
          label={t.contentLabel}
          placeholder={t.contentPlaceholder}
          rows={5}
          required
          error={errors.content?.message}
          {...register('content')}
        />

        <Controller
          name="color"
          control={control}
          render={({ field }) => (
            <div>
              <p className="mb-1.5 text-sm font-semibold text-app-muted">{t.colorLabel}</p>
              {/* Onceki `scale-110` denemesi, Modal icerigindeki overflow-auto kutusunun
                  SOL/UST sinirinin disina tasiyordu - overflow-auto negatif yone scroll
                  edemedigi icin tasan kisim hem kirpiliyor hem de yatay scrollbar
                  olusuyordu (bkz. kullanici bildirimi). Buyuyen bir transform yerine,
                  sabit kutu boyutunda sadece kenarlik kalinligi degisiyor - boyle hicbir
                  zaman layout kutusunun disina tasmiyor. */}
              <div className="flex gap-2">
                {NOTE_COLORS.map((color: NoteColor) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={color}
                    aria-pressed={field.value === color}
                    onClick={() => field.onChange(color)}
                    className={clsx(
                      'h-8 w-8 rounded-full transition-colors',
                      NOTE_COLOR_STYLES[color].swatchClassName,
                      field.value === color
                        ? 'border-[3px] border-app-text'
                        : 'border-2 border-transparent hover:border-app-muted/40',
                    )}
                  />
                ))}
              </div>
            </div>
          )}
        />

        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-app-text">
            <input type="checkbox" className="accent-app-primary" {...register('isPrivate')} />
            {t.privateLabel}
          </label>
          <p className="mt-1 pl-6 text-xs text-app-muted">{t.privateHint}</p>
        </div>

        <Controller
          name="hasReminder"
          control={control}
          render={({ field }) => (
            <label className="flex items-center gap-3">
              <Switch checked={field.value ?? false} onChange={field.onChange} />
              <span className="text-sm font-semibold text-app-text">{t.reminderSwitchLabel}</span>
            </label>
          )}
        />

        {hasReminder && (
          <div className="flex flex-col gap-4 border-l-2 border-app-border pl-4">
            <Controller
              name="reminderStartAt"
              control={control}
              render={({ field }) => (
                <DateTimeField
                  label={t.reminderDateLabel}
                  required
                  error={errors.reminderStartAt?.message}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              )}
            />
            <TextField
              label={t.reminderTitleLabel}
              required
              error={errors.reminderTitle?.message}
              {...register('reminderTitle')}
            />
            <TextareaField
              label={t.reminderDescriptionLabel}
              rows={3}
              error={errors.reminderDescription?.message}
              {...register('reminderDescription')}
            />
          </div>
        )}
      </form>
    </Modal>
  );
}
