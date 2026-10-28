/**
 * Backend'deki core/http/tenant-subdomain.ts'nin (classifyLoginOrigin) frontend
 * tarafindaki UX karsiligi - guvenlik siniri degil, sadece kok rotanin (RootRedirect)
 * www.pilens.com.tr'de login yerine tanitim sayfasi gostermesi icin kullanilir. Gercek
 * yetki siniri backend'de login istegindeki Origin header'i uzerinden zaten uygulaniyor.
 */
export function isRootDomainHost(hostname = window.location.hostname): boolean {
  const rootDomainSetting: string | undefined = import.meta.env.VITE_TENANT_ROOT_DOMAIN;
  if (!rootDomainSetting) return false;
  const rootDomains = rootDomainSetting.split(',').map((domain: string) => domain.trim());
  return rootDomains.some(
    (rootDomain: string) => hostname === rootDomain || hostname === `www.${rootDomain}`,
  );
}
