import { AppShell } from './app-shell';
import { PurchaseOrdersListContent } from './purchase-order-list-page';
import { SalesOrdersListContent } from './sales-order-list-page';
import { HorizontalTabPanel, type HorizontalTabItem } from '../components/ui/horizontal-tab-panel';
import { PageHelp } from '../components/ui/page-help';
import { hasPermission } from '../features/auth/permissions';
import { useMeQuery } from '../features/auth/use-auth';
import { useIsPageModuleAccessible } from '../features/crm/use-page-access';
import { tr } from '../i18n/tr';

/** /siparisler - kullanici istegiyle (bkz. CLAUDE.md, Satis Siparisi genislemesi)
 * Satis Siparisleri + Satin Alma Siparisleri'ni ayni sayfada iki sekme olarak
 * birlestirir - inventory-management-page.tsx ile ayni *ListContent deseni. */
export function OrdersManagementPage() {
  const meQuery = useMeQuery();
  const permissions = meQuery.data?.permissions;
  const canView = (pageKey: string) => hasPermission(permissions, pageKey, 'VIEW');

  // Hook'lar kosulsuz cagrilmali (Rules of Hooks) - canView ile birlestirme sonrasinda.
  const salesOrdersModuleOk = useIsPageModuleAccessible('sales-orders');
  const purchaseOrdersModuleOk = useIsPageModuleAccessible('purchase-orders');

  const salesOrdersAccessible = canView('sales-orders') && salesOrdersModuleOk;
  const purchaseOrdersAccessible = canView('purchase-orders') && purchaseOrdersModuleOk;

  const tabs: HorizontalTabItem[] = [
    ...(salesOrdersAccessible
      ? [
          {
            key: 'salesOrders',
            label: tr.ordersManagement.tabs.salesOrders,
            content: <SalesOrdersListContent />,
          },
        ]
      : []),
    ...(purchaseOrdersAccessible
      ? [
          {
            key: 'purchaseOrders',
            label: tr.ordersManagement.tabs.purchaseOrders,
            content: <PurchaseOrdersListContent />,
          },
        ]
      : []),
  ];

  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-app-text">{tr.ordersManagement.title}</h1>
        <PageHelp text={tr.help.ordersManagement} />
      </div>
      <p className="text-sm text-app-muted">{tr.ordersManagement.subtitle}</p>

      <div className="mt-6">
        {tabs.length > 0 ? (
          <HorizontalTabPanel tabs={tabs} queryParam="tab" />
        ) : (
          <p className="mt-4 text-sm text-app-muted">{tr.ordersManagement.noAccess}</p>
        )}
      </div>
    </AppShell>
  );
}
