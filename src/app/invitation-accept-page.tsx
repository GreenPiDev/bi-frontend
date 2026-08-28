import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthLayout } from '../components/ui/auth-layout';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { TextField } from '../components/ui/text-field';
import { useAcceptInvitationMutation } from '../features/auth/use-auth';
import {
  acceptInvitationFormSchema,
  type AcceptInvitationFormValues,
} from '../features/auth/schemas';
import { ApiError, getInvitation } from '../lib/api';
import { tr } from '../i18n/tr';

export function InvitationAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const acceptMutation = useAcceptInvitationMutation();

  const invitationQuery = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => getInvitation(token as string),
    enabled: Boolean(token),
    retry: false,
  });

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<AcceptInvitationFormValues>({
    resolver: zodResolver(acceptInvitationFormSchema),
  });

  const onSubmit = handleSubmit((values) => {
    if (!token) return;
    acceptMutation.mutate(
      { token, input: values },
      { onSuccess: () => navigate('/', { replace: true }) },
    );
  });

  if (invitationQuery.isPending) {
    return (
      <AuthLayout>
        <p className="text-sm text-app-muted">{tr.auth.invitationLoading}</p>
      </AuthLayout>
    );
  }

  if (invitationQuery.isError || !invitationQuery.data) {
    return (
      <AuthLayout>
        <FormError message={tr.auth.invitationNotFound} />
      </AuthLayout>
    );
  }

  const invitation = invitationQuery.data;

  if (invitation.expired) {
    return (
      <AuthLayout>
        <FormError message={tr.auth.invitationExpired} />
      </AuthLayout>
    );
  }

  const apiErrorMessage =
    acceptMutation.error instanceof ApiError ? acceptMutation.error.message : undefined;

  return (
    <AuthLayout>
      <p className="mb-2 text-xs font-bold tracking-[0.12em] text-app-brand uppercase">
        {tr.auth.eyebrow}
      </p>
      <h1 className="mb-1 text-2xl font-bold text-app-text">{tr.auth.invitationTitle}</h1>
      <p className="mb-7 text-sm text-app-muted">
        {tr.auth.invitationSubtitleFor(invitation.tenantName, invitation.roleNames.join(', '))}
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <FormError message={apiErrorMessage} />
        <TextField label={tr.auth.fields.email} value={invitation.email} disabled readOnly />
        <TextField
          label={tr.auth.fields.name}
          autoComplete="name"
          error={errors.name?.message}
          {...registerField('name')}
        />
        <TextField
          label={tr.auth.fields.password}
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...registerField('password')}
        />
        <Button type="submit" disabled={acceptMutation.isPending} className="mt-1">
          {acceptMutation.isPending ? tr.auth.invitationSubmitting : tr.auth.invitationSubmit}
        </Button>
      </form>
    </AuthLayout>
  );
}
