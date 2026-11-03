import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AuthLayout } from '../components/ui/auth-layout';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { PasswordField } from '../components/ui/password-field';
import { useToast } from '../components/ui/toast-context';
import { useResetPasswordMutation } from '../features/auth/use-auth';
import { resetPasswordFormSchema, type ResetPasswordFormValues } from '../features/auth/schemas';
import { ApiError } from '../lib/api';
import { tr } from '../i18n/tr';

export function ResetPasswordPage() {
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const mutation = useResetPasswordMutation();
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { password: '', passwordConfirm: '' },
  });

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(
      { token, password: values.password },
      {
        onSuccess: () => {
          toast.success(tr.auth.resetPasswordSuccessToast);
          navigate('/login', { replace: true });
        },
      },
    );
  });

  const tokenRejected =
    mutation.error instanceof ApiError && mutation.error.code === 'INVALID_RESET_TOKEN';

  return (
    <AuthLayout>
      <div className="flex flex-col items-center">
        <img src="/pilens-logo.png" alt="PiLens" className="mb-6 h-14 w-auto" />
        {tokenRejected ? (
          <div className="flex w-full flex-col items-center gap-4 text-center">
            <h1 className="text-2xl font-bold text-app-text">
              {tr.auth.resetPasswordInvalidTitle}
            </h1>
            <p className="text-sm text-app-muted">{tr.auth.resetPasswordInvalid}</p>
            <Link
              to="/sifremi-unuttum"
              className="text-sm font-medium text-app-primary hover:underline"
            >
              {tr.auth.resetPasswordRequestNew}
            </Link>
          </div>
        ) : (
          <>
            <h1 className="mb-7 text-center text-2xl font-bold text-app-text">
              {tr.auth.resetPasswordTitle}
            </h1>
            <form onSubmit={onSubmit} className="flex w-full flex-col gap-4 text-left" noValidate>
              <FormError
                message={mutation.error instanceof ApiError ? mutation.error.message : undefined}
              />
              <PasswordField
                label={tr.auth.resetPasswordFields.password}
                autoComplete="new-password"
                error={errors.password?.message}
                toggleLabels={tr.common.passwordToggle}
                {...registerField('password')}
              />
              <PasswordField
                label={tr.auth.resetPasswordFields.passwordConfirm}
                autoComplete="new-password"
                error={errors.passwordConfirm?.message}
                toggleLabels={tr.common.passwordToggle}
                {...registerField('passwordConfirm')}
              />
              <Button type="submit" disabled={mutation.isPending} className="mt-1">
                {mutation.isPending ? tr.auth.resetPasswordSubmitting : tr.auth.resetPasswordSubmit}
              </Button>
            </form>
            <Link to="/login" className="mt-6 text-sm font-medium text-app-primary hover:underline">
              {tr.auth.backToLogin}
            </Link>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
