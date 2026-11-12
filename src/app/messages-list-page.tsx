import {
  Archive,
  ArchiveRestore,
  Filter,
  Mail,
  MailOpen,
  Plus,
  RotateCcw,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { NewMessageModal } from './new-message-modal';
import { Badge } from '../components/ui/badge';
import { CircleIconButton } from '../components/ui/circle-icon-button';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { ColumnVisibilityPicker } from '../components/ui/column-visibility-picker';
import { FilterButtonGroup, type FilterButtonOption } from '../components/ui/filter-button-group';
import { IconActionButton } from '../components/ui/icon-action-button';
import { PageHelp } from '../components/ui/page-help';
import { Pagination, Table, type TableBulkAction, type TableColumn } from '../components/ui/table';
import { useToast } from '../components/ui/toast-context';
import { useColumnVisibility } from '../features/auth/use-column-visibility';
import { useMeQuery } from '../features/auth/use-auth';
import { MessagesFilterDrawer } from '../features/crm/messages-filter-drawer';
import {
  useAssignableMessageUsersQuery,
  useMessagesQuery,
  useSetConversationReadMutation,
  useSetConversationStarMutation,
  useTrashConversationsMutation,
} from '../features/crm/use-messages';
import { useMessagesFilterState } from '../features/crm/use-messages-filter-state';
import type { ConversationSummary, MessageBox } from '../lib/api';
import { useDebouncedValue } from '../lib/use-debounced-value';
import { usePageTitle } from '../lib/document-title';
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

const BOX_OPTIONS: FilterButtonOption<MessageBox>[] = [
  { value: 'inbox', label: tr.crm.messages.boxOptions.inbox },
  { value: 'sent', label: tr.crm.messages.boxOptions.sent },
  { value: 'starred', label: tr.crm.messages.boxOptions.starred },
  { value: 'archive', label: tr.crm.messages.boxOptions.archive },
  { value: 'trash', label: tr.crm.messages.boxOptions.trash },
];

export function MessagesListPage() {
  usePageTitle(tr.crm.messages.title);
  const navigate = useNavigate();
  const toast = useToast();
  // '' = "Tümü" (gelen + gönderilen, çöp kutusundakiler hariç) - varsayılan.
  const [box, setBox] = useState<MessageBox | ''>('');
  const meQuery = useMeQuery();
  const [page, setPage] = useState(1);
  const [qInput, setQInput] = useState('');
  const q = useDebouncedValue(qInput.trim());
  const filters = useMessagesFilterState();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newMessageOpen, setNewMessageOpen] = useState(false);

  const hasActiveFilter =
    filters.relatedEntity.length > 0 ||
    filters.quoteIds.length > 0 ||
    filters.projectIds.length > 0 ||
    filters.interactionIds.length > 0 ||
    Boolean(filters.recipientUserId) ||
    filters.isMeetingReport;
  const pageSize = meQuery.data?.defaultPageSize ?? 25;
  const messagesQuery = useMessagesQuery({
    box: box || undefined,
    page,
    pageSize,
    q: q || undefined,
    ...filters.queryParams,
  });
  const usersQuery = useAssignableMessageUsersQuery();
  const starMutation = useSetConversationStarMutation();
  const readMutation = useSetConversationReadMutation();
  const trashMutation = useTrashConversationsMutation();
  // Çöp kutusuna taşıma onay bekler; geri alma (çöp kutusu sekmesi) onaysız çalışır.
  const [pendingTrashIds, setPendingTrashIds] = useState<string[] | null>(null);
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

  function changeBox(next: MessageBox | '') {
    setSelectedIds(new Set());
    setPage(1);
    setBox(next);
  }

  // "Gelen"/"Gönderilen" kutusundan silmek sadece o taraftaki mesajları çöpe atar;
  // "Tümü"nden silmek konuşmadaki tüm (gelen + gönderilen) mesajlarımı çöpe atar.
  // Çöp kutusunda ise aynı aksiyon geri alma olur.
  function requestTrashOrRestore(conversationIds: string[]) {
    if (conversationIds.length === 0) return;
    if (box === 'trash') {
      void handleTrashOrRestore(conversationIds);
    } else {
      setPendingTrashIds(conversationIds);
    }
  }

  async function handleArchiveToggle(conversationIds: string[]) {
    if (conversationIds.length === 0) return;
    const action = box === 'archive' ? 'unarchive' : 'archive';
    try {
      await trashMutation.mutateAsync({
        conversationIds,
        action,
        box: box === 'inbox' || box === 'sent' ? box : undefined,
      });
      setSelectedIds(new Set());
      toast.success(
        action === 'archive'
          ? tr.crm.messages.archiveSuccess(conversationIds.length)
          : tr.crm.messages.unarchiveSuccess(conversationIds.length),
      );
    } catch {
      toast.error(tr.crm.messages.trashError);
    }
  }

  async function handleTrashOrRestore(conversationIds: string[]) {
    if (conversationIds.length === 0) return;
    const action = box === 'trash' ? 'restore' : 'trash';
    try {
      await trashMutation.mutateAsync({
        conversationIds,
        action,
        box: box === 'inbox' || box === 'sent' ? box : undefined,
      });
      setSelectedIds(new Set());
      toast.success(
        action === 'trash'
          ? tr.crm.messages.trashSuccess(conversationIds.length)
          : tr.crm.messages.restoreSuccess(conversationIds.length),
      );
    } catch {
      toast.error(tr.crm.messages.trashError);
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
      // Başlık satırındaki "tümünü seç" kutusu (beyaz arka planlı) - sayfadaki tüm
      // konuşmaları seçer / seçimi kaldırır.
      headerNode: (
        <input
          type="checkbox"
          checked={allOnPageSelected}
          onChange={toggleSelectAllOnPage}
          disabled={rows.length === 0}
          aria-label={tr.crm.messages.selectAllAria}
          className="h-4 w-4 cursor-pointer rounded-sm bg-white accent-app-primary disabled:cursor-not-allowed"
        />
      ),
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
      key: 'to',
      header: tr.crm.messages.toColumn,
      className: 'text-app-muted',
      render: (conversation) => (
        <div className="flex flex-col">
          {conversation.lastMessage.recipients
            .filter((recipient) => recipient.kind === 'TO')
            .map((recipient) => (
              <span key={recipient.id}>{displayUserName(recipient.userId)}</span>
            ))}
        </div>
      ),
    },
    {
      key: 'subject',
      header: tr.crm.messages.subjectColumn,
      className: 'max-w-xs truncate text-app-muted',
      required: true,
      render: (conversation) => (
        <span className="flex items-center gap-1.5">
          {conversation.lastMessage.subject}
          {conversation.lastMessage.isMeetingReport && (
            <Badge variant="info">{tr.crm.messages.filterDrawer.meetingReportBadge}</Badge>
          )}
        </span>
      ),
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
    {
      key: 'trash',
      header: tr.crm.messages.actionsColumn,
      className: 'w-28 text-center',
      required: true,
      render: (conversation) => {
        const isTrash = box === 'trash';
        const isArchive = box === 'archive';
        const ArchiveIcon = isArchive ? ArchiveRestore : Archive;
        const archiveLabel = isArchive
          ? tr.crm.messages.unarchiveRowAria
          : tr.crm.messages.archiveRowAria;
        const TrashIcon = isTrash ? RotateCcw : Trash2;
        const trashLabel = isTrash ? tr.crm.messages.restoreRowAria : tr.crm.messages.trashRowAria;
        return (
          <div className="flex items-center justify-center gap-3">
            {!isTrash && (
              <IconActionButton
                icon={ArchiveIcon}
                tooltip={archiveLabel}
                iconSize={16}
                disabled={trashMutation.isPending}
                onClick={() => void handleArchiveToggle([conversation.conversationId])}
              />
            )}
            <IconActionButton
              icon={TrashIcon}
              tooltip={trashLabel}
              iconSize={16}
              variant={isTrash ? 'default' : 'danger'}
              disabled={trashMutation.isPending}
              onClick={() => requestTrashOrRestore([conversation.conversationId])}
            />
          </div>
        );
      },
    },
  ];

  const { isColumnVisible, optionalColumns, visibleOptionalKeys, setVisibleOptionalKeys } =
    useColumnVisibility(
      'messages',
      ALL_COLUMNS.map((c) => ({ key: c.key, label: c.header, required: c.required })),
    );
  const columns = ALL_COLUMNS.filter((c) => isColumnVisible(c.key));

  const bulkPendingAny = bulkPending || trashMutation.isPending;
  const bulkActions: TableBulkAction[] = [
    {
      key: 'mark-read',
      icon: MailOpen,
      tooltip: tr.crm.messages.bulkBar.markRead,
      onClick: () => handleBulkRead(true),
      disabled: bulkPendingAny,
    },
    {
      key: 'mark-unread',
      icon: Mail,
      tooltip: tr.crm.messages.bulkBar.markUnread,
      onClick: () => handleBulkRead(false),
      disabled: bulkPendingAny,
    },
    ...(box === 'trash'
      ? []
      : [
          {
            key: 'archive-toggle',
            icon: box === 'archive' ? ArchiveRestore : Archive,
            tooltip:
              box === 'archive'
                ? tr.crm.messages.bulkBar.unarchive
                : tr.crm.messages.bulkBar.archive,
            onClick: () => handleArchiveToggle(Array.from(selectedIds)),
            disabled: bulkPendingAny,
          },
        ]),
    box === 'trash'
      ? {
          key: 'restore',
          icon: RotateCcw,
          tooltip: tr.crm.messages.bulkBar.restore,
          onClick: () => requestTrashOrRestore(Array.from(selectedIds)),
          disabled: bulkPendingAny,
        }
      : {
          key: 'move-to-trash',
          icon: Trash2,
          tooltip: tr.crm.messages.bulkBar.moveToTrash,
          onClick: () => requestTrashOrRestore(Array.from(selectedIds)),
          disabled: bulkPendingAny,
        },
    {
      key: 'clear-selection',
      icon: X,
      tooltip: tr.crm.messages.bulkBar.clearSelection,
      onClick: () => setSelectedIds(new Set()),
      disabled: bulkPendingAny,
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
        <div className="flex items-center gap-2 pt-1">
          <CircleIconButton
            icon={Filter}
            tooltip={tr.crm.messages.filterButton}
            onClick={() => setDrawerOpen(true)}
          >
            {hasActiveFilter && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-app-surface" />
            )}
          </CircleIconButton>
          <CircleIconButton
            icon={Plus}
            tooltip={tr.crm.messages.newButton}
            variant="success"
            strokeWidth={3}
            onClick={() => setNewMessageOpen(true)}
          />
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
          className="w-full rounded-lg border border-app-border bg-app-surface py-2.5 pr-3 pl-9 text-sm text-app-text outline-none focus:border-app-primary"
        />
      </div>

      <div className="mt-4">
        <FilterButtonGroup
          value={box}
          onChange={changeBox}
          allLabel={tr.crm.messages.boxOptions.all}
          options={BOX_OPTIONS}
        />
      </div>

      <div className="mt-4 flex min-h-8 items-center justify-end">
        <ColumnVisibilityPicker
          columns={optionalColumns}
          value={visibleOptionalKeys}
          onChange={setVisibleOptionalKeys}
        />
      </div>

      <Table
        bulkActionsVisible={selectedIds.size > 0}
        selectedCount={selectedIds.size}
        bulkActions={bulkActions}
        columns={columns}
        data={rows}
        keyField={(conversation) => conversation.conversationId}
        onRowClick={(conversation) => navigate(`/mesajlar/${conversation.conversationId}`)}
        getRowHref={(conversation) => `/mesajlar/${conversation.conversationId}`}
        isLoading={messagesQuery.isPending}
        loadingMessage={tr.crm.messages.loading}
        emptyMessage={box ? tr.crm.messages.emptyByBox[box] : tr.crm.messages.empty}
      />

      {messagesQuery.data && messagesQuery.data.data.length > 0 && (
        <Pagination
          page={messagesQuery.data.meta.page}
          totalPages={messagesQuery.data.meta.totalPages}
          total={messagesQuery.data.meta.total}
          onPageChange={goToPage}
          onPrevious={() => goToPage(page - 1)}
          onNext={() => goToPage(page + 1)}
        />
      )}

      {drawerOpen && (
        <MessagesFilterDrawer filters={filters} onClose={() => setDrawerOpen(false)} />
      )}

      {pendingTrashIds && (
        <ConfirmModal
          title={tr.crm.messages.trashConfirm.title}
          message={tr.crm.messages.trashConfirm.message(pendingTrashIds.length)}
          confirmLabel={tr.crm.messages.trashConfirm.confirm}
          isPending={trashMutation.isPending}
          onConfirm={async () => {
            await handleTrashOrRestore(pendingTrashIds);
            setPendingTrashIds(null);
          }}
          onCancel={() => setPendingTrashIds(null)}
        />
      )}

      {newMessageOpen && <NewMessageModal onClose={() => setNewMessageOpen(false)} />}
    </AppShell>
  );
}
