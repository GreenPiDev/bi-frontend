import { Search } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { NewMessageModal } from './new-message-modal';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Drawer } from '../components/ui/drawer';
import { PageHelp } from '../components/ui/page-help';
import { Select } from '../components/ui/select';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { useMeQuery } from '../features/auth/use-auth';
import { useAssignableMessageUsersQuery, useMessagesQuery } from '../features/crm/use-messages';
import type { Message, MessageRelatedEntity } from '../lib/api';
import { tr } from '../i18n/tr';

export function MessagesListPage() {
  const navigate = useNavigate();
  const meQuery = useMeQuery();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [qInput, setQInput] = useState('');
  const [box, setBox] = useState<'inbox' | 'sent' | undefined>(undefined);
  const [relatedEntity, setRelatedEntity] = useState<MessageRelatedEntity | undefined>(undefined);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newMessageOpen, setNewMessageOpen] = useState(false);

  const messagesQuery = useMessagesQuery({ page, q: q || undefined, box, relatedEntity });
  const usersQuery = useAssignableMessageUsersQuery();

  const userNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const user of usersQuery.data ?? []) {
      map.set(user.id, user.name);
    }
    return map;
  }, [usersQuery.data]);

  const currentUserId = meQuery.data?.id;

  function displayUserName(userId: string): string {
    if (userId === currentUserId) return tr.crm.messages.you;
    return userNameById.get(userId) ?? userId;
  }

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setQ(qInput.trim());
  }

  function handleSearchReset() {
    setPage(1);
    setQInput('');
    setQ('');
  }

  const columns: TableColumn<Message>[] = [
    {
      key: 'sender',
      header: tr.crm.messages.senderColumn,
      render: (message) => (
        <span className="flex items-center gap-1.5 font-semibold text-app-text">
          {displayUserName(message.senderId)}
          {currentUserId &&
            message.recipients.some(
              (recipient) => recipient.userId === currentUserId && !recipient.readAt,
            ) && <Badge variant="info">{tr.crm.messages.unreadBadge}</Badge>}
        </span>
      ),
    },
    {
      key: 'recipients',
      header: tr.crm.messages.recipientsColumn,
      className: 'text-app-muted',
      render: (message) =>
        message.recipients.map((recipient) => displayUserName(recipient.userId)).join(', '),
    },
    {
      key: 'body',
      header: tr.crm.messages.bodyColumn,
      className: 'max-w-xs truncate text-app-muted',
      render: (message) => message.body,
    },
    {
      key: 'sentAt',
      header: tr.crm.messages.sentAtColumn,
      className: 'text-app-muted',
      render: (message) => new Date(message.sentAt).toLocaleString('tr-TR'),
    },
  ];

  return (
    <AppShell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">{tr.crm.messages.title}</h1>
            <PageHelp text={tr.help.messages} />
          </div>
          <p className="mt-1 text-sm text-app-muted">{tr.crm.messages.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" type="button" onClick={() => setDrawerOpen(true)}>
            {tr.crm.messages.filterButton}
          </Button>
          <Button type="button" onClick={() => setNewMessageOpen(true)}>
            {tr.crm.messages.newButton}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSearchSubmit} className="mt-6 flex w-full items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-app-muted"
          />
          <input
            type="search"
            value={qInput}
            onChange={(event) => setQInput(event.target.value)}
            placeholder={tr.crm.messages.searchPlaceholder}
            className="w-full rounded-lg border border-app-border bg-app-surface py-2.5 pr-3 pl-9 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
          />
        </div>
        <Button type="submit" variant="secondary">
          {tr.common.search}
        </Button>
        <Button type="button" variant="secondary" onClick={handleSearchReset}>
          {tr.common.reset}
        </Button>
      </form>

      <Table
        columns={columns}
        data={messagesQuery.data?.data ?? []}
        keyField={(message) => message.id}
        onRowClick={(message) => navigate(`/mesajlar/${message.id}`)}
        isLoading={messagesQuery.isPending}
        loadingMessage={tr.crm.messages.loading}
        emptyMessage={tr.crm.messages.empty}
      />

      {messagesQuery.data && messagesQuery.data.data.length > 0 && (
        <Pagination
          page={messagesQuery.data.meta.page}
          totalPages={messagesQuery.data.meta.totalPages}
          onPrevious={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}

      {drawerOpen && (
        <Drawer title={tr.crm.messages.filterDrawer.title} onClose={() => setDrawerOpen(false)}>
          <div className="flex flex-col gap-4">
            <Select
              label={tr.crm.messages.filterDrawer.boxLabel}
              value={box ?? ''}
              onChange={(event) =>
                setBox((event.target.value || undefined) as 'inbox' | 'sent' | undefined)
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
                setRelatedEntity(
                  (event.target.value || undefined) as MessageRelatedEntity | undefined,
                )
              }
              options={Object.entries(tr.crm.messages.relatedEntityOptions).map(
                ([value, label]) => ({ value, label }),
              )}
              placeholder={tr.crm.messages.filterDrawer.relatedEntityAllOption}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setBox(undefined);
                setRelatedEntity(undefined);
              }}
            >
              {tr.crm.messages.filterDrawer.reset}
            </Button>
          </div>
        </Drawer>
      )}

      {newMessageOpen && <NewMessageModal onClose={() => setNewMessageOpen(false)} />}
    </AppShell>
  );
}
