import { z } from 'zod';

export const demoRequestFormSchema = z.object({
  name: z.string().min(1, 'Ad soyad gerekli.').max(120),
  company: z.string().max(160).optional().or(z.literal('')),
  email: z.string().email('Geçerli bir e-posta adresi girin.').max(255),
  phone: z.string().max(50).optional().or(z.literal('')),
  message: z.string().max(2000).optional().or(z.literal('')),
});

export type DemoRequestFormValues = z.infer<typeof demoRequestFormSchema>;
