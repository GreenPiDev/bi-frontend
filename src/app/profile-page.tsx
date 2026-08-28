import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { TextField } from '../components/ui/text-field';
import {
  useChangePasswordMutation,
  useProfileQuery,
  useUpdateProfileMutation,
} from '../features/auth/use-auth';
import {
  changePasswordFormSchema,
  updateProfileFormSchema,
  type ChangePasswordFormValues,
  type UpdateProfileFormValues,
} from '../features/auth/schemas';
import { ApiError } from '../lib/api';
import { tr } from '../i18n/tr';

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'long',
  timeStyle: 'short',
});

export function ProfilePage() {
  const profileQuery = useProfileQuery();

  return (
    <AppShell>
      <h1 className="text-xl font-bold text-app-text">{tr.profile.title}</h1>
      <p className="text-sm text-app-muted">{tr.profile.subtitle}</p>

      {profileQuery.isPending && <p className="mt-4 text-sm text-app-muted">{tr.common.loading}</p>}

      {profileQuery.data && (
        <div className="mt-6 flex flex-col gap-6">
          <section className="rounded-xl border border-app-border bg-app-surface p-4">
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
                <dt className="text-app-muted">{tr.profile.infoSection.createdAtLabel}</dt>
                <dd className="font-semibold text-app-text">
                  {dateFormatter.format(new Date(profileQuery.data.createdAt))}
                </dd>
              </div>
              <div>
                <dt className="text-app-muted">{tr.profile.infoSection.lastLoginLabel}</dt>
                <dd className="font-semibold text-app-text">
                  {profileQuery.data.lastLoginAt
                    ? dateFormatter.format(new Date(profileQuery.data.lastLoginAt))
                    : tr.profile.infoSection.never}
                </dd>
              </div>
            </dl>
          </section>

          <ProfileEditForm name={profileQuery.data.name} email={profileQuery.data.email} />

          <ChangePasswordForm />
        </div>
      )}
    </AppShell>
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
    <section className="rounded-xl border border-app-border bg-app-surface p-4">
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
    <section className="rounded-xl border border-app-border bg-app-surface p-4">
      <h2 className="mb-4 text-base font-bold text-app-text">{tr.profile.passwordSection.title}</h2>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <FormError message={apiErrorMessage} />
        {changePasswordMutation.isSuccess && (
          <p className="text-sm font-medium text-app-brand">{tr.profile.passwordSection.success}</p>
        )}
        <TextField
          label={tr.profile.passwordSection.currentLabel}
          type="password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...registerField('currentPassword')}
        />
        <TextField
          label={tr.profile.passwordSection.newLabel}
          type="password"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          {...registerField('newPassword')}
        />
        <TextField
          label={tr.profile.passwordSection.newConfirmLabel}
          type="password"
          autoComplete="new-password"
          error={errors.newPasswordConfirm?.message}
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
