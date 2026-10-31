/**
 * Demo hesabi acildiktan sonra kullanicinin gidecegi login adresi. Tanitim sayfasi kok
 * domain'de (www.pilens.com.tr) calisir, demo kullanicisi ise backend'in subdomain
 * kisitlamasi (core/http/tenant-subdomain.ts) yuzunden sadece kendi tenant'inin
 * subdomain'inden (demo.pilens.com.tr) giris yapabilir. VITE_TENANT_ROOT_DOMAIN bos
 * (yerel gelistirme) ise ayni host'taki /login'e gidilir.
 */
export function buildDemoLoginUrl(tenantSlug: string, email: string): string {
  const query = `?email=${encodeURIComponent(email)}`;
  const rootDomainSetting: string | undefined = import.meta.env.VITE_TENANT_ROOT_DOMAIN;
  const rootDomain = rootDomainSetting?.split(',')[0]?.trim();
  if (!rootDomain) {
    return `/login${query}`;
  }
  return `${window.location.protocol}//${tenantSlug}.${rootDomain}/login${query}`;
}
