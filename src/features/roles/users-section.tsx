import { useState } from 'react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/modal';
import { MultiSelect } from '../../components/ui/multi-select';
import { Table, type TableColumn } from '../../components/ui/table';
import { TextField } from '../../components/ui/text-field';
import { useToast } from '../../components/ui/toast-context';
import { ApiError, type RoleView, type SafeUser } from '../../lib/api';
import { tr } from '../../i18n/tr';
import {
  useCreateUserMutation,
  useResetUserPasswordMutation,
  useUpdateUserRoleMutation,
  useUsersQuery,
} from './use-users';

interface UsersSectionProps {
  roles: RoleView[];
  isCompanyAdmin: boolean;
  currentUserId?: string;
}

/** Kullanici olusturma/sifre sifirlama sonrasi tek kullanimlik kimlik bilgilerini gosterir -
 * bu sifre bir daha hicbir yerden alinamayacagi icin admin'in kopyalayip kullaniciya
 * iletmesi gerekiyor. */
function CredentialsResultModal({
  title,
  email,
  password,
  onClose,
}: {
  title: string;
  email?: string;
  password: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const strings = tr.settings.roles.users.credentialsResult;

  async function handleCopy() {
    await navigator.clipboard.writeText(password);
    toast.success(strings.copiedToast);
  }

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <Button type="button" onClick={onClose}>
          {strings.closeButton}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-app-muted">{strings.description}</p>
        {email && (
          <TextField label={strings.emailLabel} name="result-email" value={email} readOnly />
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

function AddUserModal({ roles, onClose }: { roles: RoleView[]; onClose: () => void }) {
  const toast = useToast();
  const createMutation = useCreateUserMutation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [result, setResult] = useState<{ email: string; password: string } | null>(null);

  function handleSubmit() {
    if (!name.trim() || !email.trim() || roleIds.length === 0) return;
    createMutation.mutate(
      { name: name.trim(), email: email.trim(), roleIds },
      {
        onSuccess: (res) => {
          setResult({ email: email.trim(), password: res.temporaryPassword });
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  }

  if (result) {
    return (
      <CredentialsResultModal
        title={tr.settings.roles.users.credentialsResult.createTitle}
        email={result.email}
        password={result.password}
        onClose={onClose}
      />
    );
  }

  return (
    <Modal
      title={tr.settings.roles.users.inviteForm.title}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {tr.settings.roles.form.cancel}
          </Button>
          <Button
            type="button"
            disabled={
              createMutation.isPending || !name.trim() || !email.trim() || roleIds.length === 0
            }
            onClick={handleSubmit}
          >
            {createMutation.isPending
              ? tr.settings.roles.users.inviteForm.submitting
              : tr.settings.roles.users.inviteForm.submit}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField
          label={tr.settings.roles.users.inviteForm.nameLabel}
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <TextField
          label={tr.settings.roles.users.inviteForm.emailLabel}
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <MultiSelect
          label={tr.settings.roles.users.inviteForm.rolesLabel}
          value={roleIds}
          onChange={setRoleIds}
          options={roles.map((role) => ({ value: role.id, label: role.name }))}
        />
      </div>
    </Modal>
  );
}

function EditUserRolesModal({
  user,
  roles,
  onClose,
}: {
  user: SafeUser;
  roles: RoleView[];
  onClose: () => void;
}) {
  const toast = useToast();
  const updateMutation = useUpdateUserRoleMutation();
  const [roleIds, setRoleIds] = useState<string[]>(user.roles.map((r) => r.id));

  function handleSubmit() {
    if (roleIds.length === 0) return;
    updateMutation.mutate(
      { userId: user.id, roleIds },
      {
        onSuccess: () => {
          toast.success(tr.settings.roles.users.editRolesForm.success);
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
      title={`${tr.settings.roles.users.editRolesForm.title} - ${user.name}`}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {tr.settings.roles.form.cancel}
          </Button>
          <Button
            type="button"
            disabled={updateMutation.isPending || roleIds.length === 0}
            onClick={handleSubmit}
          >
            {updateMutation.isPending
              ? tr.settings.roles.users.editRolesForm.submitting
              : tr.settings.roles.users.editRolesForm.submit}
          </Button>
        </div>
      }
    >
      <MultiSelect
        label={tr.settings.roles.users.editRolesForm.rolesLabel}
        value={roleIds}
        onChange={setRoleIds}
        options={roles.map((role) => ({ value: role.id, label: role.name }))}
      />
    </Modal>
  );
}

export function UsersSection({ roles, isCompanyAdmin, currentUserId }: UsersSectionProps) {
  const toast = useToast();
  const usersQuery = useUsersQuery();
  const resetPasswordMutation = useResetUserPasswordMutation();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SafeUser | null>(null);
  const [resetResult, setResetResult] = useState<{ email: string; password: string } | null>(null);

  function handleResetPassword(user: SafeUser) {
    resetPasswordMutation.mutate(user.id, {
      onSuccess: (res) => {
        setResetResult({ email: user.email, password: res.temporaryPassword });
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  }

  const columns: TableColumn<SafeUser>[] = [
    { key: 'name', header: tr.settings.roles.users.nameColumn, render: (u) => u.name },
    { key: 'email', header: tr.settings.roles.users.emailColumn, render: (u) => u.email },
    {
      key: 'roles',
      header: tr.settings.roles.users.rolesColumn,
      render: (u) => (
        <div className="flex flex-wrap gap-1">
          {u.roles.map((role) => (
            <Badge key={role.id}>{role.name}</Badge>
          ))}
        </div>
      ),
    },
    ...(isCompanyAdmin
      ? [
          {
            key: 'actions',
            header: tr.settings.roles.users.actionsColumn,
            className: 'text-right',
            render: (u: SafeUser) => (
              <div className="flex justify-end gap-2">
                {u.id !== currentUserId && (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={resetPasswordMutation.isPending}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleResetPassword(u);
                    }}
                  >
                    {tr.settings.roles.users.resetPasswordButton}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={(event) => {
                    event.stopPropagation();
                    setEditingUser(u);
                  }}
                >
                  {tr.settings.roles.users.editRolesButton}
                </Button>
              </div>
            ),
          } satisfies TableColumn<SafeUser>,
        ]
      : []),
  ];

  return (
    <section>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-app-text">{tr.settings.roles.users.title}</h2>
          <p className="text-sm text-app-muted">{tr.settings.roles.users.subtitle}</p>
        </div>
        {isCompanyAdmin && (
          <Button type="button" onClick={() => setInviteOpen(true)}>
            {tr.settings.roles.users.inviteButton}
          </Button>
        )}
      </div>

      <Table
        columns={columns}
        data={usersQuery.data ?? []}
        keyField={(u) => u.id}
        isLoading={usersQuery.isPending}
      />

      {inviteOpen && <AddUserModal roles={roles} onClose={() => setInviteOpen(false)} />}
      {editingUser && (
        <EditUserRolesModal user={editingUser} roles={roles} onClose={() => setEditingUser(null)} />
      )}
      {resetResult && (
        <CredentialsResultModal
          title={tr.settings.roles.users.credentialsResult.resetTitle}
          email={resetResult.email}
          password={resetResult.password}
          onClose={() => setResetResult(null)}
        />
      )}
    </section>
  );
}
