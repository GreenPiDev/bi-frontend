import { useState } from 'react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/modal';
import { Table, type TableColumn } from '../../components/ui/table';
import { Tooltip } from '../../components/ui/tooltip';
import { useToast } from '../../components/ui/toast-context';
import { ApiError, type RoleView } from '../../lib/api';
import { tr } from '../../i18n/tr';
import { RoleFormModal } from './role-form-modal';
import { UsersSection } from './users-section';
import { useDeleteRoleMutation, usePageRegistryQuery, useRolesQuery } from './use-roles';

export function RolesSettingsSection() {
  const toast = useToast();
  const rolesQuery = useRolesQuery();
  const pageRegistryQuery = usePageRegistryQuery();
  const deleteMutation = useDeleteRoleMutation();
  const [modalState, setModalState] = useState<
    { mode: 'create' } | { mode: 'edit'; role: RoleView } | null
  >(null);
  const [roleToDelete, setRoleToDelete] = useState<RoleView | null>(null);

  function handleConfirmDelete() {
    if (!roleToDelete) return;
    const role = roleToDelete;
    deleteMutation.mutate(role.id, {
      onSuccess: () => {
        toast.success(tr.settings.roles.deleteSuccess);
        setRoleToDelete(null);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        setRoleToDelete(null);
      },
    });
  }

  const columns: TableColumn<RoleView>[] = [
    {
      key: 'name',
      header: 'Rol',
      render: (role) => (
        <span className="flex items-center gap-2 font-semibold text-app-text">
          {role.name}
          {role.isSystem && <Badge variant="info">{tr.settings.roles.systemBadge}</Badge>}
        </span>
      ),
    },
    {
      key: 'userCount',
      header: '',
      render: (role) => (
        <span className="text-app-muted">{tr.settings.roles.userCount(role.userCount)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (role) => (
        <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
          {role.isSystem ? (
            <Tooltip content={tr.settings.roles.systemRoleReadonlyHint}>
              <span className="text-xs text-app-muted">
                {tr.settings.roles.systemRoleReadonlyHint}
              </span>
            </Tooltip>
          ) : (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setModalState({ mode: 'edit', role })}
              >
                {tr.settings.roles.editButton}
              </Button>
              <Button type="button" variant="danger" onClick={() => setRoleToDelete(role)}>
                {tr.settings.roles.deleteButton}
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-app-text">{tr.settings.roles.listTitle}</h2>
            <p className="text-sm text-app-muted">{tr.settings.roles.subtitle}</p>
          </div>
          <Button type="button" onClick={() => setModalState({ mode: 'create' })}>
            {tr.settings.roles.newRoleButton}
          </Button>
        </div>

        <Table
          columns={columns}
          data={rolesQuery.data ?? []}
          keyField={(role) => role.id}
          isLoading={rolesQuery.isPending}
        />
      </section>

      <UsersSection roles={rolesQuery.data ?? []} />

      {modalState && pageRegistryQuery.data && (
        <RoleFormModal
          pages={pageRegistryQuery.data}
          role={modalState.mode === 'edit' ? modalState.role : undefined}
          onClose={() => setModalState(null)}
        />
      )}

      {roleToDelete && (
        <Modal
          title={tr.settings.roles.deleteButton}
          onClose={() => setRoleToDelete(null)}
          footer={
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setRoleToDelete(null)}>
                {tr.settings.roles.form.cancel}
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={deleteMutation.isPending}
                onClick={handleConfirmDelete}
              >
                {tr.settings.roles.deleteButton}
              </Button>
            </div>
          }
        >
          <p className="text-sm text-app-text">{tr.settings.roles.deleteConfirm}</p>
        </Modal>
      )}
    </div>
  );
}
