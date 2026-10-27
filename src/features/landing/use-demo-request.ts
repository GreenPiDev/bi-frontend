import { useMutation } from '@tanstack/react-query';
import type { DemoRequestFormValues } from './schemas';

const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';

/** Backend'e dokunmaz - www.pilens.com.tr'deki tanitim sayfasinin "Demo Iste" formu
 * dogrudan web3forms.com'a (3. parti form->email servisi) post eder, sonuc mevcut
 * Mail modulunden gecmez. access_key public/client-side kullanim icin tasarlanmistir
 * (web3forms'un kendi modeli), gizli bir sunucu sirri degildir. */
export function useDemoRequestMutation() {
  return useMutation({
    mutationFn: async (values: DemoRequestFormValues) => {
      const accessKey = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY;
      if (!accessKey) {
        throw new Error('Demo talebi gönderilemedi, lütfen daha sonra tekrar deneyin.');
      }
      const response = await fetch(WEB3FORMS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: accessKey,
          subject: `PiLens demo talebi - ${values.company}`,
          from_name: 'PiLens Tanıtım Sayfası',
          name: values.name,
          company: values.company,
          email: values.email,
          phone: values.phone || '—',
          message: values.message || '—',
        }),
      });
      const data: unknown = await response.json().catch(() => null);
      const success =
        response.ok &&
        typeof data === 'object' &&
        data !== null &&
        (data as { success?: boolean }).success === true;
      if (!success) {
        throw new Error('Demo talebi gönderilemedi, lütfen daha sonra tekrar deneyin.');
      }
    },
  });
}
