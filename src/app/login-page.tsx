import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/ui/auth-layout';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { TextField } from '../components/ui/text-field';
import { useLoginMutation } from '../features/auth/use-auth';
import { loginFormSchema, type LoginFormValues } from '../features/auth/schemas';
import { ApiError } from '../lib/api';
import { tr } from '../i18n/tr';

export function LoginPage() {
  const navigate = useNavigate();
  const loginMutation = useLoginMutation();
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginFormSchema) });

  const onSubmit = handleSubmit((values) => {
    loginMutation.mutate(values, {
      onSuccess: () => navigate('/', { replace: true }),
    });
  });

  const apiErrorMessage =
    loginMutation.error instanceof ApiError ? loginMutation.error.message : undefined;

  return (
    <AuthLayout>
      <p className="mb-2 text-xs font-bold tracking-[0.12em] text-app-brand uppercase">
        {tr.auth.eyebrow}
      </p>
      <h1 className="mb-1 text-2xl font-bold text-app-text">{tr.auth.loginTitle}</h1>
      <p className="mb-7 text-sm text-app-muted">{tr.auth.loginSubtitle}</p>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <FormError message={apiErrorMessage} />
        <TextField
          label={tr.auth.fields.email}
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...registerField('email')}
        />
        <TextField
          label={tr.auth.fields.password}
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...registerField('password')}
        />
        <Button type="submit" disabled={loginMutation.isPending} className="mt-1">
          {loginMutation.isPending ? tr.auth.loginSubmitting : tr.auth.loginSubmit}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-app-muted">
        {tr.auth.noAccount}{' '}
        <Link to="/register" className="font-semibold text-app-brand">
          {tr.auth.registerLink}
        </Link>
      </p>
    </AuthLayout>
  );
}
