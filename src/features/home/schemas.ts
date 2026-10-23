import { z } from 'zod';

export const noteFormSchema = z
  .object({
    content: z.string().trim().min(1, 'Not metni gerekli.').max(5000),
    color: z.enum(['YELLOW', 'BLUE', 'RED', 'GREEN', 'PURPLE']),
    isPrivate: z.boolean(),
    hasReminder: z.boolean().optional(),
    reminderStartAt: z.string().optional(),
    reminderTitle: z.string().max(200).optional(),
    reminderDescription: z.string().max(2000).optional(),
  })
  .refine((values) => !values.hasReminder || (values.reminderStartAt ?? '').length > 0, {
    message: 'Hatırlatma tarihi gerekli.',
    path: ['reminderStartAt'],
  })
  .refine((values) => !values.hasReminder || (values.reminderTitle ?? '').trim().length > 0, {
    message: 'Hatırlatma başlığı gerekli.',
    path: ['reminderTitle'],
  });

export type NoteFormValues = z.infer<typeof noteFormSchema>;
