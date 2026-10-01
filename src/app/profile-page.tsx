import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { FormError } from '../components/ui/form-error';
import { HorizontalTabPanel, type HorizontalTabItem } from '../components/ui/horizontal-tab-panel';
import { MultiSelect } from '../components/ui/multi-select';
import { PageHelp } from '../components/ui/page-help';
import { PasswordField } from '../components/ui/password-field';
import { Select } from '../components/ui/select';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import {
  useChangePasswordMutation,
  useDeleteAvatarMutation,
  useProfileQuery,
  useUpdateProfileMutation,
  useUploadAvatarMutation,
} from '../features/auth/use-auth';
import {
  useMyCalendarGrantsQuery,
  useUpdateMyCalendarGrantsMutation,
} from '../features/crm/use-calendar-shares';
import { useAssignableCalendarUsersQuery } from '../features/crm/use-calendar-events';
import {
  changePasswordFormSchema,
  updateProfileFormSchema,
  type ChangePasswordFormValues,
  type UpdateProfileFormValues,
} from '../features/auth/schemas';
import { resolveNotificationRoute } from '../features/notifications/notification-routes';
import {
  useNotificationsQuery,
  useSetNotificationReadMutation,
} from '../features/notifications/use-notifications';
import { ApiError, type CalendarShareUser, type Notification } from '../lib/api';
import { tr } from '../i18n/tr';

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'long',
  timeStyle: 'short',
});

const MAX_AVATAR_SIZE_BYTES = 1.5 * 1024 * 1024;
const ACCEPTED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function ProfilePage() {
  const profileQuery = useProfileQuery();

  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-app-text">{tr.profile.title}</h1>
        <PageHelp text={tr.help.profile} />
      </div>
      <p className="text-sm text-app-muted">{tr.profile.subtitle}</p>

      {profileQuery.isPending && <p className="mt-4 text-sm text-app-muted">{tr.common.loading}</p>}

      {profileQuery.data && (
        <div className="mt-6">
          <HorizontalTabPanel
            queryParam="tab"
            tabs={
              [
                {
                  key: 'general',
                  label: tr.profile.tabs.general,
                  content: (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                      <AvatarSection
                        avatarUrl={profileQuery.data.avatarUrl}
                        name={profileQuery.data.name}
                      />

                      <section className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
                        <h2 className="mb-4 text-base font-bold text-app-text">
                          {tr.profile.infoSection.title}
                        </h2>
                        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                          <div>
                            <dt className="text-app-muted">{tr.profile.infoSection.roleLabel}</dt>
                            <dd className="font-semibold text-app-text">
                              {profileQuery.data.roles.map((role) => role.name).join(', ')}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-app-muted">{tr.profile.infoSection.statusLabel}</dt>
                            <dd className="font-semibold text-app-text">
                              {profileQuery.data.isActive
                                ? tr.profile.infoSection.statusActive
                                : tr.profile.infoSection.statusInactive}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-app-muted">
                              {tr.profile.infoSection.createdAtLabel}
                            </dt>
                            <dd className="font-semibold text-app-text">
                              {dateFormatter.format(new Date(profileQuery.data.createdAt))}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-app-muted">
                              {tr.profile.infoSection.lastLoginLabel}
                            </dt>
                            <dd className="font-semibold text-app-text">
                              {profileQuery.data.lastLoginAt
                                ? dateFormatter.format(new Date(profileQuery.data.lastLoginAt))
                                : tr.profile.infoSection.never}
                            </dd>
                          </div>
                        </dl>
                      </section>

                      <ProfileEditForm
                        name={profileQuery.data.name}
                        email={profileQuery.data.email}
                      />
                    </div>
                  ),
                },
                {
                  key: 'listSettings',
                  label: tr.profile.tabs.listSettings,
                  content: (
                    <ListSettingsSection defaultPageSize={profileQuery.data.defaultPageSize} />
                  ),
                },
                {
                  key: 'security',
                  label: tr.profile.tabs.security,
                  content: (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                      <ChangePasswordForm />
                      <CalendarSharingSection currentUserId={profileQuery.data.id} />
                    </div>
                  ),
                },
                {
                  key: 'notifications',
                  label: tr.profile.tabs.notifications,
                  content: <NotificationsSection />,
                },
              ] satisfies HorizontalTabItem[]
            }
          />
        </div>
      )}
    </AppShell>
  );
}

function AvatarSection({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  const toast = useToast();
  const strings = tr.profile.avatarSection;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [removing, setRemoving] = useState(false);
  const uploadMutation = useUploadAvatarMutation();
  const deleteMutation = useDeleteAvatarMutation();

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
      toast.error(strings.unsupportedType);
      return;
    }
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      toast.error(strings.tooLarge);
      return;
    }
    uploadMutation.mutate(file, {
      onSuccess: () => toast.success(strings.uploadSuccess),
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  }

  function handleConfirmRemove() {
    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(strings.removeSuccess);
        setRemoving(false);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        setRemoving(false);
      },
    });
  }

  return (
    <section className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
      <h2 className="mb-4 text-base font-bold text-app-text">{strings.title}</h2>
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          <img src={avatarUrl} alt={strings.alt} className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-app-bg-muted text-2xl font-bold text-app-muted">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex flex-col gap-2">
          {!avatarUrl && <p className="text-xs text-app-muted">{strings.noAvatar}</p>}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={uploadMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadMutation.isPending
                ? strings.uploading
                : avatarUrl
                  ? strings.replaceButton
                  : strings.uploadButton}
            </Button>
            {avatarUrl && (
              <Button type="button" variant="danger" onClick={() => setRemoving(true)}>
                {strings.removeButton}
              </Button>
            )}
          </div>
        </div>
      </div>

      {removing && (
        <ConfirmModal
          title={strings.removeConfirmTitle}
          message={strings.removeConfirmMessage}
          confirmLabel={strings.removeButton}
          isPending={deleteMutation.isPending}
          onConfirm={handleConfirmRemove}
          onCancel={() => setRemoving(false)}
        />
      )}
    </section>
  );
}

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10' },
  { value: '25', label: '25' },
  { value: '50', label: '50' },
];

function ListSettingsSection({ defaultPageSize }: { defaultPageSize: number }) {
  const toast = useToast();
  const strings = tr.profile.listSettingsSection;
  const updateMutation = useUpdateProfileMutation();

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = Number(event.target.value) as 10 | 25 | 50;
    updateMutation.mutate(
      { defaultPageSize: value },
      {
        onSuccess: () => toast.success(strings.updateSuccess),
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  }

  return (
    <section className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
      <h2 className="mb-4 text-base font-bold text-app-text">{strings.title}</h2>
      <div className="max-w-xs">
        <Select
          label={strings.pageSizeLabel}
          hint={strings.pageSizeHint}
          options={PAGE_SIZE_OPTIONS}
          value={String(defaultPageSize)}
          onChange={handleChange}
          disabled={updateMutation.isPending}
        />
      </div>
    </section>
  );
}

function ProfileEditForm({ name, email }: { name: string; email: string }) {
  const updateMutation = useUpdateProfileMutation();
  const {
    register: registerField,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileFormSchema),
    values: { name, email },
  });

  useEffect(() => {
    reset({ name, email });
  }, [name, email, reset]);

  const onSubmit = handleSubmit((values) => {
    updateMutation.mutate(values);
  });

  const apiErrorMessage =
    updateMutation.error instanceof ApiError ? updateMutation.error.message : undefined;

  return (
    <section className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
      <h2 className="mb-4 text-base font-bold text-app-text">{tr.profile.editSection.title}</h2>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <FormError message={apiErrorMessage} />
        {updateMutation.isSuccess && (
          <p className="text-sm font-medium text-app-brand">{tr.profile.editSection.success}</p>
        )}
        <TextField
          label={tr.profile.editSection.nameLabel}
          autoComplete="name"
          error={errors.name?.message}
          {...registerField('name')}
        />
        <TextField
          label={tr.profile.editSection.emailLabel}
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...registerField('email')}
        />
        <Button type="submit" disabled={updateMutation.isPending} className="self-start">
          {updateMutation.isPending
            ? tr.profile.editSection.submitting
            : tr.profile.editSection.submit}
        </Button>
      </form>
    </section>
  );
}

function ChangePasswordForm() {
  const changePasswordMutation = useChangePasswordMutation();
  const {
    register: registerField,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
  });

  const onSubmit = handleSubmit((values) => {
    changePasswordMutation.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      { onSuccess: () => reset() },
    );
  });

  const apiErrorMessage =
    changePasswordMutation.error instanceof ApiError
      ? changePasswordMutation.error.message
      : undefined;

  return (
    <section className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
      <h2 className="mb-4 text-base font-bold text-app-text">{tr.profile.passwordSection.title}</h2>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <FormError message={apiErrorMessage} />
        {changePasswordMutation.isSuccess && (
          <p className="text-sm font-medium text-app-brand">{tr.profile.passwordSection.success}</p>
        )}
        <PasswordField
          label={tr.profile.passwordSection.currentLabel}
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          toggleLabels={tr.common.passwordToggle}
          {...registerField('currentPassword')}
        />
        <PasswordField
          label={tr.profile.passwordSection.newLabel}
          autoComplete="new-password"
          error={errors.newPassword?.message}
          toggleLabels={tr.common.passwordToggle}
          {...registerField('newPassword')}
        />
        <PasswordField
          label={tr.profile.passwordSection.newConfirmLabel}
          autoComplete="new-password"
          error={errors.newPasswordConfirm?.message}
          toggleLabels={tr.common.passwordToggle}
          {...registerField('newPasswordConfirm')}
        />
        <Button type="submit" disabled={changePasswordMutation.isPending} className="self-start">
          {changePasswordMutation.isPending
            ? tr.profile.passwordSection.submitting
            : tr.profile.passwordSection.submit}
        </Button>
      </form>
    </section>
  );
}

/** A2.3.1 G3'ün ajanda paylaşımı için ekli ad-hoc bölüm: kullanıcı, /ajanda
 * dropdown'ından ajandasını görebilecek kişileri (çoklu seçim) yönetir. Diğer
 * seçenekler `useAssignableCalendarUsersQuery` ile aynı desende tüm aktif tenant
 * kullanıcılarından gelir, sadece kendisi listeden çıkarılır. */
function CalendarSharingSection({ currentUserId }: { currentUserId: string }) {
  const toast = useToast();
  const strings = tr.profile.calendarSharingSection;
  const usersQuery = useAssignableCalendarUsersQuery();
  const grantsQuery = useMyCalendarGrantsQuery();
  const updateMutation = useUpdateMyCalendarGrantsMutation();

  const options = (usersQuery.data ?? [])
    .filter((user) => user.id !== currentUserId)
    .map((user) => ({ value: user.id, label: user.name }));
  const grantedUsers = grantsQuery.data ?? [];
  const value = grantedUsers.map((user) => user.id);

  function handleChange(viewerIds: string[]) {
    updateMutation.mutate(viewerIds, {
      onSuccess: () => toast.success(strings.updateSuccess),
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  }

  function handleRemove(userId: string) {
    handleChange(value.filter((id) => id !== userId));
  }

  const columns: TableColumn<CalendarShareUser>[] = [
    {
      key: 'name',
      header: strings.tableNameColumn,
      render: (user) => <span className="text-sm text-app-text">{user.name}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (user) => (
        <button
          type="button"
          aria-label={strings.removeAction}
          onClick={() => handleRemove(user.id)}
          disabled={updateMutation.isPending}
          className="text-app-muted hover:text-app-danger disabled:opacity-50"
        >
          <Trash2 size={16} />
        </button>
      ),
    },
  ];

  return (
    <section className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
      <h2 className="mb-4 text-base font-bold text-app-text">{strings.title}</h2>
      <MultiSelect
        label={strings.label}
        hint={strings.hint}
        placeholder={strings.placeholder}
        options={options}
        value={value}
        onChange={handleChange}
      />
      <div className="mt-4">
        <Table
          columns={columns}
          data={grantedUsers}
          keyField={(user) => user.id}
          isLoading={grantsQuery.isPending}
          loadingMessage={tr.common.loading}
          emptyMessage={strings.tableEmpty}
        />
      </div>
    </section>
  );
}

const notificationDateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'long',
  timeStyle: 'short',
});

/** /profile?tab=notifications - okunmus/okunmamis TUM bildirimlerin sayfalanmis
 * listesi (bkz. header'daki zil ikonu, ki o sadece okunmamislari gosterir). */
function NotificationsSection() {
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const navigate = useNavigate();
  const toast = useToast();
  const notificationsQuery = useNotificationsQuery({ page, pageSize });
  const setReadMutation = useSetNotificationReadMutation();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPending, setBulkPending] = useState(false);

  const rows = notificationsQuery.data?.data ?? [];

  function goToPage(newPage: number) {
    setSelectedIds(new Set());
    setPage(newPage);
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const allOnPageSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id));

  function toggleSelectAllOnPage() {
    setSelectedIds(allOnPageSelected ? new Set() : new Set(rows.map((row) => row.id)));
  }

  function handleSetRead(id: string, read: boolean) {
    setReadMutation.mutate(
      { id, read },
      {
        onSuccess: () => toast.success(tr.notifications.readStatusUpdateSuccess),
        onError: () => toast.error(tr.notifications.readStatusUpdateError),
      },
    );
  }

  async function handleBulkSetRead(read: boolean) {
    setBulkPending(true);
    try {
      const results = await Promise.allSettled(
        Array.from(selectedIds).map((id) => setReadMutation.mutateAsync({ id, read })),
      );
      const hasFailure = results.some((result) => result.status === 'rejected');
      if (hasFailure) {
        toast.error(tr.notifications.readStatusUpdateError);
      } else {
        toast.success(tr.notifications.readStatusUpdateSuccess);
      }
      setSelectedIds(new Set());
    } finally {
      setBulkPending(false);
    }
  }

  function handleRowClick(row: Notification) {
    const route = resolveNotificationRoute(row);
    if (route) navigate(route);
  }

  const columns: TableColumn<Notification>[] = [
    {
      key: 'select',
      header: '',
      className: 'w-8',
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          onChange={() => toggleSelected(row.id)}
          onClick={(event) => event.stopPropagation()}
          aria-label={tr.notifications.selectRowAria}
          className="accent-app-primary"
        />
      ),
    },
    {
      key: 'title',
      header: tr.profile.tabs.notifications,
      render: (row) => (
        <div>
          <p className={row.readAt ? 'text-app-muted' : 'font-semibold text-app-text'}>
            {row.title}
          </p>
          <p className="text-xs text-app-muted">
            {notificationDateFormatter.format(new Date(row.createdAt))}
          </p>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (row) => {
        const isPending = setReadMutation.isPending && setReadMutation.variables?.id === row.id;
        return row.readAt ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleSetRead(row.id, false);
            }}
            disabled={isPending}
            className="text-xs font-semibold text-app-primary hover:underline disabled:opacity-50"
          >
            {tr.notifications.markAsUnread}
          </button>
        ) : (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleSetRead(row.id, true);
            }}
            disabled={isPending}
            className="text-xs font-semibold text-app-primary hover:underline disabled:opacity-50"
          >
            {tr.notifications.markAsRead}
          </button>
        );
      },
    },
  ];

  return (
    <section className="p-4">
      <h2 className="mb-4 text-base font-bold text-app-text">{tr.notifications.fullListTitle}</h2>

      {rows.length > 0 && (
        <label className="mb-2 flex items-center gap-2 text-sm text-app-muted">
          <input
            type="checkbox"
            checked={allOnPageSelected}
            onChange={toggleSelectAllOnPage}
            aria-label={tr.notifications.selectAllAria}
            className="accent-app-primary"
          />
          {tr.notifications.selectAllAria}
        </label>
      )}

      {selectedIds.size > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-app-border bg-app-surface px-4 py-2.5">
          <span className="text-sm text-app-text">
            {tr.notifications.bulkBar.selectedCount(selectedIds.size)}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleBulkSetRead(true)}
              disabled={bulkPending}
            >
              {tr.notifications.bulkBar.markRead}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleBulkSetRead(false)}
              disabled={bulkPending}
            >
              {tr.notifications.bulkBar.markUnread}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSelectedIds(new Set())}
              disabled={bulkPending}
            >
              {tr.notifications.bulkBar.clearSelection}
            </Button>
          </div>
        </div>
      )}

      <Table
        columns={columns}
        data={rows}
        keyField={(row) => row.id}
        isLoading={notificationsQuery.isPending}
        loadingMessage={tr.common.loading}
        emptyMessage={tr.notifications.fullListEmpty}
        onRowClick={handleRowClick}
        getRowHref={(row) => resolveNotificationRoute(row)}
      />
      {notificationsQuery.data && notificationsQuery.data.meta.totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={notificationsQuery.data.meta.totalPages}
          total={notificationsQuery.data.meta.total}
          onPageChange={goToPage}
          onPrevious={() => goToPage(Math.max(1, page - 1))}
          onNext={() => goToPage(page + 1)}
        />
      )}
    </section>
  );
}
