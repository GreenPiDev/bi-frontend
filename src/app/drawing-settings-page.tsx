import { AppShell } from './app-shell';
import { DrawingListContent } from './drawing-list-page';
import { DrawingLibraryListContent } from './drawing-library-list-page';
import { DrawingPanelTemplateListContent } from './drawing-panel-template-list-page';
import { HorizontalTabPanel, type HorizontalTabItem } from '../components/ui/horizontal-tab-panel';
import { PageHelp } from '../components/ui/page-help';
import { hasPermission } from '../features/auth/permissions';
import { useMeQuery } from '../features/auth/use-auth';
import { useIsPageModuleAccessible } from '../features/crm/use-page-access';
import { tr } from '../i18n/tr';

export function DrawingSettingsPage() {
  const meQuery = useMeQuery();
  const permissions = meQuery.data?.permissions;
  const canView = (pageKey: string) => hasPermission(permissions, pageKey, 'VIEW');

  const drawingsModuleOk = useIsPageModuleAccessible('drawings');
  const libraryModuleOk = useIsPageModuleAccessible('drawing-library');
  const templatesModuleOk = useIsPageModuleAccessible('drawing-templates');

  const drawingsAccessible = canView('drawings') && drawingsModuleOk;
  const libraryAccessible = canView('drawing-library') && libraryModuleOk;
  const templatesAccessible = canView('drawing-templates') && templatesModuleOk;

  const tabs: HorizontalTabItem[] = [
    ...(drawingsAccessible
      ? [
          {
            key: 'drawings',
            label: tr.drawingSettings.tabs.drawings,
            content: <DrawingListContent />,
          },
        ]
      : []),
    ...(libraryAccessible
      ? [
          {
            key: 'library',
            label: tr.drawingSettings.tabs.library,
            content: <DrawingLibraryListContent />,
          },
        ]
      : []),
    ...(templatesAccessible
      ? [
          {
            key: 'templates',
            label: tr.drawingSettings.tabs.templates,
            content: <DrawingPanelTemplateListContent />,
          },
        ]
      : []),
  ];

  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-app-text">{tr.drawingSettings.title}</h1>
        <PageHelp text={tr.help.drawingSettings} />
      </div>
      <p className="text-sm text-app-muted">{tr.drawingSettings.subtitle}</p>

      <div className="mt-6">
        {tabs.length > 0 ? (
          <HorizontalTabPanel tabs={tabs} queryParam="tab" />
        ) : (
          <p className="mt-4 text-sm text-app-muted">{tr.drawingSettings.noAccess}</p>
        )}
      </div>
    </AppShell>
  );
}
