import { useMeQuery } from '../auth/use-auth';
import { UsersSection } from './users-section';
import { useRolesQuery } from './use-roles';

/** "Kullanicilar" sekmesi - Roller sekmesinden ayrildi (bkz. settings-page.tsx). GORUNURLUK
 * RBAC'a bagli (settings/users VIEW), ama davet et/rol degistir gibi YAZMA islemleri
 * backend'de hala sabit CompanyAdminGuard'da (bkz. users.controller.ts). */
export function UsersSettingsSection() {
  const meQuery = useMeQuery();
  const isCompanyAdmin = meQuery.data?.permissions.isCompanyAdmin ?? false;
  // roles listesi sadece davet/rol-degistirme modallarinda (isCompanyAdmin) kullanilir;
  // VIEW-only bir kullanicinin "settings/roles" izni olmayabilir, gereksiz 403 onlensin.
  const rolesQuery = useRolesQuery({ enabled: isCompanyAdmin });

  return <UsersSection roles={rolesQuery.data ?? []} isCompanyAdmin={isCompanyAdmin} />;
}
