import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, Hourglass, LogOut, Phone } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../../components/ui/button';
import { TextField } from '../../components/ui/text-field';
import { TextareaField } from '../../components/ui/textarea-field';
import { tr } from '../../i18n/tr';
import type { AuthenticatedUser } from '../../lib/api';
import { submitToWeb3Forms } from '../landing/use-demo-request';

const copy = tr.demoTrial.expired;

const callbackRequestSchema = z.object({
  phone: z.string().trim().min(1, copy.validation.phone).max(50),
  note: z.string().max(2000).optional().or(z.literal('')),
});

type CallbackRequestValues = z.infer<typeof callbackRequestSchema>;

interface DemoExpiredModalProps {
  user: AuthenticatedUser;
  onLogout: () => void;
}

/** Suresi dolan demo kullanicisina login sonrasi gosterilen, kapatilamayan modal: bizi
 * arayin (VITE_DEMO_CONTACT_PHONE setliyse) ya da "beni arayin" talebi birakin. Talep,
 * tanitim sayfasindaki "Demo Iste" formuyla ayni web3forms kanalindan ekibe ulasir. */
export function DemoExpiredModal({ user, onLogout }: DemoExpiredModalProps) {
  const contactPhone: string | undefined = import.meta.env.VITE_DEMO_CONTACT_PHONE;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="demo-expired-title"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-app-surface p-7 shadow-2xl"
      >
        <div className="flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <Hourglass size={22} />
          </span>
          <h2 id="demo-expired-title" className="mt-4 text-xl font-bold text-app-text">
            {copy.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-app-muted">{copy.message}</p>
          {contactPhone && (
            <a
              href={`tel:${contactPhone.replace(/\s/g, '')}`}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-app-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-app-brand-dark"
            >
              <Phone size={16} />
              {copy.callUs}: {contactPhone}
            </a>
          )}
        </div>
        <CallbackRequestForm user={user} />
        <button
          type="button"
          onClick={onLogout}
          className="mx-auto mt-5 flex cursor-pointer items-center gap-2 text-sm font-semibold text-app-danger hover:underline"
        >
          <LogOut size={16} />
          {copy.logout}
        </button>
      </div>
    </div>
  );
}

function CallbackRequestForm({ user }: { user: AuthenticatedUser }) {
  const mutation = useMutation({
    mutationFn: (values: CallbackRequestValues) =>
      submitToWeb3Forms({
        subject: `PiLens demo uzatma talebi - ${user.name}`,
        from_name: 'PiLens Demo Hesabı',
        name: user.name,
        email: user.email,
        phone: values.phone,
        message: values.note || '—',
      }),
  });
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<CallbackRequestValues>({
    resolver: zodResolver(callbackRequestSchema),
    defaultValues: { phone: user.phone ?? '' },
  });

  if (mutation.isSuccess) {
    return (
      <div className="mt-6 flex flex-col items-center rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <CheckCircle2 className="h-9 w-9 text-emerald-500" />
        <p className="mt-2 font-semibold text-app-text">{copy.successTitle}</p>
        <p className="mt-1 text-sm text-app-muted">{copy.successMessage}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className="mt-6 flex flex-col gap-3 border-t border-app-border pt-5"
      noValidate
    >
      <div>
        <p className="font-semibold text-app-text">{copy.requestTitle}</p>
        <p className="mt-0.5 text-sm text-app-muted">{copy.requestHint}</p>
      </div>
      {mutation.isError && <p className="text-sm text-app-danger">{copy.errorMessage}</p>}
      <TextField
        label={copy.phone}
        type="tel"
        required
        autoComplete="tel"
        error={errors.phone?.message}
        {...registerField('phone')}
      />
      <TextareaField
        label={copy.note}
        rows={2}
        error={errors.note?.message}
        {...registerField('note')}
      />
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? copy.submitting : copy.submit}
      </Button>
    </form>
  );
}
