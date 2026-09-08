import { clsx } from 'clsx';
import { Link2, Send, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMeQuery } from '../auth/use-auth';
import {
  useCreateMessageMutation,
  useMarkMessageReadMutation,
  useMessageQuery,
} from './use-messages';
import type { Message, MessageRelatedEntity } from '../../lib/api';
import { tr } from '../../i18n/tr';

const RELATED_ENTITY_PATH: Record<MessageRelatedEntity, string> = {
  PROJECT: '/projeler',
  QUOTE: '/teklifler',
  INTERACTION: '/gorusmeler',
};

interface MessagingChatPanelProps {
  messageId: string;
  closing: boolean;
  onClose: () => void;
  userNameById: Map<string, string>;
}

/** Widget'in tek sohbet penceresi - LinkedIn'deki surekli thread degil, secilen tek
 * `Message` kaydinin (ve o oturumda gonderilen yanitlarin) kompakt gorunumu; veri
 * modeli mesajlari birbirine baglamiyor (bkz. docs/VARSAYIMLAR.md), bu yuzden "yanit"
 * aslinda ayni alicilara giden yeni bir Message. */
export function MessagingChatPanel({
  messageId,
  closing,
  onClose,
  userNameById,
}: MessagingChatPanelProps) {
  const navigate = useNavigate();
  const meQuery = useMeQuery();
  const currentUserId = meQuery.data?.id;
  const messageQuery = useMessageQuery(messageId);
  const markReadMutation = useMarkMessageReadMutation(messageId);
  const createMutation = useCreateMessageMutation();
  const [replyBody, setReplyBody] = useState('');
  const [localReplies, setLocalReplies] = useState<Message[]>([]);

  // Farkli bir mesaja gecince onceki pencerenin yerel yanitlari sizmasin diye
  // render sirasinda senkron sifirlanir - chatbot-widget.tsx'teki `loadedForUserId`
  // deseninin ayni (bir effect icinde setState yerine).
  const [repliesForMessageId, setRepliesForMessageId] = useState(messageId);
  if (messageId !== repliesForMessageId) {
    setRepliesForMessageId(messageId);
    setLocalReplies([]);
  }

  const message = messageQuery.data;
  const myRecipient = message?.recipients.find((recipient) => recipient.userId === currentUserId);

  useEffect(() => {
    if (myRecipient && !myRecipient.readAt && !markReadMutation.isPending) {
      markReadMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myRecipient?.id, myRecipient?.readAt]);

  function displayUserName(userId: string): string {
    if (userId === currentUserId) return tr.crm.messages.you;
    return userNameById.get(userId) ?? userId;
  }

  function handleSendReply() {
    const body = replyBody.trim();
    if (!body || !message || createMutation.isPending) return;

    const isSender = message.senderId === currentUserId;
    const toUserIds = isSender
      ? message.recipients.map((recipient) => recipient.userId)
      : [message.senderId];

    createMutation.mutate(
      { body, toUserIds },
      {
        onSuccess: (created) => {
          setLocalReplies((prev) => [...prev, created]);
          setReplyBody('');
        },
      },
    );
  }

  const counterpartName = message
    ? message.senderId === currentUserId
      ? message.recipients.map((recipient) => displayUserName(recipient.userId)).join(', ')
      : displayUserName(message.senderId)
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
        {messageQuery.isPending && (
          <p className="text-xs text-app-muted">{tr.crm.messages.loading}</p>
        )}
        {message && (
          <>
            {message.relatedEntity && message.relatedEntityId && (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `${RELATED_ENTITY_PATH[message.relatedEntity as MessageRelatedEntity]}/${message.relatedEntityId}`,
                  )
                }
                className="flex w-full items-center gap-1.5 rounded-lg border border-app-primary/30 bg-app-primary/10 px-2.5 py-1.5 text-left text-xs text-app-text hover:bg-app-primary/15"
              >
                <Link2 size={13} className="shrink-0" />
                <span className="truncate">
                  {tr.crm.messages.detail.relatedBanner(
                    tr.crm.messages.relatedEntityOptions[message.relatedEntity],
                  )}
                </span>
              </button>
            )}
            <div className="max-w-[85%] rounded-lg bg-app-bg-muted px-3 py-2 text-sm text-app-text">
              {message.body}
            </div>
            <p className="text-[10px] text-app-muted">
              {displayUserName(message.senderId)} ·{' '}
              {new Date(message.sentAt).toLocaleString('tr-TR')}
            </p>
          </>
        )}
        {localReplies.map((reply) => (
          <div key={reply.id} className="ml-auto max-w-[85%] space-y-0.5">
            <div className="rounded-lg bg-app-brand px-3 py-2 text-sm text-white">{reply.body}</div>
            <p className="text-right text-[10px] text-app-muted">
              {new Date(reply.sentAt).toLocaleString('tr-TR')}
            </p>
          </div>
        ))}
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
