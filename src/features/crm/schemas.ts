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
