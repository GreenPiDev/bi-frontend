import { MessageCircle, Send, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMeQuery } from '../auth/use-auth';
import { tr } from '../../i18n/tr';
import type { ChatHistoryItem } from '../../lib/api';
import { loadChatHistory, saveChatHistory } from './chatbot-storage';
import { useSendChatMessageMutation } from './use-chatbot';

export function ChatbotWidget() {
  const meQuery = useMeQuery();
  const userId = meQuery.data?.id;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatHistoryItem[]>([]);
  const [input, setInput] = useState('');
  const navigate = useNavigate();
  const mutation = useSendChatMessageMutation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Kullanici degistiginde (ornegin davet kabul akisi - gercek bir logout
  // cagrisi yapmaz) onceki kullanicinin gecmisi sizmasin diye yeniden yuklenir.
  // Render sirasinda senkron guncelleme - dataset-detail-page.tsx'teki deseninin
  // ayni (react-hooks/set-state-in-effect kuralini ihlal etmemek icin).
  const [loadedForUserId, setLoadedForUserId] = useState<string | undefined>(undefined);
  if (userId !== loadedForUserId) {
    setLoadedForUserId(userId);
    setMessages(userId ? loadChatHistory(userId) : []);
  }

  useEffect(() => {
    if (userId) {
      saveChatHistory(userId, messages);
    }
  }, [userId, messages]);

  useEffect(() => {
    if (open && typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  function handleSend() {
    const message = input.trim();
    if (!message || mutation.isPending) return;
    setInput('');
    const history = messages;
    setMessages([...history, { role: 'user', content: message }]);

    mutation.mutate(
      { message, history },
      {
        onSuccess: (result) => {
          setMessages((prev) => [...prev, { role: 'assistant', content: result.reply }]);
          if (result.navigateTo) {
            navigate(result.navigateTo);
          }
        },
        onError: () => {
          setMessages((prev) => [...prev, { role: 'assistant', content: tr.chatbot.error }]);
        },
      },
    );
  }

  return (
    <div className="fixed right-5 bottom-5 z-[110] flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-[28rem] w-80 flex-col overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-app-border px-4 py-3">
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

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
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
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? tr.chatbot.closeButtonLabel : tr.chatbot.openButtonLabel}
        className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-app-brand text-white shadow-lg hover:bg-app-brand-dark"
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
}
