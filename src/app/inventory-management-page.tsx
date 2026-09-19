import { AppShell } from './app-shell';
import { ProductListsListContent } from './product-lists-list-page';
import { ProductsListContent } from './products-list-page';
import { StockListContent } from './stock-list-page';
import { HorizontalTabPanel, type HorizontalTabItem } from '../components/ui/horizontal-tab-panel';
import { PageHelp } from '../components/ui/page-help';
import { hasPermission } from '../features/auth/permissions';
import { useMeQuery } from '../features/auth/use-auth';
import { useIsPageModuleAccessible } from '../features/crm/use-page-access';
import { tr } from '../i18n/tr';

export function InventoryManagementPage() {
  const meQuery = useMeQuery();
  const permissions = meQuery.data?.permissions;
  const canView = (pageKey: string) => hasPermission(permissions, pageKey, 'VIEW');

  // Hook'lar kosulsuz cagrilmali (Rules of Hooks) - canView ile birlestirme sonrasinda.
  const productsModuleOk = useIsPageModuleAccessible('products');
  const productListsModuleOk = useIsPageModuleAccessible('product-lists');
  const stockModuleOk = useIsPageModuleAccessible('stock');

  const productsAccessible = canView('products') && productsModuleOk;
  const productListsAccessible = canView('product-lists') && productListsModuleOk;
  const stockAccessible = canView('stock') && stockModuleOk;

  const tabs: HorizontalTabItem[] = [
    ...(productsAccessible
      ? [
          {
            key: 'products',
            label: tr.inventory.tabs.products,
            content: <ProductsListContent />,
          },
        ]
      : []),
    ...(productListsAccessible
      ? [
          {
            key: 'productLists',
            label: tr.inventory.tabs.productLists,
            content: <ProductListsListContent />,
          },
        ]
      : []),
    ...(stockAccessible
      ? [{ key: 'stock', label: tr.inventory.tabs.stock, content: <StockListContent /> }]
      : []),
  ];

  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-app-text">{tr.inventory.title}</h1>
        <PageHelp text={tr.help.inventory} />
      </div>
      <p className="text-sm text-app-muted">{tr.inventory.subtitle}</p>

      <div className="mt-6">
        {tabs.length > 0 ? (
          <HorizontalTabPanel tabs={tabs} queryParam="tab" />
        ) : (
          <p className="mt-4 text-sm text-app-muted">{tr.inventory.noAccess}</p>
        )}
      </div>
    </AppShell>
  );
}
