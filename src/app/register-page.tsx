import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/ui/auth-layout';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { TextField } from '../components/ui/text-field';
import { useRegisterMutation } from '../features/auth/use-auth';
import { registerFormSchema, type RegisterFormValues } from '../features/auth/schemas';
import { ApiError } from '../lib/api';
import { tr } from '../i18n/tr';

export function RegisterPage() {
  const navigate = useNavigate();
  const registerMutation = useRegisterMutation();
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerFormSchema) });

  const onSubmit = handleSubmit((values) => {
    registerMutation.mutate(values, {
      onSuccess: () => navigate('/', { replace: true }),
    });
  });

  const apiErrorMessage =
    registerMutation.error instanceof ApiError ? registerMutation.error.message : undefined;

  return (
    <AuthLayout>
      <p className="mb-2 text-xs font-bold tracking-[0.12em] text-app-brand uppercase">
        {tr.auth.eyebrow}
      </p>
      <h1 className="mb-1 text-2xl font-bold text-app-text">{tr.auth.registerTitle}</h1>
      <p className="mb-7 text-sm text-app-muted">{tr.auth.registerSubtitle}</p>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <FormError message={apiErrorMessage} />
        <TextField
          label={tr.auth.fields.tenantName}
          autoComplete="organization"
          error={errors.tenantName?.message}
          {...registerField('tenantName')}
        />
        <TextField
          label={tr.auth.fields.name}
          autoComplete="name"
          error={errors.name?.message}
          {...registerField('name')}
        />
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
          autoComplete="new-password"
          error={errors.password?.message}
          {...registerField('password')}
        />
        <Button type="submit" disabled={registerMutation.isPending} className="mt-1">
          {registerMutation.isPending ? tr.auth.registerSubmitting : tr.auth.registerSubmit}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-app-muted">
        {tr.auth.haveAccount}{' '}
        <Link to="/login" className="font-semibold text-app-brand">
          {tr.auth.loginLink}
        </Link>
      </p>
    </AuthLayout>
  );
}
