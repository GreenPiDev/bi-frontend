import { ListFilter, Plus, Search, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { NewMessageModal } from './new-message-modal';
import { Button } from '../components/ui/button';
import { ColumnVisibilityPicker } from '../components/ui/column-visibility-picker';
import { PageHelp } from '../components/ui/page-help';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { Tooltip } from '../components/ui/tooltip';
import { useColumnVisibility } from '../features/auth/use-column-visibility';
import { useMeQuery } from '../features/auth/use-auth';
import { MessagesFilterDrawer } from '../features/crm/messages-filter-drawer';
import {
  useAssignableMessageUsersQuery,
  useMessagesQuery,
  useSetConversationReadMutation,
  useSetConversationStarMutation,
} from '../features/crm/use-messages';
import { useMessagesFilterState } from '../features/crm/use-messages-filter-state';
import type { ConversationSummary } from '../lib/api';
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
  const filters = useMessagesFilterState();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newMessageOpen, setNewMessageOpen] = useState(false);

  const hasActiveFilter =
    Boolean(filters.box) ||
    filters.relatedEntity.length > 0 ||
    filters.quoteIds.length > 0 ||
    filters.projectIds.length > 0 ||
    filters.interactionIds.length > 0 ||
    Boolean(filters.recipientUserId);
  const pageSize = meQuery.data?.defaultPageSize ?? 25;
  const messagesQuery = useMessagesQuery({
    page,
    pageSize,
    q: q || undefined,
    ...filters.queryParams,
  });
  const usersQuery = useAssignableMessageUsersQuery();
  const starMutation = useSetConversationStarMutation();
  const readMutation = useSetConversationReadMutation();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPending, setBulkPending] = useState(false);

  const rows = messagesQuery.data?.data ?? [];

  // Secim sadece o an gorunen sayfaya ait - sayfa degistiren her yerde temizlenir.
  function goToPage(newPage: number) {
    setSelectedIds(new Set());
    setPage(newPage);
  }

  function toggleSelected(conversationId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(conversationId)) {
        next.delete(conversationId);
      } else {
        next.add(conversationId);
      }
      return next;
    });
  }

  const allOnPageSelected =
    rows.length > 0 && rows.every((row) => selectedIds.has(row.conversationId));

  function toggleSelectAllOnPage() {
    setSelectedIds(allOnPageSelected ? new Set() : new Set(rows.map((row) => row.conversationId)));
  }

  async function handleBulkRead(read: boolean) {
    setBulkPending(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((conversationId) =>
          readMutation.mutateAsync({ conversationId, read }),
        ),
      );
      setSelectedIds(new Set());
    } finally {
      setBulkPending(false);
    }
  }

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
      key: 'select',
      header: '',
      className: 'w-8',
      required: true,
      render: (conversation) => (
        <input
          type="checkbox"
          checked={selectedIds.has(conversation.conversationId)}
          onChange={() => toggleSelected(conversation.conversationId)}
          onClick={(event) => event.stopPropagation()}
          aria-label={tr.crm.messages.selectRowAria}
          className="accent-app-primary"
        />
      ),
    },
    {
      key: 'star',
      header: '',
      className: 'w-8',
      required: true,
      render: (conversation) => (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            starMutation.mutate({
              conversationId: conversation.conversationId,
              starred: !conversation.starred,
            });
          }}
          disabled={starMutation.isPending}
          aria-label={
            conversation.starred
              ? tr.crm.messages.detail.unstarAria
              : tr.crm.messages.detail.starAria
          }
          aria-pressed={conversation.starred}
          className="cursor-pointer text-app-muted hover:text-app-text disabled:cursor-not-allowed"
        >
          <Star
            size={16}
            className={conversation.starred ? 'fill-yellow-400 text-yellow-400' : undefined}
          />
        </button>
      ),
    },
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
      key: 'record',
      header: tr.crm.messages.recordColumn,
      className: 'text-app-muted',
      render: (conversation) =>
        conversation.relatedEntity && conversation.relatedEntityLabel ? (
          <span className="text-app-text">
            {tr.crm.messages.relatedEntityOptions[conversation.relatedEntity]} ·{' '}
            {conversation.relatedEntityLabel}
          </span>
        ) : (
          '—'
        ),
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
        <div className="flex items-center gap-2 pt-1">
          <Tooltip content={tr.crm.messages.filterButton}>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label={tr.crm.messages.filterButton}
              className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-[#1a2440] text-white transition-colors hover:bg-[#141c33]"
            >
              <ListFilter size={18} />
              {hasActiveFilter && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-app-surface" />
              )}
            </button>
          </Tooltip>
          <Tooltip content={tr.crm.messages.newButton}>
            <button
              type="button"
              onClick={() => setNewMessageOpen(true)}
              aria-label={tr.crm.messages.newButton}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1a2440] text-app-success transition-colors hover:bg-[#141c33]"
            >
              <Plus size={18} strokeWidth={3} />
            </button>
          </Tooltip>
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
            goToPage(1);
            setQInput(event.target.value);
          }}
          placeholder={tr.crm.messages.searchPlaceholder}
          className="w-full rounded-lg border border-app-border bg-app-surface py-2.5 pr-3 pl-9 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
        />
      </div>

      <div className="mt-4 flex items-center justify-between">
        {rows.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-app-muted">
            <input
              type="checkbox"
              checked={allOnPageSelected}
              onChange={toggleSelectAllOnPage}
              aria-label={tr.crm.messages.selectAllAria}
              className="accent-app-primary"
            />
            {tr.crm.messages.selectAllAria}
          </label>
        )}
        <ColumnVisibilityPicker
          columns={optionalColumns}
          value={visibleOptionalKeys}
          onChange={setVisibleOptionalKeys}
        />
      </div>

      {selectedIds.size > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-app-border bg-app-surface px-4 py-2.5">
          <span className="text-sm text-app-text">
            {tr.crm.messages.bulkBar.selectedCount(selectedIds.size)}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleBulkRead(true)}
              disabled={bulkPending}
            >
              {tr.crm.messages.bulkBar.markRead}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleBulkRead(false)}
              disabled={bulkPending}
            >
              {tr.crm.messages.bulkBar.markUnread}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSelectedIds(new Set())}
              disabled={bulkPending}
            >
              {tr.crm.messages.bulkBar.clearSelection}
            </Button>
          </div>
        </div>
      )}

      <Table
        columns={columns}
        data={rows}
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
          onPrevious={() => goToPage(page - 1)}
          onNext={() => goToPage(page + 1)}
        />
      )}

      {drawerOpen && (
        <MessagesFilterDrawer filters={filters} onClose={() => setDrawerOpen(false)} />
      )}

      {newMessageOpen && <NewMessageModal onClose={() => setNewMessageOpen(false)} />}
    </AppShell>
  );
}
