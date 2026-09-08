import { clsx } from 'clsx';
import { ChevronDown, ChevronUp, PenSquare, Search, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { Drawer } from '../../components/ui/drawer';
import { Select } from '../../components/ui/select';
import { useMeQuery } from '../auth/use-auth';
import { tr } from '../../i18n/tr';
import type { Message, MessageRelatedEntity } from '../../lib/api';

interface MessagingWidgetBarProps {
  expanded: boolean;
  closing: boolean;
  onToggleExpanded: () => void;
  onCompose: () => void;
  hasUnread: boolean;
  messages: Message[];
  isLoading: boolean;
  userNameById: Map<string, string>;
  onSelectMessage: (id: string) => void;
  selectedMessageId: string | null;
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
  hasUnread,
  messages,
  isLoading,
  userNameById,
  onSelectMessage,
  selectedMessageId,
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

  function displayCounterpart(message: Message): string {
    const isSender = message.senderId === currentUserId;
    if (isSender) {
      return message.recipients
        .map((recipient) => userNameById.get(recipient.userId) ?? recipient.userId)
        .join(', ');
    }
    return userNameById.get(message.senderId) ?? message.senderId;
  }

  function isUnread(message: Message): boolean {
    return message.recipients.some(
      (recipient) => recipient.userId === currentUserId && !recipient.readAt,
    );
  }

  const showExpandedContent = expanded || closing;

  return (
    <div className="flex w-80 flex-col overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-xl">
      <div className="flex items-center justify-between gap-2 border-b border-app-border px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-app-text">
          {tr.crm.messages.widget.title}
          {hasUnread && (
            <span
              className="h-2 w-2 rounded-full bg-app-success"
              aria-label={tr.crm.messages.widget.unreadIndicatorAria}
            />
          )}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onCompose}
            aria-label={tr.crm.messages.widget.newMessageAria}
            className="text-app-muted hover:text-app-text"
          >
            <PenSquare size={16} />
          </button>
          <button
            type="button"
            onClick={onToggleExpanded}
            aria-label={
              expanded ? tr.crm.messages.widget.collapseAria : tr.crm.messages.widget.expandAria
            }
            className="text-app-muted hover:text-app-text"
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
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
            {!isLoading && messages.length === 0 && (
              <p className="p-4 text-xs text-app-muted">{tr.crm.messages.widget.emptyState}</p>
            )}
            {messages.map((message) => {
              const unread = isUnread(message);
              return (
                <button
                  key={message.id}
                  type="button"
                  onClick={() => onSelectMessage(message.id)}
                  className={clsx(
                    'flex w-full flex-col gap-0.5 border-b border-app-border px-4 py-2.5 text-left last:border-0 hover:bg-app-bg',
                    selectedMessageId === message.id && 'bg-app-bg',
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span
                      className={clsx(
                        'truncate text-xs',
                        unread ? 'font-bold text-app-text' : 'font-semibold text-app-text',
                      )}
                    >
                      {displayCounterpart(message)}
                    </span>
                    <span className="shrink-0 text-[10px] text-app-muted">
                      {new Date(message.sentAt).toLocaleDateString('tr-TR')}
                    </span>
                  </span>
                  <span className="truncate text-xs text-app-muted">{message.body}</span>
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
