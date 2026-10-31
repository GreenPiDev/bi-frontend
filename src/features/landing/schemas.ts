import { z } from 'zod';
import { tr } from '../../i18n/tr';

export const demoRequestFormSchema = z.object({
  name: z.string().min(1, 'Ad soyad gerekli.').max(120),
  company: z.string().max(160).optional().or(z.literal('')),
  email: z.string().email('Geçerli bir e-posta adresi girin.').max(255),
  phone: z.string().max(50).optional().or(z.literal('')),
  message: z.string().max(2000).optional().or(z.literal('')),
});

export type DemoRequestFormValues = z.infer<typeof demoRequestFormSchema>;

const demoAccountMessages = tr.landing.demoAccount.validation;

export const demoAccountFormSchema = z
  .object({
    name: z.string().trim().min(1, demoAccountMessages.name).max(120),
    email: z.string().trim().email(demoAccountMessages.email).max(255),
    password: z.string().min(8, demoAccountMessages.password).max(72),
    passwordConfirm: z.string().min(1, demoAccountMessages.passwordConfirm),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: demoAccountMessages.passwordMismatch,
    path: ['passwordConfirm'],
  });

export type DemoAccountFormValues = z.infer<typeof demoAccountFormSchema>;
