import { useEffect } from 'react';

const APP_NAME = 'PiLens';

/** Sekme basligi iki bagimsiz kaynaktan olusur: sayfaya ozel baslik (opsiyonel) ve
 * okunmamis bildirim sayisi. Ikisi de document.title'a dogrudan yazarsa birbirini ezer;
 * bu yuzden tek bir yerde birlestirilir: "(3) Firmalar · PiLens". */
let pageTitle: string | null = null;
let unreadCount = 0;

const SEPARATOR = ' · ';

/** Yan yana ayni parcalari teke indirir: sekme adi sayfa adiyla ayniysa
 * ("Fırsatlar · Fırsatlar") baslikta bir kez gorunur. */
function dedupeParts(title: string): string {
  return title
    .split(SEPARATOR)
    .filter((part, index, parts) => index === 0 || part !== parts[index - 1])
    .join(SEPARATOR);
}

function apply(): void {
  const base = pageTitle ? dedupeParts(`${pageTitle}${SEPARATOR}${APP_NAME}`) : APP_NAME;
  document.title = unreadCount > 0 ? `(${unreadCount}) ${base}` : base;
}

export function setUnreadTitleCount(count: number): void {
  unreadCount = count;
  apply();
}

/** Sayfaya ozel baslik koymak icin sayfa bilesenlerinde cagrilir; sayfadan cikinca
 * varsayilan "PiLens"e doner. Bildirim sayisi otomatik korunur. */
export function usePageTitle(title: string): void {
  useEffect(() => {
    // Bos deger = "baslik yok" (ornegin detay sayfasinda veri henuz yuklenmedi).
    pageTitle = title || null;
    apply();
    return () => {
      pageTitle = null;
      apply();
    };
  }, [title]);
}
