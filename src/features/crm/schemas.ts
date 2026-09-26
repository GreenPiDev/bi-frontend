import { z } from 'zod';

export const accountFormSchema = z
  .object({
    name: z.string().min(2, 'Firma adı en az 2 karakter olmalı.').max(200),
    taxNumber: z
      .string()
      .max(11, 'Vergi/TC kimlik no en fazla 11 haneli olabilir.')
      .regex(/^\d*$/, 'Sadece rakam girilebilir.')
      .optional(),
    taxOffice: z.string().max(200).optional(),
    sector: z.array(z.string().max(200)).max(20).optional(),
    accountTypes: z
      .array(z.enum(['CUSTOMER', 'SUPPLIER', 'CONTRACTOR', 'SUBCONTRACTOR']))
      .max(4)
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
    landlinePhone: z
      .string()
      .max(11)
      .regex(/^0?\d*$/, 'Sadece rakam girilebilir.')
      .optional(),
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
    district: z.string().max(200).optional(),
    hasContact: z.boolean().optional(),
    contactFirstName: z.string().max(120).optional(),
    contactLastName: z.string().max(120).optional(),
    contactDepartment: z.string().max(200).optional(),
    contactTitle: z.string().max(200).optional(),
    contactPhone: z.string().max(50).optional(),
    contactExtension: z.string().max(20).optional(),
  })
  .refine((values) => !values.hasContact || (values.contactFirstName ?? '').trim().length > 0, {
    message: 'Ad gerekli.',
    path: ['contactFirstName'],
  })
  .refine((values) => !values.hasContact || (values.contactLastName ?? '').trim().length > 0, {
    message: 'Soyad gerekli.',
    path: ['contactLastName'],
  });

export type AccountFormValues = z.infer<typeof accountFormSchema>;

export const contactFormSchema = z.object({
  firstName: z.string().min(1, 'Ad gerekli.').max(120),
  lastName: z.string().min(1, 'Soyad gerekli.').max(120),
  accountId: z.string().max(100).optional(),
  department: z.string().max(200).optional(),
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
  extension: z.string().max(20).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  lastContactedAt: z.string().optional(),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

export const calendarEventFormSchema = z.object({
  title: z.string().min(2, 'Başlık en az 2 karakter olmalı.').max(200),
  description: z.string().max(2000).optional(),
  startAt: z.string().min(1, 'Tarih ve saat gerekli.'),
  attendeeUserIds: z.array(z.string()).max(50).optional(),
});

export type CalendarEventFormValues = z.infer<typeof calendarEventFormSchema>;

export const interactionFormSchema = z
  .object({
    accountName: z.string().max(200).optional(),
    contactName: z.string().max(200).optional(),
    type: z.enum(['CALL', 'VISIT', 'MEETING', 'EMAIL', 'OTHER']),
    notes: z.string().min(1, 'Notlar gerekli.').max(5000),
    occurredAt: z.string().optional(),
    hasOpportunity: z.boolean().optional(),
    opportunityName: z.string().max(200).optional(),
    opportunityStage: z.enum(['NEW', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST']).optional(),
    opportunityValue: z.string().optional(),
    opportunityValueCurrency: z.enum(['TRY', 'USD', 'EUR', 'GBP', 'CHF', 'JPY']).optional(),
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
    reminderTitle: z.string().max(200).optional(),
    reminderDescription: z.string().max(2000).optional(),
  })
  .refine(
    (values) =>
      (values.accountName ?? '').trim().length > 0 || (values.contactName ?? '').trim().length > 0,
    {
      message: 'Firma veya kişiden en az biri doldurulmalı.',
      path: ['accountName'],
    },
  )
  .refine((values) => !values.hasOpportunity || (values.opportunityName ?? '').length >= 2, {
    message: 'Fırsat adı en az 2 karakter olmalı.',
    path: ['opportunityName'],
  })
  .refine((values) => (values.occurredAt ?? '').length > 0, {
    message: 'Tarih gerekli.',
    path: ['occurredAt'],
  })
  .refine((values) => !values.hasReminder || (values.reminderStartAt ?? '').length > 0, {
    message: 'Hatırlatma tarihi gerekli.',
    path: ['reminderStartAt'],
  })
  .refine((values) => !values.hasReminder || (values.reminderAssigneeUserIds ?? []).length > 0, {
    message: 'En az bir kişi seçin.',
    path: ['reminderAssigneeUserIds'],
  })
  .refine((values) => !values.hasReminder || (values.reminderTitle ?? '').trim().length > 0, {
    message: 'Hatırlatma başlığı gerekli.',
    path: ['reminderTitle'],
  });

export type InteractionFormValues = z.infer<typeof interactionFormSchema>;

// Backend PATCH /interactions/:id sadece type/notes/occurredAt/status gunceller (firma/kisi,
// katilimci, firsat ve hatirlatma alanlari olusturma sonrasi degistirilemez) - bu yuzden
// duzenleme formu, olusturma formunun (interactionFormSchema) bir alt kumesi.
export const interactionEditFormSchema = z.object({
  type: z.enum(['CALL', 'VISIT', 'MEETING', 'EMAIL', 'OTHER']),
  notes: z.string().min(1, 'Notlar gerekli.').max(5000),
  occurredAt: z.string().min(1, 'Tarih gerekli.'),
});

export type InteractionEditFormValues = z.infer<typeof interactionEditFormSchema>;

export const opportunityFormSchema = z
  .object({
    accountId: z.string().min(1, 'Firma gerekli.'),
    name: z.string().min(2, 'Fırsat adı en az 2 karakter olmalı.').max(200),
    stage: z.enum(['NEW', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST']).optional(),
    estimatedValue: z.string().optional(),
    estimatedValueCurrency: z.enum(['TRY', 'USD', 'EUR', 'GBP', 'CHF', 'JPY']).optional(),
    description: z.string().max(2000, 'Açıklama en fazla 2000 karakter olabilir.').optional(),
    occurredAt: z.string().min(1, 'Tarih gerekli.'),
    hasReminder: z.boolean().optional(),
    reminderStartAt: z.string().optional(),
    reminderAssigneeUserIds: z.array(z.string()).max(50).optional(),
    reminderNote: z.string().max(1000).optional(),
  })
  .refine((values) => !values.hasReminder || (values.reminderStartAt ?? '').length > 0, {
    message: 'Hatırlatma tarihi gerekli.',
    path: ['reminderStartAt'],
  })
  .refine((values) => !values.hasReminder || (values.reminderAssigneeUserIds ?? []).length > 0, {
    message: 'En az bir kişi seçin.',
    path: ['reminderAssigneeUserIds'],
  });

export type OpportunityFormValues = z.infer<typeof opportunityFormSchema>;

export const projectFormSchema = z.object({
  accountId: z.string().min(1, 'Firma gerekli.'),
  quoteId: z.string().optional(),
  name: z.string().min(2, 'Proje adı en az 2 karakter olmalı.').max(200),
  estimatedBudget: z.string().min(1, 'Tahmini bütçe gerekli.'),
  actualCost: z.string().optional(),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

export const productListFormSchema = z.object({
  name: z.string().min(2, 'Ürün listesi adı en az 2 karakter olmalı.').max(200),
  isDefault: z.boolean().optional(),
});

export type ProductListFormValues = z.infer<typeof productListFormSchema>;

export const productFormSchema = z.object({
  productListId: z.string().min(1, 'Ürün listesi gerekli.'),
  name: z.string().min(2, 'Ürün adı en az 2 karakter olmalı.').max(200),
  sku: z.string().max(100).optional(),
  unit: z.string().min(1, 'Birim gerekli.').max(50),
  minStockLevel: z.string().optional(),
  maxDiscountPct: z.string().optional(),
  price: z.string().optional(),
  currency: z.string().min(1, 'Para birimi gerekli.').max(3),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  costPrice: z.string().optional(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

export const quoteFormSchema = z
  .object({
    accountId: z.string().min(1, 'Firma gerekli.'),
    contactId: z.string().optional(),
    quoteDate: z.string().min(1, 'Teklif tarihi gerekli.'),
    productListId: z.string().min(1, 'Ürün listesi gerekli.'),
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
    leadTime: z.string().max(200).optional(),
    paymentMethod: z.string().max(200).optional(),
    title: z.string().max(200).optional(),
    salesTerms: z.string().max(4000).optional(),
    deliveryTerms: z.string().max(4000).optional(),
    ibanOptionId: z.string().optional(),
  })
  .refine((values) => !values.hasOpportunity || (values.opportunityName ?? '').length >= 2, {
    message: 'Fırsat adı en az 2 karakter olmalı.',
    path: ['opportunityName'],
  });

export type QuoteFormValues = z.infer<typeof quoteFormSchema>;

export const purchaseOrderFormSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().optional(),
      productId: z.string().optional(),
      description: z.string().max(300),
      quantity: z.string().min(1, 'Miktar gerekli.'),
      source: z.enum(['QUOTE', 'EXTRA']),
    }),
  ),
});

export type PurchaseOrderFormValues = z.infer<typeof purchaseOrderFormSchema>;

/** Hem "Yeni Mesaj" modali hem `/mesajlar/:id`'deki satir-ici yanit karti icin ortak
 * sema (bkz. features/crm/message-compose-form.tsx). Konu, sadece yeni bir konusma
 * baslatilirken (yeni mesaj modali her zaman, yanit kartinda "Yeni konusma olarak
 * olustur" isaretliyken) zorunludur - bu kosullu kural Zod semasi yerine bilesenin
 * kendi submit fonksiyonunda kontrol edilir (mode/checkbox durumuna gore degistigi
 * icin statik semaya gomulmez). */
export const messageComposeSchema = z
  .object({
    subject: z.string().max(200).optional(),
    body: z.string().min(1, 'Mesaj metni gerekli.').max(5000),
    toUserIds: z.array(z.string()).min(1, 'En az bir alıcı seçilmelidir.'),
    ccUserIds: z.array(z.string()).max(50).optional(),
    relatedEntity: z.enum(['PROJECT', 'QUOTE', 'INTERACTION']).optional(),
    relatedEntityId: z.string().optional(),
    isNewConversation: z.boolean().optional(),
  })
  .refine((values) => !values.relatedEntity || Boolean(values.relatedEntityId), {
    message: 'Kayıt türü seçildiyse kayıt kimliği de girilmelidir.',
    path: ['relatedEntityId'],
  });

export type MessageComposeFormValues = z.infer<typeof messageComposeSchema>;

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
