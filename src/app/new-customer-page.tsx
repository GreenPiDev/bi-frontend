import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { BackLink } from '../components/ui/back-link';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { useCreateTenantMutation } from '../features/platform-admin/use-platform-admin';
import {
  newCustomerFormSchema,
  type NewCustomerFormValues,
} from '../features/platform-admin/schemas';
import { ApiError } from '../lib/api';
import { tr } from '../i18n/tr';
import { AppShell } from './app-shell';

export function NewCustomerPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const createMutation = useCreateTenantMutation();
  const strings = tr.platformAdmin.newCustomer;

  const [result, setResult] = useState<{ email: string; password: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewCustomerFormValues>({
    resolver: zodResolver(newCustomerFormSchema),
  });

  const onSubmit = handleSubmit((values) => {
    createMutation.mutate(
      {
        tenantName: values.tenantName,
        adminName: values.adminName,
        adminEmail: values.adminEmail,
      },
      {
        onSuccess: (res) => {
          setResult({ email: values.adminEmail, password: res.temporaryPassword });
        },
      },
    );
  });

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.password);
    toast.success(strings.copiedToast);
  }

  const apiErrorMessage =
    createMutation.error instanceof ApiError ? createMutation.error.message : undefined;

  return (
    <AppShell>
      <BackLink to="/platform-admin" label={strings.backLink} />

      <div className="mx-auto mt-6 max-w-xl p-8">
        {result ? (
          <div className="flex flex-col gap-4">
            <h1 className="text-lg font-bold text-app-text">{strings.successTitle}</h1>
            <p className="text-sm text-app-muted">{strings.successDescription}</p>
            <TextField
              label={strings.emailLabel}
              name="result-email"
              value={result.email}
              readOnly
            />
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <TextField
                  label={strings.passwordLabel}
                  name="result-password"
                  value={result.password}
                  readOnly
                />
              </div>
              <Button type="button" variant="secondary" onClick={() => void handleCopy()}>
                {strings.copyButton}
              </Button>
            </div>
            <Button type="button" onClick={() => navigate('/platform-admin')}>
              {strings.backToListButton}
            </Button>
          </div>
        ) : (
          <>
            <h1 className="text-lg font-bold text-app-text">{strings.title}</h1>
            <p className="mt-1 text-sm text-app-muted">{strings.subtitle}</p>

            <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
              <FormError message={apiErrorMessage} />
              <TextField
                label={strings.tenantNameLabel}
                error={errors.tenantName?.message}
                {...register('tenantName')}
              />
              <TextField
                label={strings.adminNameLabel}
                error={errors.adminName?.message}
                {...register('adminName')}
              />
              <TextField
                label={strings.adminEmailLabel}
                type="email"
                error={errors.adminEmail?.message}
                {...register('adminEmail')}
              />
              <Button type="submit" disabled={createMutation.isPending} className="mt-1">
                {createMutation.isPending ? strings.submitting : strings.submit}
              </Button>
            </form>
          </>
        )}
      </div>
    </AppShell>
  );
}
