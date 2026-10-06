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
    website: z.string().max(300).optional(),
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
  reminderType: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  startAt: z.string().min(1, 'Tarih ve saat gerekli.'),
  isMeeting: z.boolean().optional(),
  attendeeUserIds: z.array(z.string()).max(50).optional(),
});

export type CalendarEventFormValues = z.infer<typeof calendarEventFormSchema>;

export const interactionFormSchema = z
  .object({
    accountName: z.string().max(200).optional(),
    contactName: z.string().max(200).optional(),
    type: z.string().min(1, 'Görüşme şekli seçilmelidir.').max(200),
    subject: z.string().max(200).optional(),
    notes: z.string().max(5000).optional(),
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
  type: z.string().min(1, 'Görüşme şekli seçilmelidir.').max(200),
  subject: z.string().max(200).optional(),
  notes: z.string().max(5000).optional(),
  occurredAt: z.string().min(1, 'Tarih gerekli.'),
});

export type InteractionEditFormValues = z.infer<typeof interactionEditFormSchema>;

// "Bağlı Görüşme Ekle" modalı - interactionFormSchema'nın firma/kişi serbest-metin ve
// fırsat/katılımcı bölümleri olmayan, firma zaten sabit geldiği için küçültülmüş hali.
export const linkedInteractionFormSchema = z
  .object({
    contactId: z.string().optional(),
    performedByUserId: z.string().min(1, 'Görüşmeyi yapan kişi seçilmelidir.'),
    type: z.string().min(1, 'Görüşme şekli seçilmelidir.').max(200),
    notes: z.string().max(5000).optional(),
    occurredAt: z.string().min(1, 'Tarih gerekli.'),
    hasReminder: z.boolean().optional(),
    reminderStartAt: z.string().optional(),
    reminderAssigneeUserIds: z.array(z.string()).max(50).optional(),
    reminderTitle: z.string().max(200).optional(),
    reminderDescription: z.string().max(2000).optional(),
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

export type LinkedInteractionFormValues = z.infer<typeof linkedInteractionFormSchema>;

// "Bağlı Görüşme" düzenleme modalı - backend PATCH /interactions/:id sadece type/notes/
// occurredAt/contactId/performedByUserId günceller (hatırlatma oluşturma sonrası
// değiştirilemez, bkz. interaction-edit-page.tsx'teki aynı kısıt), bu yüzden
// linkedInteractionFormSchema'nın hatırlatma bölümü olmayan alt kümesi.
export const linkedInteractionEditFormSchema = z.object({
  contactId: z.string().optional(),
  performedByUserId: z.string().min(1, 'Görüşmeyi yapan kişi seçilmelidir.'),
  type: z.string().min(1, 'Görüşme şekli seçilmelidir.').max(200),
  notes: z.string().max(5000).optional(),
  occurredAt: z.string().min(1, 'Tarih gerekli.'),
});

export type LinkedInteractionEditFormValues = z.infer<typeof linkedInteractionEditFormSchema>;

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
  name: z.string().min(2, 'Proje adı en az 2 karakter olmalı.').max(200),
  estimatedBudget: z.string().min(1, 'Tahmini bütçe gerekli.'),
  actualCost: z.string().optional(),
  /** Sadece proje düzenlenirken gösterilir/gönderilir (bkz. project-form-page.tsx). */
  quoteIds: z.array(z.string()).optional(),
  /** "Bizden ilgili" - hem oluşturma hem düzenlemede gösterilir/gönderilir. */
  responsibleUserIds: z.array(z.string()).optional(),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

export const productListFormSchema = z.object({
  name: z.string().min(2, 'Ürün listesi adı en az 2 karakter olmalı.').max(200),
});

export type ProductListFormValues = z.infer<typeof productListFormSchema>;

export const warehouseFormSchema = z.object({
  name: z.string().min(2, 'Depo adı en az 2 karakter olmalı.').max(200),
  address: z.string().max(500).optional(),
  isDefault: z.boolean().optional(),
});

export type WarehouseFormValues = z.infer<typeof warehouseFormSchema>;

export const drawingLibraryComponentFormSchema = z.object({
  key: z
    .string()
    .min(1, 'Anahtar gerekli.')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Sadece küçük harf, rakam ve tire (-) kullanılabilir.'),
  name: z.string().min(2, 'Ad en az 2 karakter olmalı.').max(200),
  category: z.string().min(1, 'Kategori gerekli.').max(100),
  defaultWidthMm: z.string().min(1, 'Genişlik gerekli.'),
  defaultHeightMm: z.string().min(1, 'Yükseklik gerekli.'),
});

export type DrawingLibraryComponentFormValues = z.infer<typeof drawingLibraryComponentFormSchema>;

export const drawingPanelTemplateFormSchema = z.object({
  name: z.string().min(2, 'Ad en az 2 karakter olmalı.').max(200),
  type: z.enum(['AG_BACKPLATE', 'OG_CELL']),
  widthMm: z.string().min(1, 'Genişlik gerekli.'),
  heightMm: z.string().min(1, 'Yükseklik gerekli.'),
  layoutJson: z.string().refine((value) => {
    try {
      const parsed: unknown = JSON.parse(value);
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
    } catch {
      return false;
    }
  }, 'Geçerli bir JSON nesnesi olmalı (örn. { "bands": [] }).'),
});

export type DrawingPanelTemplateFormValues = z.infer<typeof drawingPanelTemplateFormSchema>;

export const drawingPreviewFormSchema = z.object({
  items: z
    .array(
      z.object({
        libraryComponentKey: z.string().min(1, 'Komponent seçin.'),
        bandKey: z.string().min(1, 'Bant seçin.'),
        quantity: z.string().min(1, 'Adet gerekli.'),
      }),
    )
    .max(100),
  busbars: z
    .array(
      z.object({
        startX: z.string().min(1, 'Gerekli.'),
        startY: z.string().min(1, 'Gerekli.'),
        endX: z.string().min(1, 'Gerekli.'),
        endY: z.string().min(1, 'Gerekli.'),
        thicknessMm: z.string().min(1, 'Gerekli.'),
      }),
    )
    .max(20),
});

export type DrawingPreviewFormValues = z.infer<typeof drawingPreviewFormSchema>;

export const drawingCreateFormSchema = z.object({
  quoteId: z.string().min(1, 'Teklif seçin.'),
  templateId: z.string().min(1, 'Şablon seçin.'),
  name: z.string().min(1, 'Ad gerekli.').max(200),
  panelGroupLabel: z.string().max(200).optional(),
  items: z
    .array(
      z.object({
        libraryComponentKey: z.string().min(1, 'Komponent seçin.'),
        bandKey: z.string().min(1, 'Bant seçin.'),
        quantity: z.string().min(1, 'Adet gerekli.'),
      }),
    )
    .max(100),
  busbars: z
    .array(
      z.object({
        startX: z.string().min(1, 'Gerekli.'),
        startY: z.string().min(1, 'Gerekli.'),
        endX: z.string().min(1, 'Gerekli.'),
        endY: z.string().min(1, 'Gerekli.'),
        thicknessMm: z.string().min(1, 'Gerekli.'),
      }),
    )
    .max(20),
});

export type DrawingCreateFormValues = z.infer<typeof drawingCreateFormSchema>;

export const quoteTemplateFormSchema = z.object({
  name: z.string().min(2, 'Şablon adı en az 2 karakter olmalı.').max(200),
  isDefault: z.boolean().optional(),
  companyDisplayName: z.string().min(2, 'Şirket adı en az 2 karakter olmalı.').max(200),
  companyTagline: z.string().max(400).optional().or(z.literal('')),
});

export type QuoteTemplateFormValues = z.infer<typeof quoteTemplateFormSchema>;

export const productFormSchema = z.object({
  productListId: z.string().min(1, 'Ürün listesi gerekli.'),
  name: z.string().min(2, 'Ürün adı en az 2 karakter olmalı.').max(200),
  sku: z.string().max(100).optional(),
  unit: z.string().min(1, 'Birim gerekli.').max(50),
  minStockLevel: z.string().optional(),
  maxDiscountPct: z.string().optional(),
  price: z.string().min(1, 'Fiyat gerekli.'),
  currency: z.string().min(1, 'Para birimi gerekli.').max(3),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  brand: z.string().max(100).optional(),
  // "Teknik Ozellikler / Pano Cizim Bilgileri" - hepsi opsiyonel, string olarak tutulur
  // (diger sayisal alanlarla - minStockLevel, maxDiscountPct - ayni desen).
  drawingWidthMm: z.string().optional(),
  drawingHeightMm: z.string().optional(),
  drawingDepthMm: z.string().optional(),
  drawingLibraryComponentKey: z.string().max(100).optional(),
  drawingBandOrder: z.string().optional(),
  drawingBandKey: z.string().max(100).optional(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

export const quoteFormSchema = z
  .object({
    accountId: z.string({ message: 'Firma gerekli.' }).min(1, 'Firma gerekli.'),
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
    paymentTerms: z.string().max(4000).optional(),
    salesTerms: z.string().max(4000).optional(),
    deliveryTerms: z.string().max(4000).optional(),
    generalTerms: z.string().max(4000).optional(),
    ibanOptionId: z.string().optional(),
    quoteCurrency: z.string().min(1, 'Teklif para birimi gerekli.'),
    templateId: z.string().optional(),
    senderId: z.string({ message: 'Gönderen gerekli.' }).min(1, 'Gönderen gerekli.'),
  })
  .refine((values) => !values.hasOpportunity || (values.opportunityName ?? '').length >= 2, {
    message: 'Fırsat adı en az 2 karakter olmalı.',
    path: ['opportunityName'],
  });

export type QuoteFormValues = z.infer<typeof quoteFormSchema>;

export const purchaseOrderFormSchema = z.object({
  /** UI-only: teklif secicisini filtrelemek icin, gonderilen payload'a dahil edilmez. */
  accountId: z.string().optional(),
  quoteId: z.string().optional(),
  title: z.string().trim().max(200).optional(),
  items: z.array(
    z.object({
      id: z.string().optional(),
      /** UI-only: urun secicisini o listedeki urunlerle sinirlamak icin, payload'a
       * dahil edilmez. */
      productListId: z.string().optional(),
      productId: z.string().optional(),
      description: z.string().max(300),
      quantity: z.string().min(1, 'Miktar gerekli.'),
      source: z.enum(['QUOTE', 'EXTRA']),
    }),
  ),
});

export type PurchaseOrderFormValues = z.infer<typeof purchaseOrderFormSchema>;

/** /siparisler/yeni - teklif zorunlu degil (bkz. CreatePurchaseOrderSchema, backend).
 * Kalemler her zaman EXTRA kaynaklidir, `source` alani formda yok. */
export const purchaseOrderCreateFormSchema = z.object({
  accountId: z.string().optional(),
  quoteId: z.string().optional(),
  title: z.string().trim().max(200).optional(),
  items: z
    .array(
      z.object({
        productListId: z.string().optional(),
        productId: z.string().optional(),
        description: z.string().max(300),
        quantity: z.string().min(1, 'Miktar gerekli.'),
      }),
    )
    .min(1, 'En az bir kalem eklemelisiniz.'),
});

export type PurchaseOrderCreateFormValues = z.infer<typeof purchaseOrderCreateFormSchema>;

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

export const stockUpdateFormSchema = z.object({
  warehouseId: z.string().min(1, 'Depo seçimi gerekli.'),
  quantity: z
    .string()
    .min(1, 'Miktar gerekli.')
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, 'Geçerli bir miktar girin.'),
  note: z.string().max(500).optional(),
});

export type StockUpdateFormValues = z.infer<typeof stockUpdateFormSchema>;

/** `mode === 'increase'` iken birim maliyet zorunlu (WAC hesabina girer) - `decrease`'de
 * maliyet degismedigi icin alan hic gosterilmez/istenmez (bkz. docs/PLAN_STOK_MALIYET.md
 * Faz 6). */
export function createStockAdjustFormSchema(mode: 'increase' | 'decrease') {
  return z.object({
    warehouseId: z.string().min(1, 'Depo seçimi gerekli.'),
    amount: z
      .string()
      .min(1, 'Miktar gerekli.')
      .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, "Miktar 0'dan büyük olmalı."),
    unitCost:
      mode === 'increase'
        ? z
            .string()
            .min(1, 'Birim maliyet gerekli.')
            .refine(
              (v) => !Number.isNaN(Number(v)) && Number(v) > 0,
              "Birim maliyet 0'dan büyük olmalı.",
            )
        : z.string().optional(),
    note: z.string().max(500).optional(),
  });
}

export type StockAdjustFormValues = z.infer<ReturnType<typeof createStockAdjustFormSchema>>;

/** Teklif onayinda depo secimi - bkz. docs/PLAN_STOK_MALIYET.md Faz 5. */
export const approveQuoteFormSchema = z.object({
  warehouseId: z.string().min(1, 'Depo seçimi gerekli.'),
});

export type ApproveQuoteFormValues = z.infer<typeof approveQuoteFormSchema>;

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
