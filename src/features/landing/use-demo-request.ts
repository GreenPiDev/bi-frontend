import { useMutation } from '@tanstack/react-query';
import type { DemoRequestFormValues } from './schemas';

const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';
const SUBMIT_ERROR = 'Talep gönderilemedi, lütfen daha sonra tekrar deneyin.';

/** Backend'e dokunmaz - formlar dogrudan web3forms.com'a (3. parti form->email servisi)
 * post eder, sonuc mevcut Mail modulunden gecmez. access_key public/client-side kullanim
 * icin tasarlanmistir (web3forms'un kendi modeli), gizli bir sunucu sirri degildir.
 * Hem tanitim sayfasindaki "Demo Iste" formu hem suresi dolan demo hesabinin "Beni arayin"
 * talebi (features/demo-account) ayni kanali kullanir. */
export async function submitToWeb3Forms(fields: Record<string, string>): Promise<void> {
  const accessKey = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY;
  if (!accessKey) {
    throw new Error(SUBMIT_ERROR);
  }
  const response = await fetch(WEB3FORMS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ access_key: accessKey, ...fields }),
  });
  const data: unknown = await response.json().catch(() => null);
  const success =
    response.ok &&
    typeof data === 'object' &&
    data !== null &&
    (data as { success?: boolean }).success === true;
  if (!success) {
    throw new Error(SUBMIT_ERROR);
  }
}

export function useDemoRequestMutation() {
  return useMutation({
    mutationFn: (values: DemoRequestFormValues) =>
      submitToWeb3Forms({
        subject: `PiLens demo talebi - ${values.company}`,
        from_name: 'PiLens Tanıtım Sayfası',
        name: values.name,
        company: values.company || '—',
        email: values.email,
        phone: values.phone || '—',
        message: values.message || '—',
      }),
  });
}
