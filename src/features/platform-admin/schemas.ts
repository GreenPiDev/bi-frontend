import { z } from 'zod';

export const newCustomerFormSchema = z.object({
  tenantName: z.string().min(1, 'Şirket adı gerekli.').max(200),
  adminName: z.string().min(1, 'Yönetici adı gerekli.').max(200),
  adminEmail: z.string().email('Geçerli bir e-posta adresi girin.').max(255),
});

export type NewCustomerFormValues = z.infer<typeof newCustomerFormSchema>;
