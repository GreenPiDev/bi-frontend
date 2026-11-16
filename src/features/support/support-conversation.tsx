import { zodResolver } from '@hookform/resolvers/zod';
import { clsx } from 'clsx';
import { Clock, Headset, SendHorizontal } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../../components/ui/button';
import { TextareaField } from '../../components/ui/textarea-field';
import { tr } from '../../i18n/tr';
import type { SupportTicket, SupportTicketAuthorType } from '../../lib/api';
import { supportTicketMessageFormSchema, type SupportTicketMessageFormValues } from './schemas';
import { formatSupportDate } from './support-format';
import { SupportKindBadge } from './support-ticket-parts';

const t = tr.support.conversation;

interface ThreadEntry {
  id: string;
  authorType: SupportTicketAuthorType;
  authorName: string;
  body: string;
  createdAt: string;
}

function toThread(ticket: SupportTicket): ThreadEntry[] {
  return [
    {
      id: `${ticket.id}-initial`,
      authorType: 'USER',
      authorName: ticket.createdBy?.name ?? t.unknownSender,
      body: ticket.message,
      createdAt: ticket.createdAt,
    },
    ...ticket.messages.map((message) => ({
      id: message.id,
      authorType: message.authorType,
      authorName:
        message.authorType === 'ADMIN' ? t.supportTeam : (message.author?.name ?? t.unknownSender),
      body: message.body,
      createdAt: message.createdAt,
    })),
  ];
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('tr'))
    .join('');
}

/**
 * WhatsApp gibi: izleyenin kendi mesajlari sagda, karsi tarafinkiler solda. Musteri
 * panelinde musteri sagda/destek ekibi solda; super admin panelinde tersi. Kendi mesaj
 * balonu marka renginde, karsi tarafinki notr.
 */
function MessageBubble({
  entry,
  isMine,
  header,
}: {
  entry: ThreadEntry;
  isMine: boolean;
  header?: ReactNode;
}) {
  const isSupport = entry.authorType === 'ADMIN';
  return (
    <li className={clsx('flex items-end gap-2', isMine && 'flex-row-reverse')}>
      {isSupport ? (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-app-primary text-white shadow-sm">
          <Headset className="h-4 w-4" aria-hidden="true" />
        </span>
      ) : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-app-bg-muted text-xs font-bold text-app-text">
          {initials(entry.authorName) || '?'}
        </span>
      )}
      <div className={clsx('flex max-w-[75%] min-w-0 flex-col', isMine && 'items-end')}>
        <div
          className={clsx(
            'mb-1 flex flex-wrap items-baseline gap-x-2 text-xs',
            isMine && 'justify-end',
          )}
        >
          <span className={clsx('font-semibold', isSupport ? 'text-app-primary' : 'text-app-text')}>
            {entry.authorName}
          </span>
          {header}
          <span className="text-app-muted">{formatSupportDate(entry.createdAt)}</span>
        </div>
        <div
          className={clsx(
            'rounded-2xl px-4 py-2.5 text-sm text-app-text shadow-sm',
            isMine
              ? 'rounded-br-sm border border-app-primary/25 bg-app-primary/10'
              : 'rounded-bl-sm border border-app-border bg-app-surface',
          )}
        >
          <p className="break-words whitespace-pre-wrap">{entry.body}</p>
        </div>
      </div>
    </li>
  );
}

/** Destek ekibinden henuz mesaj yok - destek ekibinin tarafinda (izleyene gore sol/sag) durur. */
function WaitingForSupport({ text, onRight }: { text: string; onRight: boolean }) {
  return (
    <li className={clsx('flex items-center gap-2', onRight && 'flex-row-reverse')}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-app-border text-app-muted">
        <Clock className="h-4 w-4" aria-hidden="true" />
      </span>
      <p className="text-sm text-app-muted italic">{text}</p>
    </li>
  );
}

interface MessageComposerProps {
  isPending: boolean;
  /** Basariliysa form temizlenir. */
  onSend: (body: string, onSuccess: () => void) => void;
}

function MessageComposer({ isPending, onSend }: MessageComposerProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupportTicketMessageFormValues>({
    resolver: zodResolver(supportTicketMessageFormSchema),
    defaultValues: { body: '' },
  });
  const submit = handleSubmit((values) => onSend(values.body, () => reset({ body: '' })));

  return (
    <form onSubmit={submit} noValidate className="border-t border-app-border pt-3">
      <TextareaField
        label={t.composerLabel}
        placeholder={t.composerPlaceholder}
        rows={3}
        error={errors.body?.message}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            void submit();
          }
        }}
        {...register('body')}
      />
      <div className="mt-2 flex justify-end">
        <Button type="submit" disabled={isPending} className="inline-flex items-center gap-1.5">
          <SendHorizontal className="h-4 w-4" aria-hidden="true" />
          {t.send}
        </Button>
      </div>
    </form>
  );
}

interface SupportConversationProps {
  ticket: SupportTicket;
  viewer: 'user' | 'admin';
  isSending: boolean;
  onSend: MessageComposerProps['onSend'];
}

/**
 * Talebin yazismasi + yeni mesaj alani. Kapatilmis talepte yazma alani yerine bilgi
 * notu gosterilir (backend de reddediyor). Tablo satirinin genisletilmis alaninda
 * render edildigi icin tiklamalar satira kabarcıklanmaz (satir kapanmasin).
 */
export function SupportConversation({
  ticket,
  viewer,
  isSending,
  onSend,
}: SupportConversationProps) {
  const thread = toThread(ticket);
  const hasSupportMessage = ticket.messages.some((message) => message.authorType === 'ADMIN');
  const listRef = useRef<HTMLOListElement>(null);

  // Yeni mesaj gelince (kendi veya karsi taraf, realtime) en alta kaydir.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [thread.length]);

  return (
    <div className="space-y-3 py-1" onClick={(event) => event.stopPropagation()}>
      <ol ref={listRef} className="max-h-[28rem] space-y-4 overflow-y-auto px-1 py-2">
        {thread.map((entry, index) => (
          <MessageBubble
            key={entry.id}
            entry={entry}
            isMine={(entry.authorType === 'ADMIN') === (viewer === 'admin')}
            header={index === 0 ? <SupportKindBadge kind={ticket.kind} /> : undefined}
          />
        ))}
        {!hasSupportMessage && (
          <WaitingForSupport
            onRight={viewer === 'admin'}
            text={viewer === 'admin' ? t.waitingForSupportAdmin : t.waitingForSupport}
          />
        )}
      </ol>
      {ticket.status === 'CLOSED' && viewer === 'user' ? (
        <p className="border-t border-app-border pt-3 text-sm text-app-muted">{t.closedNote}</p>
      ) : (
        <MessageComposer key={ticket.id} isPending={isSending} onSend={onSend} />
      )}
    </div>
  );
}
