import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FilterButtonGroup } from '../components/ui/filter-button-group';
import { FormError } from '../components/ui/form-error';
import { PageHelp } from '../components/ui/page-help';
import { InlineSelect } from '../components/ui/inline-select';
import { Table, type TableColumn } from '../components/ui/table';
import { useToast } from '../components/ui/toast-context';
import { SupportConversation } from '../features/support/support-conversation';
import {
  SupportKindBadge,
  SupportReplyIndicator,
  SupportRowChevron,
} from '../features/support/support-ticket-parts';
import {
  formatSupportDate,
  SUPPORT_STATUS_TEXT_CLASSES,
  SUPPORT_STATUSES,
} from '../features/support/support-format';
import {
  usePlatformSupportTicketsQuery,
  usePlatformSupportTicketsRealtimeSync,
  useAddPlatformSupportTicketMessageMutation,
  useUpdatePlatformSupportTicketStatusMutation,
} from '../features/support/use-support-tickets';
import { tr } from '../i18n/tr';
import type { AdminSupportTicket, SupportTicketStatus } from '../lib/api';
import { AppShell } from './app-shell';

const t = tr.support;
const copy = t.admin;

/** Durum, tablodaki "Durum" hucresinden satir-ici degistirilir (ayri form/kaydet yok). */
function StatusCell({ ticket }: { ticket: AdminSupportTicket }) {
  const toast = useToast();
  const mutation = useUpdatePlatformSupportTicketStatusMutation();
  return (
    <InlineSelect
      value={ticket.status}
      disabled={mutation.isPending}
      options={SUPPORT_STATUSES.map((status) => ({ value: status, label: t.statuses[status] }))}
      selectClassName={`font-semibold ${SUPPORT_STATUS_TEXT_CLASSES[ticket.status]}`}
      onChange={(value) =>
        mutation.mutate(
          { id: ticket.id, status: value as SupportTicketStatus },
          {
            onSuccess: () => toast.success(copy.statusSuccess),
            onError: () => toast.error(copy.statusError),
          },
        )
      }
    />
  );
}

function ExpandedTicket({ ticket }: { ticket: AdminSupportTicket }) {
  const toast = useToast();
  const mutation = useAddPlatformSupportTicketMessageMutation();
  return (
    <div className="space-y-2">
      <div className="border-b border-app-border pb-3" onClick={(event) => event.stopPropagation()}>
        <div className="text-xs text-app-muted">
          <span className="font-semibold text-app-text">{ticket.tenant.name}</span>
          {ticket.createdBy && (
            <>
              {' · '}
              {ticket.createdBy.name}
              {' · '}
              <a
                href={`mailto:${ticket.createdBy.email}`}
                className="text-app-brand hover:underline"
              >
                {ticket.createdBy.email}
              </a>
            </>
          )}
        </div>
      </div>
      <SupportConversation
        ticket={ticket}
        viewer="admin"
        isSending={mutation.isPending}
        onSend={(body, onSuccess) =>
          mutation.mutate(
            { id: ticket.id, body },
            { onSuccess, onError: () => toast.error(t.conversation.sendError) },
          )
        }
      />
    </div>
  );
}

function buildColumns(expandedId: string | null): TableColumn<AdminSupportTicket>[] {
  return [
    {
      key: 'expand',
      header: '',
      className: 'w-8',
      render: (ticket) => <SupportRowChevron expanded={expandedId === ticket.id} />,
    },
    {
      key: 'createdAt',
      header: t.columns.createdAt,
      render: (ticket) => formatSupportDate(ticket.createdAt),
    },
    { key: 'tenant', header: t.columns.tenant, render: (ticket) => ticket.tenant.name },
    { key: 'sender', header: t.columns.sender, render: (ticket) => ticket.createdBy?.name ?? '—' },
    {
      key: 'kind',
      header: t.columns.kind,
      render: (ticket) => <SupportKindBadge kind={ticket.kind} />,
    },
    {
      key: 'status',
      header: t.columns.status,
      render: (ticket) => <StatusCell ticket={ticket} />,
    },
    {
      key: 'reply',
      header: t.columns.reply,
      render: (ticket) => <SupportReplyIndicator ticket={ticket} viewer="admin" />,
    },
  ];
}

/** Sadece super admin (PlatformAdminRoute + backend PlatformAdminGuard). */
export function PlatformAdminSupportPage() {
  const [status, setStatus] = useState<SupportTicketStatus | ''>('');
  const [searchParams] = useSearchParams();
  // Bildirimden gelindiyse (?talep=<id>) o talep acik gelsin.
  const [expandedId, setExpandedId] = useState<string | null>(() => searchParams.get('talep'));
  const ticketsQuery = usePlatformSupportTicketsQuery(status || undefined);
  usePlatformSupportTicketsRealtimeSync();

  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-app-text">{copy.title}</h1>
        <PageHelp text={tr.help.platformAdminSupport} />
      </div>
      <p className="mt-1 mb-4 text-sm text-app-muted">{copy.subtitle}</p>
      <div className="mb-4">
        <FilterButtonGroup
          label={copy.statusFilterLabel}
          value={status}
          onChange={setStatus}
          allLabel={copy.allStatuses}
          options={SUPPORT_STATUSES.map((value) => ({ value, label: t.statuses[value] }))}
        />
      </div>
      {ticketsQuery.isError && <FormError message={t.list.error} />}
      <Table
        columns={buildColumns(expandedId)}
        data={ticketsQuery.data ?? []}
        keyField={(ticket) => ticket.id}
        isLoading={ticketsQuery.isPending}
        loadingMessage={t.list.loading}
        emptyMessage={copy.empty}
        onRowClick={(ticket) => setExpandedId(expandedId === ticket.id ? null : ticket.id)}
        isRowExpanded={(ticket) => expandedId === ticket.id}
        renderExpandedRow={(ticket) => <ExpandedTicket ticket={ticket} />}
        scrollX
      />
    </AppShell>
  );
}
