import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../components/ui/auth-layout';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { TextField } from '../components/ui/text-field';
import { useForgotPasswordMutation } from '../features/auth/use-auth';
import { forgotPasswordFormSchema, type ForgotPasswordFormValues } from '../features/auth/schemas';
import { ApiError } from '../lib/api';
import { tr } from '../i18n/tr';

export function ForgotPasswordPage() {
  const mutation = useForgotPasswordMutation();
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit((values) => mutation.mutate(values));

  const apiErrorMessage =
    mutation.error instanceof ApiError ? mutation.error.message : tr.auth.forgotPasswordErrorToast;

  return (
    <AuthLayout>
      <div className="flex flex-col items-center">
        <img src="/pilens-logo.png" alt="PiLens" className="mb-6 h-14 w-auto" />
        {mutation.isSuccess ? (
          <div className="flex w-full flex-col items-center gap-4 text-center">
            <h1 className="text-2xl font-bold text-app-text">{tr.auth.forgotPasswordSentTitle}</h1>
            <p className="text-sm text-app-muted">{tr.auth.forgotPasswordSent}</p>
          </div>
        ) : (
          <>
            <h1 className="mb-3 text-center text-2xl font-bold text-app-text">
              {tr.auth.forgotPasswordTitle}
            </h1>
            <p className="mb-6 text-center text-sm text-app-muted">{tr.auth.forgotPasswordIntro}</p>
            <form onSubmit={onSubmit} className="flex w-full flex-col gap-4 text-left" noValidate>
              <FormError message={mutation.isError ? apiErrorMessage : undefined} />
              <TextField
                label={tr.auth.fields.email}
                type="email"
                autoComplete="email"
                error={errors.email?.message}
                {...registerField('email')}
              />
              <Button type="submit" disabled={mutation.isPending} className="mt-1">
                {mutation.isPending
                  ? tr.auth.forgotPasswordSubmitting
                  : tr.auth.forgotPasswordSubmit}
              </Button>
            </form>
          </>
        )}
        <Link to="/login" className="mt-6 text-sm font-medium text-app-primary hover:underline">
          {tr.auth.backToLogin}
        </Link>
      </div>
    </AuthLayout>
  );
}
