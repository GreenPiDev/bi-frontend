import { ChevronDown, ChevronRight } from 'lucide-react';
import { tr } from '../../i18n/tr';
import type { SupportTicket, SupportTicketKind, SupportTicketStatus } from '../../lib/api';
import { SUPPORT_STATUS_TEXT_CLASSES } from './support-format';

const t = tr.support;

export function SupportKindBadge({ kind }: { kind: SupportTicketKind }) {
  return (
    <span
      className={
        kind === 'PROBLEM'
          ? 'text-sm font-semibold text-app-danger'
          : 'text-sm font-semibold text-orange-600 dark:text-orange-400'
      }
    >
      {t.kinds[kind]}
    </span>
  );
}

export function SupportStatusBadge({ status }: { status: SupportTicketStatus }) {
  return (
    <span className={`text-sm font-semibold ${SUPPORT_STATUS_TEXT_CLASSES[status]}`}>
      {t.statuses[status]}
    </span>
  );
}

/**
 * Cevap kolonu, yazismanin son mesajina gore: son mesaj destek ekibindense "Cevaplandi"
 * (yesil); kullanicidansa "Yanit bekleniyor" - super admin icin aksiyon gerektirdigi
 * icin amber, tenant icin soluk. Hic mesaj yoksa da kullanici bekliyordur.
 */
export function SupportReplyIndicator({
  ticket,
  viewer,
}: {
  ticket: SupportTicket;
  viewer: 'user' | 'admin';
}) {
  const last = ticket.messages.at(-1);
  if (last?.authorType === 'ADMIN') {
    return <span className="text-sm font-semibold text-app-success">{t.replied}</span>;
  }
  return viewer === 'admin' ? (
    <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
      {t.awaitingReply}
    </span>
  ) : (
    <span className="text-sm text-app-muted">{t.awaitingReply}</span>
  );
}

/** Satirin basindaki ok: satirin tiklanip acilabildigini gosterir, acikken asagi bakar. */
export function SupportRowChevron({ expanded }: { expanded: boolean }) {
  const Icon = expanded ? ChevronDown : ChevronRight;
  return <Icon className="h-4 w-4 text-app-muted" aria-hidden="true" />;
}
