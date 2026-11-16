import { z } from 'zod';
import { tr } from '../../i18n/tr';

const t = tr.support.validation;

export const supportTicketFormSchema = z.object({
  kind: z.enum(['PROBLEM', 'SUGGESTION'], { message: t.kindRequired }),
  message: z.string().trim().min(1, t.messageRequired).max(5000, t.messageTooLong),
});
export type SupportTicketFormValues = z.infer<typeof supportTicketFormSchema>;

/** Yazismaya yeni mesaj - hem tenant hem super admin tarafi. */
export const supportTicketMessageFormSchema = z.object({
  body: z.string().trim().min(1, t.messageRequired).max(5000, t.messageTooLong),
});
export type SupportTicketMessageFormValues = z.infer<typeof supportTicketMessageFormSchema>;
