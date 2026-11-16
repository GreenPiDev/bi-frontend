import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, Headset, Mail, Phone, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { IconActionButton } from '../components/ui/icon-action-button';
import { PageHelp } from '../components/ui/page-help';
import { Table, type TableColumn } from '../components/ui/table';
import { TextareaField } from '../components/ui/textarea-field';
import { useToast } from '../components/ui/toast-context';
import { supportTicketFormSchema, type SupportTicketFormValues } from '../features/support/schemas';
import {
  SupportKindBadge,
  SupportReplyIndicator,
  SupportRowChevron,
  SupportStatusBadge,
} from '../features/support/support-ticket-parts';
import { formatSupportDate } from '../features/support/support-format';
import { SupportConversation } from '../features/support/support-conversation';
import {
  useAddSupportTicketMessageMutation,
  useCreateSupportTicketMutation,
  useSupportTicketsQuery,
  useSupportTicketsRealtimeSync,
} from '../features/support/use-support-tickets';
import { tr } from '../i18n/tr';
import { ApiError, type SupportTicket, type SupportTicketKind } from '../lib/api';
import { AppShell } from './app-shell';

const t = tr.support;

const SUPPORT_EMAIL = 'support@greenpiworks.com';
const SUPPORT_PHONE = '+90 533 238 43 90';

interface ContactTileProps {
  icon: LucideIcon;
  label: string;
  value: string;
  href: string;
  copiedMessage: string;
}

function ContactTile({ icon: Icon, label, value, href, copiedMessage }: ContactTileProps) {
  const toast = useToast();

  function copy() {
    navigator.clipboard
      .writeText(value)
      .then(() => toast.success(copiedMessage))
      .catch(() => toast.error(tr.common.unexpectedError));
  }

  return (
    <li className="relative flex items-center overflow-hidden border border-app-border bg-app-surface p-5 transition-colors hover:bg-app-bg-muted">
      <Icon
        size={96}
        strokeWidth={1.5}
        aria-hidden="true"
        className="pointer-events-none absolute -right-5 -bottom-2 rotate-[14deg] text-app-muted opacity-15"
      />
      <div className="relative z-10 min-w-0 flex-1">
        <span className="block text-sm text-app-muted">{label}</span>
        <div className="flex min-w-0 items-center gap-1">
          <a
            href={href}
            className="truncate text-lg font-bold text-app-text hover:text-app-primary"
          >
            {value}
          </a>
          <IconActionButton icon={Copy} tooltip={t.contact.copy} onClick={copy} />
        </div>
      </div>
    </li>
  );
}

function ContactCard() {
  return (
    <section className="overflow-hidden rounded-lg border border-app-border bg-app-surface">
      <div className="flex items-center gap-3 bg-gradient-to-br from-app-primary/20 via-app-primary/10 to-transparent px-4 py-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-app-primary text-white shadow-sm">
          <Headset className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-app-text">{t.contact.title}</h2>
          <p className="text-xs text-app-muted">{t.contact.subtitle}</p>
        </div>
      </div>
      <ul className="space-y-3 p-4">
        <ContactTile
          icon={Mail}
          label={t.contact.email}
          value={SUPPORT_EMAIL}
          href={`mailto:${SUPPORT_EMAIL}`}
          copiedMessage={t.contact.emailCopied}
        />
        <ContactTile
          icon={Phone}
          label={t.contact.phone}
          value={SUPPORT_PHONE}
          href={`tel:${SUPPORT_PHONE.replace(/\s/g, '')}`}
          copiedMessage={t.contact.phoneCopied}
        />
      </ul>
    </section>
  );
}

const KIND_OPTIONS: SupportTicketKind[] = ['PROBLEM', 'SUGGESTION'];

/** Tek secimli checkbox grubu: birini isaretlemek digerini kaldirir. */
function KindCheckboxes({
  value,
  onChange,
  error,
}: {
  value: SupportTicketKind | undefined;
  onChange: (value: SupportTicketKind | undefined) => void;
  error?: string;
}) {
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium text-app-text">
        {t.form.kindLabel} <span className="text-app-danger">*</span>
      </legend>
      <div className="flex flex-wrap gap-4">
        {KIND_OPTIONS.map((kind) => (
          <label
            key={kind}
            className="flex cursor-pointer items-center gap-2 text-sm text-app-text"
          >
            <input
              type="checkbox"
              className="h-4 w-4 accent-app-primary"
              checked={value === kind}
              onChange={(event) => onChange(event.target.checked ? kind : undefined)}
              aria-invalid={Boolean(error)}
            />
            {t.kinds[kind]}
          </label>
        ))}
      </div>
      {error && <p className="mt-1 text-xs text-app-danger">{error}</p>}
    </fieldset>
  );
}

function NewTicketForm() {
  const toast = useToast();
  const mutation = useCreateSupportTicketMutation();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupportTicketFormValues>({
    resolver: zodResolver(supportTicketFormSchema),
    defaultValues: { message: '' },
  });

  function onSubmit(values: SupportTicketFormValues) {
    mutation.mutate(values, {
      onSuccess: () => {
        toast.success(t.form.success);
        reset({ kind: undefined, message: '' });
      },
      onError: (error) =>
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError),
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-3 rounded-lg border border-app-border bg-app-surface p-4"
      noValidate
    >
      <h2 className="text-sm font-semibold text-app-text">{t.form.title}</h2>
      <Controller
        control={control}
        name="kind"
        render={({ field }) => (
          <KindCheckboxes
            value={field.value}
            onChange={field.onChange}
            error={errors.kind?.message}
          />
        )}
      />
      <TextareaField
        label={t.form.messageLabel}
        placeholder={t.form.messagePlaceholder}
        required
        rows={5}
        error={errors.message?.message}
        {...register('message')}
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={mutation.isPending}>
          {t.form.submit}
        </Button>
      </div>
    </form>
  );
}

function buildColumns(expandedId: string | null): TableColumn<SupportTicket>[] {
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
    {
      key: 'kind',
      header: t.columns.kind,
      render: (ticket) => <SupportKindBadge kind={ticket.kind} />,
    },
    { key: 'sender', header: t.columns.sender, render: (ticket) => ticket.createdBy?.name ?? '—' },
    {
      key: 'status',
      header: t.columns.status,
      render: (ticket) => <SupportStatusBadge status={ticket.status} />,
    },
    {
      key: 'reply',
      header: t.columns.reply,
      render: (ticket) => <SupportReplyIndicator ticket={ticket} viewer="user" />,
    },
  ];
}

function TicketConversation({ ticket }: { ticket: SupportTicket }) {
  const toast = useToast();
  const mutation = useAddSupportTicketMessageMutation();
  return (
    <SupportConversation
      ticket={ticket}
      viewer="user"
      isSending={mutation.isPending}
      onSend={(body, onSuccess) =>
        mutation.mutate(
          { id: ticket.id, body },
          {
            onSuccess,
            onError: (error) =>
              toast.error(error instanceof ApiError ? error.message : t.conversation.sendError),
          },
        )
      }
    />
  );
}

/** Tum tenant'larda, tum kullanicilara acik (page-registry 'support', alwaysVisible). */
export function SupportPage() {
  const ticketsQuery = useSupportTicketsQuery();
  const [searchParams] = useSearchParams();
  // Bildirimden gelindiyse (?talep=<id>) o talep acik gelsin.
  const [expandedId, setExpandedId] = useState<string | null>(() => searchParams.get('talep'));
  useSupportTicketsRealtimeSync();

  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-app-text">{t.title}</h1>
        <PageHelp text={tr.help.support} />
      </div>
      <p className="mt-1 mb-4 text-sm text-app-muted">{t.subtitle}</p>
      <div className="mb-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <NewTicketForm />
        <ContactCard />
      </div>
      <h2 className="mb-2 text-base font-semibold text-app-text">{t.list.title}</h2>
      {ticketsQuery.isError && <FormError message={t.list.error} />}
      <Table
        columns={buildColumns(expandedId)}
        data={ticketsQuery.data ?? []}
        keyField={(ticket) => ticket.id}
        isLoading={ticketsQuery.isPending}
        loadingMessage={t.list.loading}
        emptyMessage={t.list.empty}
        onRowClick={(ticket) => setExpandedId(expandedId === ticket.id ? null : ticket.id)}
        isRowExpanded={(ticket) => expandedId === ticket.id}
        renderExpandedRow={(ticket) => <TicketConversation ticket={ticket} />}
        scrollX
      />
    </AppShell>
  );
}
