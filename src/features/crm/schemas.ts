import { z } from 'zod';

export const accountFormSchema = z.object({
  name: z.string().min(2, 'Firma adı en az 2 karakter olmalı.').max(200),
  taxNumber: z.string().max(20).optional(),
  taxOffice: z.string().max(200).optional(),
  sector: z.string().max(200).optional(),
  accountTypes: z
    .array(z.enum(['CUSTOMER', 'SUPPLIER']))
    .max(2)
    .optional(),
  website: z
    .string()
    .max(300)
    .optional()
    .refine(
      (value) => !value || /^https?:\/\//.test(value),
      'Web sitesi http(s):// ile başlamalı.',
    ),
  phone: z.string().max(50).optional(),
  email: z
    .string()
    .max(255)
    .optional()
    .refine(
      (value) => !value || z.string().email().safeParse(value).success,
      'Geçerli bir e-posta adresi girin.',
    ),
  address: z.string().max(500).optional(),
  city: z.string().max(200).optional(),
});

export type AccountFormValues = z.infer<typeof accountFormSchema>;

export const contactFormSchema = z.object({
  firstName: z.string().min(1, 'Ad gerekli.').max(120),
  lastName: z.string().min(1, 'Soyad gerekli.').max(120),
  accountId: z.string().max(100).optional(),
  title: z.string().max(200).optional(),
  email: z
    .string()
    .max(255)
    .optional()
    .refine(
      (value) => !value || z.string().email().safeParse(value).success,
      'Geçerli bir e-posta adresi girin.',
    ),
  phone: z.string().max(50).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  lastContactedAt: z.string().optional(),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

export const calendarEventFormSchema = z
  .object({
    title: z.string().min(2, 'Başlık en az 2 karakter olmalı.').max(200),
    description: z.string().max(2000).optional(),
    startAt: z.string().min(1, 'Başlangıç tarihi gerekli.'),
    endAt: z.string().min(1, 'Bitiş tarihi gerekli.'),
    allDay: z.boolean().optional(),
    attendeeUserIds: z.array(z.string()).max(50).optional(),
  })
  .refine((values) => new Date(values.endAt) >= new Date(values.startAt), {
    message: 'Bitiş tarihi başlangıçtan önce olamaz.',
    path: ['endAt'],
  });

export type CalendarEventFormValues = z.infer<typeof calendarEventFormSchema>;

export const interactionFormSchema = z
  .object({
    accountName: z.string().min(1, 'Firma gerekli.').max(200),
    contactName: z.string().max(200).optional(),
    type: z.enum(['CALL', 'VISIT', 'MEETING', 'EMAIL', 'OTHER']),
    notes: z.string().min(1, 'Notlar gerekli.').max(5000),
    occurredAt: z.string().min(1, 'Tarih gerekli.'),
    hasOpportunity: z.boolean().optional(),
    opportunityName: z.string().max(200).optional(),
    opportunityStage: z.enum(['NEW', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST']).optional(),
    opportunityValue: z.string().optional(),
    participants: z
      .array(
        z.object({
          name: z.string().min(1, 'Ad gerekli.'),
          isInternal: z.boolean(),
          note: z.string().optional(),
        }),
      )
      .max(20)
      .optional(),
    hasReminder: z.boolean().optional(),
    reminderStartAt: z.string().optional(),
    reminderAssigneeUserIds: z.array(z.string()).max(50).optional(),
    reminderNote: z.string().max(1000).optional(),
  })
  .refine((values) => !values.hasOpportunity || (values.opportunityName ?? '').length >= 2, {
    message: 'Fırsat adı en az 2 karakter olmalı.',
    path: ['opportunityName'],
  })
  .refine((values) => !values.hasReminder || (values.reminderStartAt ?? '').length > 0, {
    message: 'Hatırlatma tarihi gerekli.',
    path: ['reminderStartAt'],
  })
  .refine((values) => !values.hasReminder || (values.reminderAssigneeUserIds ?? []).length > 0, {
    message: 'En az bir kişi seçin.',
    path: ['reminderAssigneeUserIds'],
  });

export type InteractionFormValues = z.infer<typeof interactionFormSchema>;

export const opportunityFormSchema = z.object({
  accountId: z.string().min(1, 'Firma gerekli.'),
  name: z.string().min(2, 'Fırsat adı en az 2 karakter olmalı.').max(200),
  stage: z.enum(['NEW', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST']).optional(),
  estimatedValue: z.string().optional(),
});

export type OpportunityFormValues = z.infer<typeof opportunityFormSchema>;

export const productFormSchema = z.object({
  name: z.string().min(2, 'Ürün adı en az 2 karakter olmalı.').max(200),
  sku: z.string().max(100).optional(),
  unit: z.string().min(1, 'Birim gerekli.').max(50),
  minStockLevel: z.string().optional(),
  maxDiscountPct: z.string().optional(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

export const priceListFormSchema = z.object({
  name: z.string().min(2, 'Fiyat listesi adı en az 2 karakter olmalı.').max(200),
  isDefault: z.boolean().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Ürün gerekli.'),
        unitPrice: z.string().min(1, 'Birim fiyat gerekli.'),
      }),
    )
    .min(1, 'En az bir ürün eklenmelidir.'),
});

export type PriceListFormValues = z.infer<typeof priceListFormSchema>;

export const quoteFormSchema = z
  .object({
    accountId: z.string().min(1, 'Firma gerekli.'),
    priceListId: z.string().min(1, 'Fiyat listesi gerekli.'),
    items: z
      .array(
        z.object({
          productId: z.string().min(1, 'Ürün gerekli.'),
          quantity: z.string().min(1, 'Miktar gerekli.'),
          unitPrice: z.string().optional(),
          discountPct: z.string().optional(),
          vatPct: z.string().optional(),
        }),
      )
      .min(1, 'En az bir ürün satırı eklenmelidir.'),
    hasOpportunity: z.boolean().optional(),
    opportunityName: z.string().max(200).optional(),
    opportunityStage: z.enum(['NEW', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST']).optional(),
    opportunityValue: z.string().optional(),
  })
  .refine((values) => !values.hasOpportunity || (values.opportunityName ?? '').length >= 2, {
    message: 'Fırsat adı en az 2 karakter olmalı.',
    path: ['opportunityName'],
  });

export type QuoteFormValues = z.infer<typeof quoteFormSchema>;

/** Bos string alanlari undefined'a cevirir - backend "gonderilmedi" ile "bos"
 * degerini boyle ayirt ediyor (PATCH'te sadece degisen alanlar gonderilmeli). */
export function cleanEmptyStrings<T extends Record<string, unknown>>(values: T): T {
  const result = { ...values };
  for (const key of Object.keys(result)) {
    if (result[key as keyof T] === '') {
      (result as Record<string, unknown>)[key] = undefined;
    }
  }
  return result;
}
