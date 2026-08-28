import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/modal';
import { TextField } from '../../components/ui/text-field';
import { useToast } from '../../components/ui/toast-context';
import { ApiError, type RoleView } from '../../lib/api';
import { tr } from '../../i18n/tr';
import { useCreateRoleMutation, useUpdateRoleMutation } from './use-roles';

interface RoleFormModalProps {
  role?: RoleView;
  onClose: () => void;
}

export function RoleFormModal({ role, onClose }: RoleFormModalProps) {
  const toast = useToast();
  const createMutation = useCreateRoleMutation();
  const updateMutation = useUpdateRoleMutation();
  const [name, setName] = useState(role?.name ?? '');

  const isEditing = Boolean(role);
  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleSubmit() {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    if (isEditing && role) {
      updateMutation.mutate(
        { id: role.id, input: { name: trimmedName } },
        {
          onSuccess: () => {
            toast.success(tr.settings.roles.updateSuccess);
            onClose();
          },
          onError: (error) => {
            toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
          },
        },
      );
      return;
    }

    // Yeni rol izinsiz olusturulur; izinler "Sayfa Erisimleri" sekmesinden ayarlanir.
    createMutation.mutate(
      { name: trimmedName, permissions: [] },
      {
        onSuccess: () => {
          toast.success(tr.settings.roles.createSuccess);
          onClose();
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  }

  return (
    <Modal
      title={isEditing ? tr.settings.roles.form.editTitle : tr.settings.roles.form.createTitle}
      onClose={onClose}
      width="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {tr.settings.roles.form.cancel}
          </Button>
          <Button type="button" disabled={isPending || !name.trim()} onClick={handleSubmit}>
            {isPending ? tr.settings.roles.form.saving : tr.settings.roles.form.save}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField
          id="role-name"
          label={tr.settings.roles.form.nameLabel}
          placeholder={tr.settings.roles.form.namePlaceholder}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <p className="text-sm text-app-muted">{tr.settings.roles.form.permissionsMovedHint}</p>
      </div>
    </Modal>
  );
}
