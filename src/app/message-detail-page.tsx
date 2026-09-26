import { ArrowLeft, ChevronDown, ChevronUp, Link2, Paperclip, Star } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { useMeQuery } from '../features/auth/use-auth';
import { formatFileSize } from '../features/crm/format-file-size';
import { MessageComposeForm } from '../features/crm/message-compose-form';
import { RELATED_ENTITY_PATH } from '../features/crm/message-related-entity-paths';
import {
  useAssignableMessageUsersQuery,
  useConversationQuery,
  useSetConversationReadMutation,
  useSetConversationStarMutation,
} from '../features/crm/use-messages';
import type { Message, MessageRelatedEntity } from '../lib/api';
import { tr } from '../i18n/tr';

interface ConversationMessageItemProps {
  message: Message;
  defaultOpen: boolean;
  currentUserId: string | undefined;
  displayUserName: (userId: string) => string;
}

function initialsFor(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
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
  const senderName = displayUserName(message.senderId);

  return (
    <div className="overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-app-primary/15 text-xs font-semibold text-app-primary">
          {initialsFor(senderName)}
        </span>
        <span className="flex min-w-0 flex-1 items-baseline gap-2">
          <span className={isUnread ? 'font-bold text-app-text' : 'font-semibold text-app-text'}>
            {senderName}
          </span>
          {!open && <span className="truncate text-sm text-app-muted">{message.body}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-2 text-xs text-app-muted">
          {new Date(message.sentAt).toLocaleString('tr-TR')}
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 pl-[3.25rem]">
          <p className="text-xs text-app-muted">
            <span className="font-medium text-app-text">{tr.crm.messages.recipientsColumn}:</span>{' '}
            {message.recipients.map((recipient) => displayUserName(recipient.userId)).join(', ')}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-app-text">
            {message.body}
          </p>
          {message.attachments.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-app-muted">
                {tr.crm.messages.detail.attachmentsLabel}
              </p>
              <ul className="mt-1 flex flex-col gap-1">
                {message.attachments.map((attachment) => (
                  <li key={attachment.id}>
                    <a
                      href={attachment.url ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={tr.crm.messages.detail.downloadAttachmentAria}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-app-border bg-app-bg-muted px-2.5 py-1 text-sm text-app-primary hover:underline"
                    >
                      <Paperclip size={14} />
                      {attachment.fileName} ({formatFileSize(attachment.sizeBytes)})
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function MessageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const conversationId = id ?? '';
  const navigate = useNavigate();
  const meQuery = useMeQuery();
  const conversationQuery = useConversationQuery(conversationId);
  const usersQuery = useAssignableMessageUsersQuery();
  const readMutation = useSetConversationReadMutation();
  const starMutation = useSetConversationStarMutation();
  const [replyMode, setReplyMode] = useState<'reply' | 'replyAll' | null>(null);

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
    if (hasUnread && !readMutation.isPending) {
      readMutation.mutate({ conversationId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnread, conversationId]);

  // Tumune Yanitla: konusma boyunca gecen TUM katilimcilar (kendisi haric).
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

  // Yanitla: sadece son mesajin "karsi tarafi" - gonderen ben degilsem gonderen,
  // bensem son mesajin alicilari (mail'deki "Reply" ile ayni mantik).
  const replyToUserIds = useMemo(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return [];
    if (lastMessage.senderId !== currentUserId) return [lastMessage.senderId];
    const others = lastMessage.recipients
      .map((recipient) => recipient.userId)
      .filter((userId) => userId !== currentUserId);
    return others.length > 0 ? others : otherParticipantIds;
  }, [messages, currentUserId, otherParticipantIds]);

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
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => navigate('/mesajlar')}
          className="flex w-fit cursor-pointer items-center gap-1.5 text-sm text-app-brand transition-transform hover:translate-y-0.5"
        >
          <ArrowLeft size={16} />
          {tr.crm.messages.detail.back}
        </button>

        <div className="rounded-xl border border-app-border bg-app-surface p-5 shadow-sm">
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={() =>
                starMutation.mutate({ conversationId, starred: !conversation.starred })
              }
              disabled={starMutation.isPending}
              aria-label={
                conversation.starred
                  ? tr.crm.messages.detail.unstarAria
                  : tr.crm.messages.detail.starAria
              }
              aria-pressed={conversation.starred}
              className="mt-0.5 cursor-pointer text-app-muted hover:text-app-text disabled:cursor-not-allowed"
            >
              <Star
                size={18}
                className={conversation.starred ? 'fill-yellow-400 text-yellow-400' : undefined}
              />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold text-app-text">{messages[0]!.subject}</h1>
              <p className="mt-0.5 text-xs text-app-muted">
                {tr.crm.messages.detail.messageCount(messages.length)}
              </p>
            </div>
          </div>

          {conversation.relatedEntity && conversation.relatedEntityId && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-app-primary/30 bg-app-primary/10 px-4 py-3 text-base text-app-text">
              <Link2 size={16} className="shrink-0" />
              <span>
                {tr.crm.messages.detail.relatedBannerPrefix}{' '}
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `${RELATED_ENTITY_PATH[conversation.relatedEntity as MessageRelatedEntity]}/${conversation.relatedEntityId}`,
                    )
                  }
                  className="cursor-pointer underline hover:text-app-primary"
                >
                  {conversation.relatedEntityLabel ??
                    tr.crm.messages.relatedEntityOptions[conversation.relatedEntity]}
                </button>{' '}
                {tr.crm.messages.detail.relatedBannerSuffix(
                  tr.crm.messages.relatedEntitySuffix[conversation.relatedEntity],
                )}
              </span>
            </div>
          )}

          {otherParticipantIds.length > 0 && (
            <div className="mt-4 flex gap-2 border-t border-app-border pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setReplyMode(replyMode === 'reply' ? null : 'reply')}
              >
                {tr.crm.messages.detail.replyButton}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setReplyMode(replyMode === 'replyAll' ? null : 'replyAll')}
              >
                {tr.crm.messages.detail.replyAllButton}
              </Button>
            </div>
          )}
        </div>

        {replyMode && (
          <div className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
            <MessageComposeForm
              key={replyMode}
              mode="reply"
              conversationId={conversationId}
              defaultToUserIds={replyMode === 'replyAll' ? otherParticipantIds : replyToUserIds}
              onCancel={() => setReplyMode(null)}
              onSuccess={() => setReplyMode(null)}
            />
          </div>
        )}

        <div className="flex flex-col gap-3">
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
      </div>
    </AppShell>
  );
}
