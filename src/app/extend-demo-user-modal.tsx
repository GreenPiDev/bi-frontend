import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { Modal } from '../components/ui/modal';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { useExtendDemoUserMutation } from '../features/platform-admin/use-platform-admin';
import { tr } from '../i18n/tr';
import type { DemoUserSummary } from '../lib/api';

const copy = tr.platformAdmin.demoUsers.extend;

function amountField(max: number, rangeMessage: string) {
  return z
    .string()
    .trim()
    .regex(/^\d+$/, copy.validation.number)
    .transform(Number)
    .refine((value) => value <= max, rangeMessage);
}

const extendSchema = z
  .object({
    days: amountField(365, copy.validation.number),
    hours: amountField(23, copy.validation.hours),
    minutes: amountField(59, copy.validation.minutes),
  })
  .refine((value) => value.days + value.hours + value.minutes > 0, {
    message: copy.validation.positive,
    path: ['minutes'],
  });

type ExtendFormInput = z.input<typeof extendSchema>;
type ExtendFormValues = z.output<typeof extendSchema>;

interface ExtendDemoUserModalProps {
  user: DemoUserSummary;
  onClose: () => void;
}

/** Super admin: bir demo hesabini, simdiden itibaren gun/saat/dakika olarak belirlenen
 * sure kadar yeniden kullanilabilir yapar (POST /platform-admin/demo-users/:id/extend). */
export function ExtendDemoUserModal({ user, onClose }: ExtendDemoUserModalProps) {
  const toast = useToast();
  const mutation = useExtendDemoUserMutation();
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<ExtendFormInput, unknown, ExtendFormValues>({
    resolver: zodResolver(extendSchema),
    defaultValues: { days: '1', hours: '0', minutes: '0' },
  });

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(
      { id: user.id, ...values },
      {
        onSuccess: () => {
          toast.success(copy.success);
          onClose();
        },
      },
    );
  });

  return (
    <Modal
      title={copy.title}
      subtitle={copy.subtitle(user.name)}
      onClose={onClose}
      width="sm"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            {copy.cancel}
          </Button>
          <Button type="submit" form="extend-demo-user-form" disabled={mutation.isPending}>
            {mutation.isPending ? copy.submitting : copy.submit}
          </Button>
        </>
      }
    >
      <form id="extend-demo-user-form" onSubmit={onSubmit} noValidate>
        {mutation.isError && <FormError message={copy.error} />}
        <div className="grid grid-cols-3 gap-3">
          <TextField
            label={copy.days}
            type="number"
            min={0}
            error={errors.days?.message}
            {...registerField('days')}
          />
          <TextField
            label={copy.hours}
            type="number"
            min={0}
            error={errors.hours?.message}
            {...registerField('hours')}
          />
          <TextField
            label={copy.minutes}
            type="number"
            min={0}
            error={errors.minutes?.message}
            {...registerField('minutes')}
          />
        </div>
      </form>
    </Modal>
  );
}
