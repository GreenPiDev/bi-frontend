import { AppShell } from './app-shell';
import { PostSaleCasesListContent } from './post-sale-case-list-page';
import { SurveysListContent } from './survey-list-page';
import { HorizontalTabPanel, type HorizontalTabItem } from '../components/ui/horizontal-tab-panel';
import { PageHelp } from '../components/ui/page-help';
import { hasPermission } from '../features/auth/permissions';
import { useMeQuery } from '../features/auth/use-auth';
import { useIsPageModuleAccessible } from '../features/crm/use-page-access';
import { tr } from '../i18n/tr';

/** /satis-sonrasi - kullanici istegiyle (2026-10-20 genislemesi) "Kayitlar" (mevcut
 * PostSaleCase listesi) + "Anketler" (yeni Survey sablon yonetimi) sekmelerini
 * birlestirir - orders-management-page.tsx ile ayni *ListContent deseni. */
export function PostSaleManagementPage() {
  const meQuery = useMeQuery();
  const permissions = meQuery.data?.permissions;
  const canView = (pageKey: string) => hasPermission(permissions, pageKey, 'VIEW');

  // Hook'lar kosulsuz cagrilmali (Rules of Hooks) - canView ile birlestirme sonrasinda.
  const casesModuleOk = useIsPageModuleAccessible('post-sale-cases');
  const surveysModuleOk = useIsPageModuleAccessible('surveys');

  const casesAccessible = canView('post-sale-cases') && casesModuleOk;
  const surveysAccessible = canView('surveys') && surveysModuleOk;

  const tabs: HorizontalTabItem[] = [
    ...(casesAccessible
      ? [
          {
            key: 'cases',
            label: tr.postSaleManagement.tabs.cases,
            content: <PostSaleCasesListContent />,
          },
        ]
      : []),
    ...(surveysAccessible
      ? [
          {
            key: 'surveys',
            label: tr.postSaleManagement.tabs.surveys,
            content: <SurveysListContent />,
          },
        ]
      : []),
  ];

  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-app-text">{tr.postSaleManagement.title}</h1>
        <PageHelp text={tr.help.postSaleManagement} />
      </div>
      <p className="text-sm text-app-muted">{tr.postSaleManagement.subtitle}</p>

      <div className="mt-6">
        {tabs.length > 0 ? (
          <HorizontalTabPanel tabs={tabs} queryParam="tab" />
        ) : (
          <p className="mt-4 text-sm text-app-muted">{tr.postSaleManagement.noAccess}</p>
        )}
      </div>
    </AppShell>
  );
}
