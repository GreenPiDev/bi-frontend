import { clsx } from 'clsx';
import { ArrowLeft, MessageCircle, Plus, Send, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMeQuery } from '../auth/use-auth';
import { tr } from '../../i18n/tr';
import { ConfirmModal } from '../../components/ui/confirm-modal';
import { IconActionButton } from '../../components/ui/icon-action-button';
import { useToast } from '../../components/ui/toast-context';
import type { ChatHistoryItem } from '../../lib/api';
import { ApiError } from '../../lib/api';
import { useIsMobilePortrait } from '../../lib/use-mobile-portrait';
import {
  useChatConversationQuery,
  useChatConversationsQuery,
  useCreateChatConversationMutation,
  useDeleteChatConversationMutation,
  useSendChatMessageMutation,
} from './use-chatbot';

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function ConversationListView({
  onSelect,
  onCreated,
}: {
  onSelect: (id: string) => void;
  onCreated: (id: string) => void;
}) {
  const toast = useToast();
  const conversationsQuery = useChatConversationsQuery(true);
  const createMutation = useCreateChatConversationMutation();
  const deleteMutation = useDeleteChatConversationMutation();
  const [deletingId, setDeletingId] = useState<string | undefined>(undefined);

  function handleCreate() {
    createMutation.mutate(undefined, {
      onSuccess: (conversation) => onCreated(conversation.id),
      onError: () => toast.error(tr.chatbot.createConversationError),
    });
  }

  function handleConfirmDelete() {
    if (!deletingId) return;
    deleteMutation.mutate(deletingId, {
      onSuccess: () => setDeletingId(undefined),
      onError: () => {
        toast.error(tr.chatbot.deleteConversationError);
        setDeletingId(undefined);
      },
    });
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-app-border px-4 py-3">
        <span className="text-sm font-semibold text-app-text">{tr.chatbot.conversationsTitle}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {conversationsQuery.isPending && (
          <p className="px-2 py-3 text-sm text-app-muted">{tr.chatbot.loadingConversations}</p>
        )}
        {conversationsQuery.data?.length === 0 && (
          <p className="px-2 py-3 text-sm text-app-muted">{tr.chatbot.emptyConversations}</p>
        )}
        {conversationsQuery.data?.map((conversation) => (
          <button
            key={conversation.id}
            type="button"
            onClick={() => onSelect(conversation.id)}
            className="group flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left hover:bg-app-bg-muted"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-app-text">
                {conversation.title ?? tr.chatbot.untitledConversation}
              </span>
              <span className="block text-xs text-app-muted">
                {dateFormatter.format(new Date(conversation.updatedAt))}
              </span>
            </span>
            <IconActionButton
              icon={Trash2}
              tooltip={tr.chatbot.deleteConversationTooltip}
              variant="danger"
              iconSize={16}
              className="opacity-0 group-hover:opacity-100"
              onClick={() => setDeletingId(conversation.id)}
            />
          </button>
        ))}
      </div>

      <div className="border-t border-app-border p-3">
        <button
          type="button"
          onClick={handleCreate}
          disabled={createMutation.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-app-brand px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          <Plus size={16} />
          {tr.chatbot.newConversationButton}
        </button>
      </div>

      {deletingId && (
        <ConfirmModal
          title={tr.chatbot.deleteConversationConfirmTitle}
          message={tr.chatbot.deleteConversationConfirmMessage}
          confirmLabel={tr.chatbot.deleteConversationConfirmButton}
          isPending={deleteMutation.isPending}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingId(undefined)}
        />
      )}
    </>
  );
}

function ConversationView({
  conversationId,
  onBack,
}: {
  conversationId: string;
  onBack: () => void;
}) {
  const navigate = useNavigate();
  const conversationQuery = useChatConversationQuery(conversationId);
  const mutation = useSendChatMessageMutation();
  const [messages, setMessages] = useState<ChatHistoryItem[]>([]);
  const [loadedForId, setLoadedForId] = useState<string | undefined>(undefined);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  if (conversationQuery.data && loadedForId !== conversationId) {
    setLoadedForId(conversationId);
    setMessages(conversationQuery.data.messages);
  }

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  function handleSend() {
    const message = input.trim();
    if (!message || mutation.isPending) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: message }]);

    mutation.mutate(
      { conversationId, message },
      {
        onSuccess: (result) => {
          setMessages((prev) => [...prev, { role: 'assistant', content: result.reply }]);
          if (result.navigateTo) {
            navigate(result.navigateTo);
          }
        },
        onError: (error) => {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: error instanceof ApiError ? error.message : tr.chatbot.error,
            },
          ]);
        },
      },
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 border-b border-app-border px-3 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label={tr.chatbot.backButtonLabel}
          className="text-app-muted hover:text-app-text"
        >
          <ArrowLeft size={18} />
        </button>
        <span className="flex-1 truncate text-sm font-semibold text-app-text">
          {conversationQuery.data?.title ?? tr.chatbot.untitledConversation}
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {conversationQuery.isPending && (
          <p className="text-sm text-app-muted">{tr.chatbot.loadingMessages}</p>
        )}
        {conversationQuery.data && messages.length === 0 && (
          <p className="text-sm text-app-muted">{tr.chatbot.emptyState}</p>
        )}
        {messages.map((item, index) => (
          <div
            key={index}
            className={
              item.role === 'user'
                ? 'ml-auto max-w-[85%] rounded-lg bg-app-brand px-3 py-2 text-sm text-white'
                : 'mr-auto max-w-[85%] rounded-lg bg-app-bg-muted px-3 py-2 text-sm text-app-text'
            }
          >
            {item.content}
          </div>
        ))}
        {mutation.isPending && <p className="text-xs text-app-muted">{tr.chatbot.thinking}</p>}
        <div ref={messagesEndRef} />
      </div>

      <form
        className="flex items-center gap-2 border-t border-app-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={tr.chatbot.inputPlaceholder}
          className="flex-1 rounded-lg border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text outline-none focus:border-app-brand"
        />
        <button
          type="submit"
          disabled={mutation.isPending || !input.trim()}
          aria-label={tr.chatbot.send}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-app-brand text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </form>
    </>
  );
}

export function ChatbotWidget() {
  const meQuery = useMeQuery();
  const userId = meQuery.data?.id;
  const isMobilePortrait = useIsMobilePortrait();
  const [open, setOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(undefined);
  const [loadedForUserId, setLoadedForUserId] = useState<string | undefined>(undefined);

  // Kullanici degistiginde (ornegin davet kabul akisi) onceki kullanicinin acik
  // konusmasi ekranda kalmasin diye listeye donulur - render sirasinda senkron
  // guncelleme (react-hooks/set-state-in-effect kuralini ihlal etmemek icin).
  if (userId !== loadedForUserId) {
    setLoadedForUserId(userId);
    setActiveConversationId(undefined);
  }

  return (
    <div className="flex flex-col items-end gap-3">
      {open && (
        <div
          className={clsx(
            'flex flex-col overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-xl',
            isMobilePortrait ? 'fixed inset-x-3 bottom-20 z-[115] h-[70vh]' : 'h-[28rem] w-80',
          )}
        >
          <div className="flex items-center justify-between border-b border-app-border px-4 py-2">
            <span className="text-sm font-semibold text-app-text">{tr.chatbot.title}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={tr.chatbot.closeButtonLabel}
              className="text-app-muted hover:text-app-text"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            {activeConversationId ? (
              <ConversationView
                conversationId={activeConversationId}
                onBack={() => setActiveConversationId(undefined)}
              />
            ) : (
              <ConversationListView
                onSelect={setActiveConversationId}
                onCreated={setActiveConversationId}
              />
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? tr.chatbot.closeButtonLabel : tr.chatbot.openButtonLabel}
        className="inline-flex h-14 w-14 shrink-0 items-center justify-center self-end rounded-full bg-app-brand text-white shadow-lg hover:bg-app-brand-dark"
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
}
