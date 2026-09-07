import { ArrowLeft } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { useCreateTenantMutation } from '../features/platform-admin/use-platform-admin';
import { ApiError } from '../lib/api';
import { tr } from '../i18n/tr';
import { AppShell } from './app-shell';

export function NewCustomerPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const createMutation = useCreateTenantMutation();
  const strings = tr.platformAdmin.newCustomer;

  const [tenantName, setTenantName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [result, setResult] = useState<{ email: string; password: string } | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!tenantName.trim() || !adminName.trim() || !adminEmail.trim()) return;
    createMutation.mutate(
      {
        tenantName: tenantName.trim(),
        adminName: adminName.trim(),
        adminEmail: adminEmail.trim(),
      },
      {
        onSuccess: (res) => {
          setResult({ email: adminEmail.trim(), password: res.temporaryPassword });
        },
      },
    );
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.password);
    toast.success(strings.copiedToast);
  }

  const apiErrorMessage =
    createMutation.error instanceof ApiError ? createMutation.error.message : undefined;

  return (
    <AppShell>
      <Link
        to="/platform-admin"
        className="inline-flex items-center gap-1 text-sm font-semibold text-app-muted hover:text-app-text"
      >
        <ArrowLeft className="h-4 w-4" />
        {strings.backLink}
      </Link>

      <div className="mx-auto mt-6 max-w-xl rounded-xl border border-app-border bg-app-surface p-8">
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

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
              <FormError message={apiErrorMessage} />
              <TextField
                label={strings.tenantNameLabel}
                name="tenantName"
                value={tenantName}
                onChange={(event) => setTenantName(event.target.value)}
              />
              <TextField
                label={strings.adminNameLabel}
                name="adminName"
                value={adminName}
                onChange={(event) => setAdminName(event.target.value)}
              />
              <TextField
                label={strings.adminEmailLabel}
                name="adminEmail"
                type="email"
                value={adminEmail}
                onChange={(event) => setAdminEmail(event.target.value)}
              />
              <Button
                type="submit"
                disabled={
                  createMutation.isPending ||
                  !tenantName.trim() ||
                  !adminName.trim() ||
                  !adminEmail.trim()
                }
                className="mt-1"
              >
                {createMutation.isPending ? strings.submitting : strings.submit}
              </Button>
            </form>
          </>
        )}
      </div>
    </AppShell>
  );
}
