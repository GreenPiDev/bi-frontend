import type { SupportTicketStatus } from '../../lib/api';

export const SUPPORT_STATUSES: SupportTicketStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
];

const dateTimeFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

export function formatSupportDate(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}

/** Durum yazisinin rengi - tablo hucresi (salt okunur ve super admin satir-ici secici). */
export const SUPPORT_STATUS_TEXT_CLASSES = {
  OPEN: 'text-app-primary',
  IN_PROGRESS: 'text-amber-600 dark:text-amber-400',
  RESOLVED: 'text-app-success',
  CLOSED: 'text-app-muted',
} as const satisfies Record<SupportTicketStatus, string>;
