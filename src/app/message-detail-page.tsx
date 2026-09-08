import { ArrowLeft, Link2 } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { useMeQuery } from '../features/auth/use-auth';
import {
  useAssignableMessageUsersQuery,
  useMarkMessageReadMutation,
  useMessageQuery,
} from '../features/crm/use-messages';
import type { MessageRelatedEntity } from '../lib/api';
import { tr } from '../i18n/tr';

const RELATED_ENTITY_PATH: Record<MessageRelatedEntity, string> = {
  PROJECT: '/projeler',
  QUOTE: '/teklifler',
  INTERACTION: '/gorusmeler',
};

export function MessageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const meQuery = useMeQuery();
  const messageQuery = useMessageQuery(id ?? '');
  const usersQuery = useAssignableMessageUsersQuery();
  const markReadMutation = useMarkMessageReadMutation(id ?? '');

  const currentUserId = meQuery.data?.id;
  const message = messageQuery.data;

  const userNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const user of usersQuery.data ?? []) {
      map.set(user.id, user.name);
    }
    return map;
  }, [usersQuery.data]);

  function displayUserName(userId: string): string {
    if (userId === currentUserId) return tr.crm.messages.you;
    return userNameById.get(userId) ?? userId;
  }

  const myRecipient = message?.recipients.find((recipient) => recipient.userId === currentUserId);

  useEffect(() => {
    if (myRecipient && !myRecipient.readAt && !markReadMutation.isPending) {
      markReadMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myRecipient?.id, myRecipient?.readAt]);

  if (messageQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-app-muted">{tr.crm.messages.loading}</p>
      </AppShell>
    );
  }

  if (!message) {
    return null;
  }

  return (
    <AppShell>
      <button
        type="button"
        onClick={() => navigate('/mesajlar')}
        className="flex items-center gap-1.5 text-sm text-app-muted hover:text-app-text"
      >
        <ArrowLeft size={16} />
        {tr.crm.messages.detail.back}
      </button>

      {message.relatedEntity && message.relatedEntityId && (
        <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-app-primary/30 bg-app-primary/10 px-4 py-3 text-sm">
          <span className="flex items-center gap-2 text-app-text">
            <Link2 size={16} />
            {tr.crm.messages.detail.relatedBanner(
              tr.crm.messages.relatedEntityOptions[message.relatedEntity],
            )}
          </span>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              navigate(
                `${RELATED_ENTITY_PATH[message.relatedEntity as MessageRelatedEntity]}/${message.relatedEntityId}`,
              )
            }
          >
            {tr.crm.messages.detail.goToRecord}
          </Button>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-app-border bg-app-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-app-muted">
          <span>
            <span className="font-semibold text-app-text">{tr.crm.messages.senderColumn}:</span>{' '}
            {displayUserName(message.senderId)}
          </span>
          <span>{new Date(message.sentAt).toLocaleString('tr-TR')}</span>
        </div>
        <p className="mt-2 text-sm text-app-muted">
          <span className="font-semibold text-app-text">{tr.crm.messages.recipientsColumn}:</span>{' '}
          {message.recipients.map((recipient) => displayUserName(recipient.userId)).join(', ')}
        </p>
        <p className="mt-4 whitespace-pre-wrap text-sm text-app-text">{message.body}</p>
      </div>
    </AppShell>
  );
}
