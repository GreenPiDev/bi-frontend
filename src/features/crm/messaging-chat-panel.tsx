import { clsx } from 'clsx';
import { Link2, Send, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMeQuery } from '../auth/use-auth';
import {
  useConversationQuery,
  useCreateMessageMutation,
  useMarkConversationReadMutation,
} from './use-messages';
import type { MessageRelatedEntity } from '../../lib/api';
import { tr } from '../../i18n/tr';

const RELATED_ENTITY_PATH: Record<MessageRelatedEntity, string> = {
  PROJECT: '/projeler',
  QUOTE: '/teklifler',
  INTERACTION: '/gorusmeler',
};

interface MessagingChatPanelProps {
  conversationId: string;
  closing: boolean;
  onClose: () => void;
  userNameById: Map<string, string>;
}

/** Widget'in tek sohbet penceresi - secilen konusmanin tum gecmisini gosterir, yanitlar
 * ayni conversationId'ye baglanir (bkz. /mesajlar/:id detay sayfasindaki ayni desen). */
export function MessagingChatPanel({
  conversationId,
  closing,
  onClose,
  userNameById,
}: MessagingChatPanelProps) {
  const navigate = useNavigate();
  const meQuery = useMeQuery();
  const currentUserId = meQuery.data?.id;
  const conversationQuery = useConversationQuery(conversationId);
  const markReadMutation = useMarkConversationReadMutation(conversationId);
  const createMutation = useCreateMessageMutation();
  const [replyBody, setReplyBody] = useState('');

  const messages = useMemo(() => conversationQuery.data?.messages ?? [], [conversationQuery.data]);

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

  function handleSendReply() {
    const body = replyBody.trim();
    if (!body || otherParticipantIds.length === 0 || createMutation.isPending) return;

    createMutation.mutate(
      { body, toUserIds: otherParticipantIds, conversationId },
      {
        onSuccess: () => {
          setReplyBody('');
        },
      },
    );
  }

  const relatedEntity = conversationQuery.data?.relatedEntity;
  const relatedEntityId = conversationQuery.data?.relatedEntityId;

  const lastMessage = messages[messages.length - 1];
  const counterpartName = lastMessage
    ? lastMessage.senderId === currentUserId
      ? lastMessage.recipients.map((recipient) => displayUserName(recipient.userId)).join(', ')
      : displayUserName(lastMessage.senderId)
    : '';

  return (
    <div
      className={clsx(
        'flex h-[28rem] w-80 flex-col overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-xl',
        closing ? 'animate-widget-panel-out' : 'animate-widget-panel-in',
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-app-border px-4 py-3">
        <span className="truncate text-sm font-semibold text-app-text">{counterpartName}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label={tr.crm.messages.widget.closeAria}
          className="shrink-0 text-app-muted hover:text-app-text"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {conversationQuery.isPending && (
          <p className="text-xs text-app-muted">{tr.crm.messages.loading}</p>
        )}
        {relatedEntity && relatedEntityId && (
          <button
            type="button"
            onClick={() => navigate(`${RELATED_ENTITY_PATH[relatedEntity]}/${relatedEntityId}`)}
            className="flex w-full items-center gap-1.5 rounded-lg border border-app-primary/30 bg-app-primary/10 px-2.5 py-1.5 text-left text-xs text-app-text hover:bg-app-primary/15"
          >
            <Link2 size={13} className="shrink-0" />
            <span className="truncate">
              {tr.crm.messages.detail.relatedBanner(
                tr.crm.messages.relatedEntityOptions[relatedEntity],
              )}
            </span>
          </button>
        )}
        {messages.map((message) => {
          const isMine = message.senderId === currentUserId;
          return (
            <div key={message.id} className={clsx('max-w-[85%] space-y-0.5', isMine && 'ml-auto')}>
              <div
                className={clsx(
                  'rounded-lg px-3 py-2 text-sm',
                  isMine ? 'bg-app-brand text-white' : 'bg-app-bg-muted text-app-text',
                )}
              >
                {message.body}
              </div>
              <p className={clsx('text-[10px] text-app-muted', isMine && 'text-right')}>
                {!isMine && `${displayUserName(message.senderId)} · `}
                {new Date(message.sentAt).toLocaleString('tr-TR')}
              </p>
            </div>
          );
        })}
      </div>

      <form
        className="flex items-center gap-2 border-t border-app-border p-3"
        onSubmit={(event) => {
          event.preventDefault();
          handleSendReply();
        }}
      >
        <input
          type="text"
          value={replyBody}
          onChange={(event) => setReplyBody(event.target.value)}
          placeholder={tr.crm.messages.widget.replyPlaceholder}
          className="flex-1 rounded-lg border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text outline-none focus:border-app-brand"
        />
        <button
          type="submit"
          disabled={createMutation.isPending || !replyBody.trim()}
          aria-label={tr.crm.messages.widget.replySend}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-app-brand text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
