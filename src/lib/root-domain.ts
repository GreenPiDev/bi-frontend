/**
 * Backend'deki core/http/tenant-subdomain.ts'nin (classifyLoginOrigin) frontend
 * tarafindaki UX karsiligi - guvenlik siniri degil, sadece kok rotanin (RootRedirect)
 * www.pilens.com.tr'de login yerine tanitim sayfasi gostermesi icin kullanilir. Gercek
 * yetki siniri backend'de login istegindeki Origin header'i uzerinden zaten uygulaniyor.
 */
export function isRootDomainHost(hostname = window.location.hostname): boolean {
  const rootDomain = import.meta.env.VITE_TENANT_ROOT_DOMAIN;
  if (!rootDomain) return false;
  if (hostname === rootDomain) return true;
  return hostname === `www.${rootDomain}`;
}
