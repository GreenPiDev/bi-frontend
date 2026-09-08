import { useMemo, useState } from 'react';
import { NewMessageModal } from '../../app/new-message-modal';
import { useMeQuery } from '../auth/use-auth';
import { MessagingChatPanel } from './messaging-chat-panel';
import { MessagingWidgetBar } from './messaging-widget-bar';
import { useAssignableMessageUsersQuery, useMessagesQuery } from './use-messages';
import type { MessageRelatedEntity } from '../../lib/api';

const EXIT_ANIMATION_MS = 160;

/** Sag-alt "Mesajlasma" widget'i (LinkedIn benzeri): kapali cubuk -> genisleyen liste
 * paneli -> secilen mesaj icin ayri bir sohbet penceresi. Konumlandirmayi bilmiyor
 * (bkz. components/ui/floating-widgets-dock.tsx, app-shell.tsx onu ChatbotWidget'in
 * yaninda dock'a yerlestiriyor); burada sadece kendi ic genisleme/animasyon state'i var. */
export function MessagingWidget() {
  const meQuery = useMeQuery();
  const currentUserId = meQuery.data?.id;

  const [expanded, setExpanded] = useState(false);
  const [barClosing, setBarClosing] = useState(false);
  const [openMessageId, setOpenMessageId] = useState<string | null>(null);
  const [chatClosing, setChatClosing] = useState(false);
  const [newMessageOpen, setNewMessageOpen] = useState(false);

  const [q, setQ] = useState('');
  const [box, setBox] = useState<'inbox' | 'sent' | undefined>(undefined);
  const [relatedEntity, setRelatedEntity] = useState<MessageRelatedEntity | undefined>(undefined);

  const messagesQuery = useMessagesQuery({ page: 1, q: q || undefined, box, relatedEntity });
  const usersQuery = useAssignableMessageUsersQuery();

  const userNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const user of usersQuery.data ?? []) {
      map.set(user.id, user.name);
    }
    return map;
  }, [usersQuery.data]);

  const messages = messagesQuery.data?.data ?? [];
  const hasUnread = messages.some((message) =>
    message.recipients.some((recipient) => recipient.userId === currentUserId && !recipient.readAt),
  );

  function closeChatPanel() {
    setChatClosing(true);
    window.setTimeout(() => {
      setOpenMessageId(null);
      setChatClosing(false);
    }, EXIT_ANIMATION_MS);
  }

  function handleToggleExpanded() {
    if (!expanded) {
      setExpanded(true);
      return;
    }
    if (openMessageId) {
      closeChatPanel();
    }
    setBarClosing(true);
    window.setTimeout(() => {
      setExpanded(false);
      setBarClosing(false);
    }, EXIT_ANIMATION_MS);
  }

  return (
    <div className="flex flex-row items-end gap-3">
      {openMessageId && (
        <MessagingChatPanel
          messageId={openMessageId}
          closing={chatClosing}
          onClose={closeChatPanel}
          userNameById={userNameById}
        />
      )}
      <MessagingWidgetBar
        expanded={expanded}
        closing={barClosing}
        onToggleExpanded={handleToggleExpanded}
        onCompose={() => setNewMessageOpen(true)}
        hasUnread={hasUnread}
        messages={messages}
        isLoading={messagesQuery.isPending}
        userNameById={userNameById}
        onSelectMessage={setOpenMessageId}
        selectedMessageId={openMessageId}
        q={q}
        onQChange={setQ}
        box={box}
        onBoxChange={setBox}
        relatedEntity={relatedEntity}
        onRelatedEntityChange={setRelatedEntity}
      />
      {newMessageOpen && <NewMessageModal onClose={() => setNewMessageOpen(false)} />}
    </div>
  );
}
