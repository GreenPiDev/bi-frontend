import { ChevronRight } from 'lucide-react';
import { Fragment, useState } from 'react';
import { clsx } from 'clsx';
import { Switch } from '../../components/ui/switch';
import type { PageDefinition, PermissionAction, RolePermissionInput } from '../../lib/api';
import { tr } from '../../i18n/tr';

const ACTIONS: { action: PermissionAction; labelKey: keyof typeof tr.settings.roles.form }[] = [
  { action: 'VIEW', labelKey: 'viewAction' },
  { action: 'CREATE', labelKey: 'createAction' },
  { action: 'UPDATE', labelKey: 'updateAction' },
  { action: 'DELETE', labelKey: 'deleteAction' },
];

interface RolePermissionEditorProps {
  pages: PageDefinition[];
  value: RolePermissionInput[];
  onChange: (value: RolePermissionInput[]) => void;
}

function findEntry(
  value: RolePermissionInput[],
  pageKey: string,
  tabKey: string | null,
): RolePermissionInput | undefined {
  return value.find((p) => p.pageKey === pageKey && (p.tabKey ?? null) === tabKey);
}

function withActions(
  value: RolePermissionInput[],
  pageKey: string,
  tabKey: string | null,
  actions: PermissionAction[],
): RolePermissionInput[] {
  const rest = value.filter((p) => !(p.pageKey === pageKey && (p.tabKey ?? null) === tabKey));
  if (actions.length === 0) return rest;
  return [...rest, { pageKey, tabKey, actions }];
}

/** Roller sekmesindeki izin matrisi: her sayfa/tab icin VIEW/CREATE/UPDATE/DELETE
 * anahtarlari - promptta tarif edilen "siyah/mavi satir, tiklaninca alt tablar acilir"
 * UX'i (bkz. docs/PLAN_ROL_YONETIMI.md SS10). */
export function RolePermissionEditor({ pages, value, onChange }: RolePermissionEditorProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpanded(pageKey: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(pageKey)) next.delete(pageKey);
      else next.add(pageKey);
      return next;
    });
  }

  function toggleAction(pageKey: string, tabKey: string | null, action: PermissionAction) {
    const current = findEntry(value, pageKey, tabKey)?.actions ?? [];
    const next = current.includes(action)
      ? current.filter((a) => a !== action)
      : [...current, action];
    onChange(withActions(value, pageKey, tabKey, next));
  }

  return (
    <div className="overflow-auto rounded-lg border border-app-border">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-app-border bg-app-bg-muted text-xs uppercase text-app-muted">
          <tr>
            <th className="px-3 py-2">{tr.settings.roles.form.pageColumn}</th>
            {ACTIONS.map(({ action, labelKey }) => (
              <th key={action} className="px-3 py-2 text-center">
                {tr.settings.roles.form[labelKey]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pages.map((page) => {
            const hasTabs = (page.tabs?.length ?? 0) > 0;
            const isExpanded = expanded.has(page.key);
            return (
              <Fragment key={page.key}>
                <tr
                  className={clsx(
                    'border-b border-app-border last:border-0',
                    hasTabs && 'cursor-pointer hover:bg-app-bg-muted',
                  )}
                  onClick={hasTabs ? () => toggleExpanded(page.key) : undefined}
                >
                  <td className="px-3 py-2">
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1.5 font-semibold',
                        hasTabs ? 'text-app-primary' : 'text-app-text',
                      )}
                    >
                      {hasTabs && (
                        <ChevronRight
                          size={14}
                          className={clsx('transition-transform', isExpanded && 'rotate-90')}
                        />
                      )}
                      {page.label}
                    </span>
                  </td>
                  {ACTIONS.map(({ action }) => (
                    <td
                      key={action}
                      className="px-3 py-2 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Switch
                        checked={
                          findEntry(value, page.key, null)?.actions.includes(action) ?? false
                        }
                        onChange={() => toggleAction(page.key, null, action)}
                        label={`${page.label} - ${action}`}
                      />
                    </td>
                  ))}
                </tr>
                {hasTabs &&
                  isExpanded &&
                  page.tabs?.map((tab) => (
                    <tr
                      key={`${page.key}-${tab.key}`}
                      className="border-b border-app-border bg-app-bg-muted/40 last:border-0"
                    >
                      <td className="px-3 py-2 pl-8 text-app-muted">{tab.label}</td>
                      {ACTIONS.map(({ action }) => (
                        <td key={action} className="px-3 py-2 text-center">
                          <Switch
                            checked={
                              findEntry(value, page.key, tab.key)?.actions.includes(action) ?? false
                            }
                            onChange={() => toggleAction(page.key, tab.key, action)}
                            label={`${page.label} / ${tab.label} - ${action}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
