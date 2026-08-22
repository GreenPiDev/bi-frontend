import { z } from 'zod';

export const registerFormSchema = z.object({
  tenantName: z.string().min(2, 'Şirket adı en az 2 karakter olmalı.').max(120),
  name: z.string().min(1, 'Ad soyad gerekli.').max(120),
  email: z.string().email('Geçerli bir e-posta adresi girin.').max(255),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalı.').max(72),
});

export type RegisterFormValues = z.infer<typeof registerFormSchema>;

export const loginFormSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi girin.').max(255),
  password: z.string().min(1, 'Şifre gerekli.').max(72),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const acceptInvitationFormSchema = z.object({
  name: z.string().min(1, 'Ad soyad gerekli.').max(120),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalı.').max(72),
});

export type AcceptInvitationFormValues = z.infer<typeof acceptInvitationFormSchema>;

export const updateProfileFormSchema = z.object({
  name: z.string().min(1, 'Ad soyad gerekli.').max(120),
  email: z.string().email('Geçerli bir e-posta adresi girin.').max(255),
});

export type UpdateProfileFormValues = z.infer<typeof updateProfileFormSchema>;

export const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mevcut şifre gerekli.').max(72),
    newPassword: z.string().min(8, 'Yeni şifre en az 8 karakter olmalı.').max(72),
    newPasswordConfirm: z.string().min(1, 'Yeni şifreyi tekrar girin.'),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    message: 'Yeni şifreler eşleşmiyor.',
    path: ['newPasswordConfirm'],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;
