import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, Mail, Pencil } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../components/ui/button';
import { IconActionButton } from '../components/ui/icon-action-button';
import { Modal } from '../components/ui/modal';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import {
  useResetTenantAdminPasswordMutation,
  useUpdateTenantAdminEmailMutation,
  useUpdateTenantSlugMutation,
} from '../features/platform-admin/use-platform-admin';
import { ApiError } from '../lib/api';
import { tr } from '../i18n/tr';
import { copyToClipboard } from '../lib/copy-to-clipboard';

const TENANT_ROOT_DOMAIN = 'pilens.com.tr';

function EditSlugModal({
  tenantId,
  currentSlug,
  onClose,
}: {
  tenantId: string;
  currentSlug: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const strings = tr.platformAdmin.editSlugModal;
  const mutation = useUpdateTenantSlugMutation();
  const [slug, setSlug] = useState(currentSlug);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    mutation.mutate(
      { tenantId, slug },
      {
        onSuccess: () => {
          toast.success(strings.successToast);
          onClose();
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  }

  return (
    <Modal title={strings.title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-app-muted">{strings.description}</p>
        <TextField
          label={strings.slugLabel}
          name="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase())}
          autoFocus
        />
        <p className="text-sm text-app-muted">
          {strings.previewPrefix}
          <span className="font-mono">{(slug || '…') + '.' + TENANT_ROOT_DOMAIN}</span>
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {strings.cancelButton}
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? strings.submitting : strings.submit}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

const editAdminEmailSchema = z.object({
  email: z.string().trim().email(tr.platformAdmin.editAdminEmailModal.invalidEmail),
});
type EditAdminEmailForm = z.infer<typeof editAdminEmailSchema>;

function EditAdminEmailModal({
  tenantId,
  currentEmail,
  onClose,
}: {
  tenantId: string;
  currentEmail: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const strings = tr.platformAdmin.editAdminEmailModal;
  const mutation = useUpdateTenantAdminEmailMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditAdminEmailForm>({
    resolver: zodResolver(editAdminEmailSchema),
    defaultValues: { email: currentEmail },
  });

  const onSubmit = handleSubmit(({ email }) => {
    mutation.mutate(
      { tenantId, email },
      {
        onSuccess: () => {
          toast.success(strings.successToast);
          onClose();
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  });

  return (
    <Modal title={strings.title} onClose={onClose}>
      <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
        <p className="text-sm text-app-muted">{strings.description}</p>
        <TextField
          label={strings.emailLabel}
          type="email"
          autoFocus
          error={errors.email?.message}
          {...register('email')}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {strings.cancelButton}
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? strings.submitting : strings.submit}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

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
    if (await copyToClipboard(password)) toast.success(strings.copiedToast);
    else toast.error(tr.common.copyFailed);
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
  slug,
}: {
  tenantId: string;
  adminEmail: string | null;
  slug: string;
}) {
  const toast = useToast();
  const resetMutation = useResetTenantAdminPasswordMutation();
  const [result, setResult] = useState<string | null>(null);
  const [editingSlug, setEditingSlug] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);

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
      <IconActionButton
        icon={Pencil}
        tooltip={tr.platformAdmin.editSlugTooltip}
        onClick={() => setEditingSlug(true)}
      />
      {adminEmail && (
        <IconActionButton
          icon={Mail}
          tooltip={tr.platformAdmin.editAdminEmailTooltip}
          onClick={() => setEditingEmail(true)}
        />
      )}
      <IconActionButton
        icon={KeyRound}
        tooltip={tr.platformAdmin.resetAdminPasswordTooltip}
        disabled={resetMutation.isPending}
        onClick={handleResetPassword}
      />
      {result && (
        <ResetPasswordResultModal
          adminEmail={adminEmail}
          password={result}
          onClose={() => setResult(null)}
        />
      )}
      {editingEmail && adminEmail && (
        <EditAdminEmailModal
          tenantId={tenantId}
          currentEmail={adminEmail}
          onClose={() => setEditingEmail(false)}
        />
      )}
      {editingSlug && (
        <EditSlugModal
          tenantId={tenantId}
          currentSlug={slug}
          onClose={() => setEditingSlug(false)}
        />
      )}
    </>
  );
}
