import { clsx } from 'clsx';
import { PenSquare, Search, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { Drawer } from '../../components/ui/drawer';
import { Select } from '../../components/ui/select';
import { useMeQuery } from '../auth/use-auth';
import { tr } from '../../i18n/tr';
import type { ConversationSummary, MessageRelatedEntity } from '../../lib/api';

interface MessagingWidgetBarProps {
  expanded: boolean;
  closing: boolean;
  onToggleExpanded: () => void;
  onCompose: () => void;
  unreadTotal: number;
  conversations: ConversationSummary[];
  isLoading: boolean;
  userNameById: Map<string, string>;
  onSelectConversation: (id: string) => void;
  selectedConversationId: string | null;
  q: string;
  onQChange: (value: string) => void;
  box: 'inbox' | 'sent' | undefined;
  onBoxChange: (value: 'inbox' | 'sent' | undefined) => void;
  relatedEntity: MessageRelatedEntity | undefined;
  onRelatedEntityChange: (value: MessageRelatedEntity | undefined) => void;
}

/** LinkedIn'deki gibi sag-alt "Mesajlasma" cubugu: kapaliyken sadece baslik+aksiyonlar,
 * acilinca arama+filtre+kompakt mesaj listesine genisler. Widget genislik/animasyon
 * mantigi burada, hangi mesajin acilacagi ust bilesende (messaging-widget.tsx). */
export function MessagingWidgetBar({
  expanded,
  closing,
  onToggleExpanded,
  onCompose,
  unreadTotal,
  conversations,
  isLoading,
  userNameById,
  onSelectConversation,
  selectedConversationId,
  q,
  onQChange,
  box,
  onBoxChange,
  relatedEntity,
  onRelatedEntityChange,
}: MessagingWidgetBarProps) {
  const meQuery = useMeQuery();
  const currentUserId = meQuery.data?.id;
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  function displayCounterpart(conversation: ConversationSummary): string {
    const { lastMessage } = conversation;
    const isSender = lastMessage.senderId === currentUserId;
    if (isSender) {
      return lastMessage.recipients
        .map((recipient) => userNameById.get(recipient.userId) ?? recipient.userId)
        .join(', ');
    }
    return userNameById.get(lastMessage.senderId) ?? lastMessage.senderId;
  }

  const showExpandedContent = expanded || closing;

  return (
    <div className="flex w-80 flex-col overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-xl">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggleExpanded}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggleExpanded();
          }
        }}
        aria-label={
          expanded ? tr.crm.messages.widget.collapseAria : tr.crm.messages.widget.expandAria
        }
        className="group flex cursor-pointer items-center justify-between gap-2 border-b border-app-border px-4 py-3"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-app-text">
          <span className="group-hover:underline">{tr.crm.messages.widget.title}</span>
          {unreadTotal > 0 && (
            <span
              className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-app-danger px-1 text-[11px] font-bold text-white"
              aria-label={tr.crm.messages.unreadCountAria(unreadTotal)}
            >
              {unreadTotal > 9 ? '9+' : unreadTotal}
            </span>
          )}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onCompose();
            }}
            aria-label={tr.crm.messages.widget.newMessageAria}
            className="cursor-pointer text-app-muted hover:text-app-text"
          >
            <PenSquare size={16} />
          </button>
        </div>
      </div>

      {showExpandedContent && (
        <div className={closing ? 'animate-widget-panel-out' : 'animate-widget-panel-in'}>
          <div className="flex items-center gap-2 border-b border-app-border px-3 py-2.5">
            <div className="relative flex-1">
              <Search
                size={14}
                className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-app-muted"
              />
              <input
                type="search"
                value={q}
                onChange={(event) => onQChange(event.target.value)}
                placeholder={tr.crm.messages.searchPlaceholder}
                className="w-full rounded-lg border border-app-border bg-app-bg py-1.5 pr-2 pl-8 text-xs text-app-text outline-none focus:ring-2 focus:ring-app-primary"
              />
            </div>
            <button
              type="button"
              onClick={() => setFilterDrawerOpen(true)}
              aria-label={tr.crm.messages.filterButton}
              className="shrink-0 text-app-muted hover:text-app-text"
            >
              <SlidersHorizontal size={16} />
            </button>
          </div>

          <div className="max-h-96 flex-1 overflow-y-auto">
            {isLoading && <p className="p-4 text-xs text-app-muted">{tr.crm.messages.loading}</p>}
            {!isLoading && conversations.length === 0 && (
              <p className="p-4 text-xs text-app-muted">{tr.crm.messages.widget.emptyState}</p>
            )}
            {conversations.map((conversation) => {
              const unread = conversation.unreadCount > 0;
              return (
                <button
                  key={conversation.conversationId}
                  type="button"
                  onClick={() => onSelectConversation(conversation.conversationId)}
                  className={clsx(
                    'flex w-full flex-col gap-0.5 border-b border-app-border px-4 py-2.5 text-left last:border-0 hover:bg-app-bg',
                    selectedConversationId === conversation.conversationId && 'bg-app-bg',
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span
                      className={clsx(
                        'truncate text-xs',
                        unread ? 'font-bold text-app-text' : 'font-semibold text-app-text',
                      )}
                    >
                      {displayCounterpart(conversation)}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 text-[10px] text-app-muted">
                      {new Date(conversation.lastMessage.sentAt).toLocaleDateString('tr-TR')}
                      {unread && (
                        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-app-danger px-1 text-[10px] font-bold text-white">
                          {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="truncate text-xs text-app-muted">
                    {conversation.lastMessage.body}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {filterDrawerOpen && (
        <Drawer
          title={tr.crm.messages.filterDrawer.title}
          onClose={() => setFilterDrawerOpen(false)}
        >
          <div className="flex flex-col gap-4">
            <Select
              label={tr.crm.messages.filterDrawer.boxLabel}
              value={box ?? ''}
              onChange={(event) =>
                onBoxChange((event.target.value || undefined) as 'inbox' | 'sent' | undefined)
              }
              options={[
                { value: 'inbox', label: tr.crm.messages.filterDrawer.boxInboxOption },
                { value: 'sent', label: tr.crm.messages.filterDrawer.boxSentOption },
              ]}
              placeholder={tr.crm.messages.filterDrawer.boxAllOption}
            />
            <Select
              label={tr.crm.messages.filterDrawer.relatedEntityLabel}
              value={relatedEntity ?? ''}
              onChange={(event) =>
                onRelatedEntityChange(
                  (event.target.value || undefined) as MessageRelatedEntity | undefined,
                )
              }
              options={Object.entries(tr.crm.messages.relatedEntityOptions).map(
                ([value, label]) => ({ value, label }),
              )}
              placeholder={tr.crm.messages.filterDrawer.relatedEntityAllOption}
            />
          </div>
        </Drawer>
      )}
    </div>
  );
}
