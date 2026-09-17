import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { NewMessageModal } from './new-message-modal';
import { Button } from '../components/ui/button';
import { ColumnVisibilityPicker } from '../components/ui/column-visibility-picker';
import { Drawer } from '../components/ui/drawer';
import { MultiSelect } from '../components/ui/multi-select';
import { PageHelp } from '../components/ui/page-help';
import { Select } from '../components/ui/select';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { useColumnVisibility } from '../features/auth/use-column-visibility';
import { useMeQuery } from '../features/auth/use-auth';
import { useInteractionsQuery } from '../features/crm/use-interactions';
import { useAssignableMessageUsersQuery, useMessagesQuery } from '../features/crm/use-messages';
import { useProjectsQuery } from '../features/crm/use-projects';
import { useQuotesQuery } from '../features/crm/use-quotes';
import type { ConversationSummary, MessageRelatedEntity } from '../lib/api';
import { useDebouncedValue } from '../lib/use-debounced-value';
import { tr } from '../i18n/tr';

function UnreadCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-app-danger px-1 text-[11px] font-bold text-white"
      aria-label={tr.crm.messages.unreadCountAria(count)}
    >
      {count > 9 ? '9+' : count}
    </span>
  );
}

export function MessagesListPage() {
  const navigate = useNavigate();
  const meQuery = useMeQuery();
  const [page, setPage] = useState(1);
  const [qInput, setQInput] = useState('');
  const q = useDebouncedValue(qInput.trim());
  const [box, setBox] = useState<'inbox' | 'sent' | undefined>(undefined);
  const [relatedEntity, setRelatedEntity] = useState<MessageRelatedEntity[]>([]);
  const [quoteIds, setQuoteIds] = useState<string[]>([]);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [interactionIds, setInteractionIds] = useState<string[]>([]);
  const [recipientUserId, setRecipientUserId] = useState<string | undefined>(undefined);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newMessageOpen, setNewMessageOpen] = useState(false);

  const pageSize = meQuery.data?.defaultPageSize ?? 25;
  const messagesQuery = useMessagesQuery({
    page,
    pageSize,
    q: q || undefined,
    box,
    relatedEntity: relatedEntity.length ? relatedEntity : undefined,
    quoteIds: quoteIds.length ? quoteIds : undefined,
    projectIds: projectIds.length ? projectIds : undefined,
    interactionIds: interactionIds.length ? interactionIds : undefined,
    recipientUserId,
  });
  const usersQuery = useAssignableMessageUsersQuery();
  const quotesQuery = useQuotesQuery({}, { enabled: drawerOpen });
  const projectsQuery = useProjectsQuery({}, { enabled: drawerOpen });
  const interactionsQuery = useInteractionsQuery({}, { enabled: drawerOpen });

  const quoteOptions = (quotesQuery.data?.data ?? []).map((quote) => ({
    value: quote.id,
    label: `${quote.quoteNumber} — ${quote.account.name}`,
  }));
  const projectOptions = (projectsQuery.data?.data ?? []).map((project) => ({
    value: project.id,
    label: `${project.projectNumber} — ${project.name}`,
  }));
  const interactionOptions = (interactionsQuery.data?.data ?? []).map((interaction) => ({
    value: interaction.id,
    label: `${interaction.account?.name ?? tr.crm.interactions.detail.noAccountFallback} — ${tr.crm.interactions.typeOptions[interaction.type]} (${new Date(interaction.occurredAt).toLocaleDateString('tr-TR')})`,
  }));

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

  const ALL_COLUMNS: TableColumn<ConversationSummary>[] = [
    {
      key: 'unread',
      header: '',
      className: 'w-8',
      required: true,
      render: (conversation) => <UnreadCountBadge count={conversation.unreadCount} />,
    },
    {
      key: 'sender',
      header: tr.crm.messages.senderColumn,
      required: true,
      render: (conversation) => (
        <span className="font-semibold text-app-text">
          {displayUserName(conversation.lastMessage.senderId)}
        </span>
      ),
    },
    {
      key: 'subject',
      header: tr.crm.messages.subjectColumn,
      className: 'max-w-xs truncate text-app-muted',
      required: true,
      render: (conversation) => conversation.lastMessage.subject,
    },
    {
      key: 'sentAt',
      header: tr.crm.messages.sentAtColumn,
      className: 'text-app-muted',
      render: (conversation) => new Date(conversation.lastMessage.sentAt).toLocaleString('tr-TR'),
    },
  ];

  const { isColumnVisible, optionalColumns, visibleOptionalKeys, setVisibleOptionalKeys } =
    useColumnVisibility(
      'messages',
      ALL_COLUMNS.map((c) => ({ key: c.key, label: c.header, required: c.required })),
    );
  const columns = ALL_COLUMNS.filter((c) => isColumnVisible(c.key));

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

      <div className="relative mt-6 w-full">
        <Search
          size={16}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-app-muted"
        />
        <input
          type="search"
          value={qInput}
          onChange={(event) => {
            setPage(1);
            setQInput(event.target.value);
          }}
          placeholder={tr.crm.messages.searchPlaceholder}
          className="w-full rounded-lg border border-app-border bg-app-surface py-2.5 pr-3 pl-9 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
        />
      </div>

      <div className="mt-4 flex justify-end">
        <ColumnVisibilityPicker
          columns={optionalColumns}
          value={visibleOptionalKeys}
          onChange={setVisibleOptionalKeys}
        />
      </div>

      <Table
        columns={columns}
        data={messagesQuery.data?.data ?? []}
        keyField={(conversation) => conversation.conversationId}
        onRowClick={(conversation) => navigate(`/mesajlar/${conversation.conversationId}`)}
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
            <MultiSelect
              label={tr.crm.messages.filterDrawer.relatedEntityLabel}
              value={relatedEntity}
              onChange={(value) => setRelatedEntity(value as MessageRelatedEntity[])}
              options={Object.entries(tr.crm.messages.relatedEntityOptions).map(
                ([value, label]) => ({ value, label }),
              )}
              placeholder={tr.crm.messages.filterDrawer.relatedEntityAllOption}
            />
            <MultiSelect
              label={tr.crm.messages.filterDrawer.quoteLabel}
              value={quoteIds}
              onChange={setQuoteIds}
              options={quoteOptions}
              placeholder={tr.crm.messages.filterDrawer.quoteAllOption}
            />
            <MultiSelect
              label={tr.crm.messages.filterDrawer.projectLabel}
              value={projectIds}
              onChange={setProjectIds}
              options={projectOptions}
              placeholder={tr.crm.messages.filterDrawer.projectAllOption}
            />
            <MultiSelect
              label={tr.crm.messages.filterDrawer.interactionLabel}
              value={interactionIds}
              onChange={setInteractionIds}
              options={interactionOptions}
              placeholder={tr.crm.messages.filterDrawer.interactionAllOption}
            />
            <Select
              id="messages-filter-recipient"
              label={tr.crm.messages.filterDrawer.recipientLabel}
              value={recipientUserId ?? ''}
              onChange={(event) => setRecipientUserId(event.target.value || undefined)}
              options={(usersQuery.data ?? []).map((user) => ({
                value: user.id,
                label: user.name,
              }))}
              placeholder={tr.crm.messages.filterDrawer.recipientAllOption}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setBox(undefined);
                setRelatedEntity([]);
                setQuoteIds([]);
                setProjectIds([]);
                setInteractionIds([]);
                setRecipientUserId(undefined);
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
