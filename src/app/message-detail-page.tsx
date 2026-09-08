import { ArrowLeft, ChevronDown, ChevronUp, Link2, Send } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { useToast } from '../components/ui/toast-context';
import { useMeQuery } from '../features/auth/use-auth';
import {
  useAssignableMessageUsersQuery,
  useConversationQuery,
  useCreateMessageMutation,
  useMarkConversationReadMutation,
} from '../features/crm/use-messages';
import { ApiError, type Message, type MessageRelatedEntity } from '../lib/api';
import { tr } from '../i18n/tr';

const RELATED_ENTITY_PATH: Record<MessageRelatedEntity, string> = {
  PROJECT: '/projeler',
  QUOTE: '/teklifler',
  INTERACTION: '/gorusmeler',
};

interface ConversationMessageItemProps {
  message: Message;
  defaultOpen: boolean;
  currentUserId: string | undefined;
  displayUserName: (userId: string) => string;
}

function ConversationMessageItem({
  message,
  defaultOpen,
  currentUserId,
  displayUserName,
}: ConversationMessageItemProps) {
  const [open, setOpen] = useState(defaultOpen);
  const isUnread = message.recipients.some(
    (recipient) => recipient.userId === currentUserId && !recipient.readAt,
  );

  return (
    <div className="rounded-xl border border-app-border bg-app-surface">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left"
      >
        <span className="flex min-w-0 items-center gap-2 text-sm">
          <span className={isUnread ? 'font-bold text-app-text' : 'font-semibold text-app-text'}>
            {displayUserName(message.senderId)}
          </span>
          {!open && <span className="truncate text-app-muted">{message.body}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-2 text-xs text-app-muted">
          {new Date(message.sentAt).toLocaleString('tr-TR')}
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>
      {open && (
        <div className="border-t border-app-border px-5 py-4">
          <p className="text-sm text-app-muted">
            <span className="font-semibold text-app-text">{tr.crm.messages.recipientsColumn}:</span>{' '}
            {message.recipients.map((recipient) => displayUserName(recipient.userId)).join(', ')}
          </p>
          <p className="mt-3 whitespace-pre-wrap text-sm text-app-text">{message.body}</p>
        </div>
      )}
    </div>
  );
}

export function MessageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const conversationId = id ?? '';
  const navigate = useNavigate();
  const toast = useToast();
  const meQuery = useMeQuery();
  const conversationQuery = useConversationQuery(conversationId);
  const usersQuery = useAssignableMessageUsersQuery();
  const markReadMutation = useMarkConversationReadMutation(conversationId);
  const createMutation = useCreateMessageMutation();
  const [replyBody, setReplyBody] = useState('');

  const currentUserId = meQuery.data?.id;
  const conversation = conversationQuery.data;
  const messages = useMemo(() => conversation?.messages ?? [], [conversation]);

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

  const hasUnread = messages.some((message) =>
    message.recipients.some((recipient) => recipient.userId === currentUserId && !recipient.readAt),
  );

  useEffect(() => {
    if (hasUnread && !markReadMutation.isPending) {
      markReadMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnread, conversationId]);

  const otherParticipantIds = useMemo(() => {
    const ids = new Set<string>();
    for (const message of messages) {
      ids.add(message.senderId);
      for (const recipient of message.recipients) {
        ids.add(recipient.userId);
      }
    }
    if (currentUserId) ids.delete(currentUserId);
    return Array.from(ids);
  }, [messages, currentUserId]);

  function handleReplySubmit() {
    const body = replyBody.trim();
    if (!body || otherParticipantIds.length === 0 || createMutation.isPending) return;

    createMutation.mutate(
      { body, toUserIds: otherParticipantIds, conversationId },
      {
        onSuccess: () => {
          setReplyBody('');
          toast.success(tr.crm.messages.detail.replySuccess);
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  }

  if (conversationQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-app-muted">{tr.crm.messages.loading}</p>
      </AppShell>
    );
  }

  if (!conversation || messages.length === 0) {
    return null;
  }

  const lastIndex = messages.length - 1;

  return (
    <AppShell>
      <button
        type="button"
        onClick={() => navigate('/mesajlar')}
        className="flex cursor-pointer items-center gap-1.5 text-sm text-app-brand underline transition-transform hover:translate-y-0.5"
      >
        <ArrowLeft size={16} />
        {tr.crm.messages.detail.back}
      </button>

      {conversation.relatedEntity && conversation.relatedEntityId && (
        <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-app-primary/30 bg-app-primary/10 px-4 py-3 text-sm">
          <span className="flex items-center gap-2 text-app-text">
            <Link2 size={16} />
            {tr.crm.messages.detail.relatedBanner(
              tr.crm.messages.relatedEntityOptions[conversation.relatedEntity],
            )}
          </span>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              navigate(
                `${RELATED_ENTITY_PATH[conversation.relatedEntity as MessageRelatedEntity]}/${conversation.relatedEntityId}`,
              )
            }
          >
            {tr.crm.messages.detail.goToRecord}
          </Button>
        </div>
      )}

      <p className="mt-4 text-xs text-app-muted">
        {tr.crm.messages.detail.messageCount(messages.length)}
      </p>

      <div className="mt-2 flex flex-col gap-2">
        {messages.map((message, index) => (
          <ConversationMessageItem
            key={message.id}
            message={message}
            defaultOpen={index === lastIndex}
            currentUserId={currentUserId}
            displayUserName={displayUserName}
          />
        ))}
      </div>

      {otherParticipantIds.length > 0 && (
        <form
          className="mt-4 flex items-center gap-2 rounded-xl border border-app-border bg-app-surface p-3"
          onSubmit={(event) => {
            event.preventDefault();
            handleReplySubmit();
          }}
        >
          <input
            type="text"
            value={replyBody}
            onChange={(event) => setReplyBody(event.target.value)}
            placeholder={tr.crm.messages.detail.replyPlaceholder}
            className="flex-1 rounded-lg border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text outline-none focus:border-app-brand"
          />
          <Button type="submit" disabled={createMutation.isPending || !replyBody.trim()}>
            <span className="flex items-center gap-1.5">
              <Send size={15} />
              {createMutation.isPending
                ? tr.crm.messages.detail.replySending
                : tr.crm.messages.detail.replySend}
            </span>
          </Button>
        </form>
      )}
    </AppShell>
  );
}
