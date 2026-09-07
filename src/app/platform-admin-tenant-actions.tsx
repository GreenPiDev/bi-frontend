import { KeyRound } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';
import { TextField } from '../components/ui/text-field';
import { Tooltip } from '../components/ui/tooltip';
import { useToast } from '../components/ui/toast-context';
import { useResetTenantAdminPasswordMutation } from '../features/platform-admin/use-platform-admin';
import { ApiError } from '../lib/api';
import { tr } from '../i18n/tr';

function ResetPasswordResultModal({
  adminEmail,
  password,
  onClose,
}: {
  adminEmail: string | null;
  password: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const strings = tr.platformAdmin.resetAdminPasswordResult;

  async function handleCopy() {
    await navigator.clipboard.writeText(password);
    toast.success(strings.copiedToast);
  }

  return (
    <Modal
      title={strings.title}
      onClose={onClose}
      footer={
        <Button type="button" onClick={onClose}>
          {strings.closeButton}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-app-muted">{strings.description}</p>
        {adminEmail && (
          <TextField label={strings.emailLabel} name="result-email" value={adminEmail} readOnly />
        )}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <TextField
              label={strings.passwordLabel}
              name="result-password"
              value={password}
              readOnly
            />
          </div>
          <Button type="button" variant="secondary" onClick={() => void handleCopy()}>
            {strings.copyButton}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function PlatformAdminTenantActions({
  tenantId,
  adminEmail,
}: {
  tenantId: string;
  adminEmail: string | null;
}) {
  const toast = useToast();
  const resetMutation = useResetTenantAdminPasswordMutation();
  const [result, setResult] = useState<string | null>(null);

  function handleResetPassword() {
    resetMutation.mutate(tenantId, {
      onSuccess: (res) => {
        setResult(res.temporaryPassword);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  }

  return (
    <>
      <Tooltip content={tr.platformAdmin.resetAdminPasswordTooltip}>
        <button
          type="button"
          aria-label={tr.platformAdmin.resetAdminPasswordTooltip}
          disabled={resetMutation.isPending}
          onClick={handleResetPassword}
          className="rounded-lg p-2 text-app-muted transition-colors hover:bg-app-bg hover:text-app-text disabled:cursor-not-allowed disabled:opacity-50"
        >
          <KeyRound size={16} />
        </button>
      </Tooltip>
      {result && (
        <ResetPasswordResultModal
          adminEmail={adminEmail}
          password={result}
          onClose={() => setResult(null)}
        />
      )}
    </>
  );
}
