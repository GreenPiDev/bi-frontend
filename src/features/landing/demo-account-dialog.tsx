import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, X } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { tr } from '../../i18n/tr';
import { ApiError, createDemoAccount, type CreatedDemoAccount } from '../../lib/api';
import { CtaButton, CtaLink } from './cta-button';
import { DarkTextField } from './dark-field';
import { buildDemoLoginUrl } from './demo-login-url';
import { demoAccountFormSchema, type DemoAccountFormValues } from './schemas';

const copy = tr.landing.demoAccount;

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'EMAIL_TAKEN') return copy.emailTaken;
    if (error.status === 429) return copy.tooManyRequests;
  }
  return copy.errorFallback;
}

interface DemoAccountDialogProps {
  onClose: () => void;
}

/** Tanitim sayfasindaki "Demo kullanici olustur" modal'i - ortak demo tenant'ina 1 gunluk
 * COMPANYADMIN deneme kullanicisi acar (POST /demo-accounts), sonra demo subdomain'indeki
 * login sayfasina yonlendirir. Sayfanin koyu temasina uygun kendi overlay'i var
 * (components/ui/modal.tsx acik temaya sabit). */
export function DemoAccountDialog({ onClose }: DemoAccountDialogProps) {
  const mutation = useMutation({ mutationFn: createDemoAccount });
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<DemoAccountFormValues>({ resolver: zodResolver(demoAccountFormSchema) });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const onSubmit = handleSubmit(({ name, companyName, email, phone, password }) => {
    mutation.mutate({ name, companyName, email, phone, password });
  });

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-account-title"
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-[#2b2e33] p-7 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={copy.close}
          className="absolute top-4 right-4 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white"
        >
          <X size={18} />
        </button>
        {mutation.isSuccess ? (
          <DemoAccountSuccess account={mutation.data} />
        ) : (
          <>
            <h2 id="demo-account-title" className="pr-8 text-xl font-semibold text-white">
              {copy.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{copy.subtitle}</p>
            <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3" noValidate>
              {mutation.isError && (
                <p className="rounded-lg border border-red-400/20 bg-red-400/10 px-3.5 py-2.5 text-sm font-medium text-red-400">
                  {toErrorMessage(mutation.error)}
                </p>
              )}
              <DarkTextField
                label={copy.fields.name}
                required
                autoComplete="name"
                error={errors.name?.message}
                {...registerField('name')}
              />
              <DarkTextField
                label={copy.fields.companyName}
                required
                autoComplete="organization"
                error={errors.companyName?.message}
                {...registerField('companyName')}
              />
              <DarkTextField
                label={copy.fields.email}
                type="email"
                required
                autoComplete="email"
                error={errors.email?.message}
                {...registerField('email')}
              />
              <DarkTextField
                label={copy.fields.phone}
                type="tel"
                required
                autoComplete="tel"
                error={errors.phone?.message}
                {...registerField('phone')}
              />
              <DarkTextField
                label={copy.fields.password}
                type="password"
                required
                autoComplete="new-password"
                error={errors.password?.message}
                {...registerField('password')}
              />
              <DarkTextField
                label={copy.fields.passwordConfirm}
                type="password"
                required
                autoComplete="new-password"
                error={errors.passwordConfirm?.message}
                {...registerField('passwordConfirm')}
              />
              <CtaButton
                type="submit"
                disabled={mutation.isPending}
                className="mt-2 w-full py-2.5 text-sm"
              >
                {mutation.isPending ? copy.submitting : copy.submit}
              </CtaButton>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function DemoAccountSuccess({ account }: { account: CreatedDemoAccount }) {
  return (
    <div className="flex flex-col items-center py-4 text-center">
      <CheckCircle2 className="h-12 w-12 text-emerald-400" />
      <h2 id="demo-account-title" className="mt-4 text-lg font-bold text-white">
        {copy.successTitle}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-300">
        {copy.successMessage(account.email)}
      </p>
      <CtaLink
        href={buildDemoLoginUrl(account.tenantSlug, account.email)}
        className="mt-6 w-full py-2.5"
      >
        {copy.goToLogin}
      </CtaLink>
    </div>
  );
}
