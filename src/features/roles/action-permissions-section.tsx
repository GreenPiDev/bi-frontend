import { useQueryClient } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { Button } from '../../components/ui/button';
import { Select } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { useToast } from '../../components/ui/toast-context';
import {
  ApiError,
  updateRole,
  type CrudPermissionAction,
  type RolePermissionInput,
} from '../../lib/api';
import { tr } from '../../i18n/tr';
import { useMeQuery } from '../auth/use-auth';
import {
  findPermissionEntry,
  flattenRolePermissions,
  withPermissionActions,
} from './role-permission-utils';
import { usePageRegistryQuery, useRolesQuery } from './use-roles';

const ACTION_COLUMNS: CrudPermissionAction[] = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'IMPORT',
  'EXPORT',
  'APPROVE',
];

const ACTION_LABELS: Record<CrudPermissionAction, string> = {
  CREATE: tr.settings.roles.form.createAction,
  UPDATE: tr.settings.roles.form.updateAction,
  DELETE: tr.settings.roles.form.deleteAction,
  IMPORT: tr.settings.roles.form.importAction,
  EXPORT: tr.settings.roles.form.exportAction,
  APPROVE: tr.settings.roles.form.approveAction,
};

interface ActionRow {
  pageKey: string;
  tabKey: string | null;
  label: string;
  actions: CrudPermissionAction[];
}

/** Tab'li sayfalar (su an sadece "Ayarlar") tek bir collapsible grup olarak, tab'i
 * olmayan sayfalar dogrudan tek bir satir olarak gosterilir - bkz. PageAccessMatrixSection
 * ile ayni collapsible desen. */
interface ActionPageGroup {
  pageKey: string;
  label: string;
  hasTabs: boolean;
  rows: ActionRow[];
}

/** "Islem Izinleri" sekmesi - Sayfa Erisimleri'nden (VIEW/gorunurluk) ayri, rol-secicili
 * bir yapi: once rol secilir, altta o rolun gorebildigi sayfalar icin CREATE/UPDATE/DELETE/
 * IMPORT/EXPORT switch'leri gosterilir. Sayfa x rol x aksiyon 3 boyutunu tek tabloya
 * sikistirmak yerine rol boyutu bir secici ile sabitlenir (bkz. CLAUDE.md tartismasi). */
export function ActionPermissionsSection() {
  const toast = useToast();
  const meQuery = useMeQuery();
  const isCompanyAdmin = meQuery.data?.permissions.isCompanyAdmin ?? false;
  const queryClient = useQueryClient();
  const rolesQuery = useRolesQuery();
  const pageRegistryQuery = usePageRegistryQuery();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, RolePermissionInput[]>>({});
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const roles = rolesQuery.data ?? [];
  const isLoading = rolesQuery.isPending || pageRegistryQuery.isPending;
  const dirtyRoleIds = useMemo(() => Object.keys(draft), [draft]);
  const activeRoleId = selectedRoleId ?? roles[0]?.id ?? null;
  const activeRole = roles.find((r) => r.id === activeRoleId);

  const groups = useMemo<ActionPageGroup[]>(() => {
    const pages = pageRegistryQuery.data ?? [];
    const result: ActionPageGroup[] = [];
    for (const page of pages) {
      if (page.tabs && page.tabs.length > 0) {
        const tabRows = page.tabs
          .filter((tab) => tab.supportedActions && tab.supportedActions.length > 0)
          .map((tab) => ({
            pageKey: page.key,
            tabKey: tab.key,
            label: tab.label,
            actions: tab.supportedActions as CrudPermissionAction[],
          }));
        if (tabRows.length > 0) {
          result.push({ pageKey: page.key, label: page.label, hasTabs: true, rows: tabRows });
        }
      } else if (page.supportedActions && page.supportedActions.length > 0) {
        result.push({
          pageKey: page.key,
          label: page.label,
          hasTabs: false,
          rows: [
            { pageKey: page.key, tabKey: null, label: page.label, actions: page.supportedActions },
          ],
        });
      }
    }
    return result;
  }, [pageRegistryQuery.data]);

  function toggleExpanded(pageKey: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(pageKey)) next.delete(pageKey);
      else next.add(pageKey);
      return next;
    });
  }

  function permissionsFor(roleId: string): RolePermissionInput[] {
    if (draft[roleId]) return draft[roleId];
    const role = roles.find((r) => r.id === roleId);
    return role ? flattenRolePermissions(role) : [];
  }

  function toggleAction(
    roleId: string,
    pageKey: string,
    tabKey: string | null,
    action: CrudPermissionAction,
  ) {
    const current = permissionsFor(roleId);
    const entryActions = findPermissionEntry(current, pageKey, tabKey)?.actions ?? [];
    const nextActions = entryActions.includes(action)
      ? entryActions.filter((a) => a !== action)
      : [...entryActions, action];
    const next = withPermissionActions(current, pageKey, tabKey, nextActions);
    setDraft((prev) => ({ ...prev, [roleId]: next }));
  }

  function renderActionSwitch(
    row: ActionRow,
    action: CrudPermissionAction,
    role: NonNullable<typeof activeRole>,
  ) {
    if (!row.actions.includes(action)) {
      return <span className="text-app-muted">—</span>;
    }
    const permissions = permissionsFor(role.id);
    const entry = findPermissionEntry(permissions, row.pageKey, row.tabKey);
    return (
      <Switch
        disabled={!isCompanyAdmin || role.isSystem}
        checked={entry?.actions.includes(action) ?? false}
        onChange={() => toggleAction(role.id, row.pageKey, row.tabKey, action)}
        label={`${role.name} - ${row.label} - ${ACTION_LABELS[action]}`}
      />
    );
  }

  function discardChanges() {
    setDraft({});
  }

  async function saveChanges() {
    const ids = Object.keys(draft);
    if (ids.length === 0) return;
    try {
      for (const roleId of ids) {
        setSavingRoleId(roleId);
        await updateRole(roleId, { permissions: draft[roleId] });
      }
      await queryClient.invalidateQueries({ queryKey: ['roles'] });
      setDraft({});
      toast.success(tr.settings.actionPermissions.saveSuccess);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
    } finally {
      setSavingRoleId(null);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-app-muted">{tr.common.loading}</p>;
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-app-text">
            {tr.settings.actionPermissions.title}
          </h2>
          <p className="text-sm text-app-muted">{tr.settings.actionPermissions.subtitle}</p>
        </div>
        {isCompanyAdmin && dirtyRoleIds.length > 0 && (
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="secondary" onClick={discardChanges}>
              {tr.settings.actionPermissions.discardButton}
            </Button>
            <Button
              type="button"
              disabled={savingRoleId !== null}
              onClick={() => void saveChanges()}
            >
              {savingRoleId !== null
                ? tr.settings.roles.form.saving
                : tr.settings.actionPermissions.saveButton}
            </Button>
          </div>
        )}
      </div>

      {roles.length === 0 ? (
        <p className="text-sm text-app-muted">{tr.settings.actionPermissions.noRoles}</p>
      ) : (
        <>
          <div className="max-w-xs">
            <Select
              label={tr.settings.actionPermissions.roleLabel}
              value={activeRoleId ?? ''}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              options={roles.map((role) => ({
                value: role.id,
                label: role.isSystem
                  ? `${role.name} (${tr.settings.roles.systemBadge})`
                  : role.name,
              }))}
            />
          </div>

          {activeRole && (
            <div className="overflow-auto rounded-lg border border-app-border">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-app-border bg-app-bg-muted text-xs uppercase text-app-muted">
                  <tr>
                    <th className="px-3 py-2">{tr.settings.actionPermissions.pageColumn}</th>
                    {ACTION_COLUMNS.map((action) => (
                      <th
                        key={action}
                        className="border-l border-app-border px-3 py-2 text-center normal-case text-app-text"
                      >
                        {ACTION_LABELS[action]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeRole.isCompanyAdmin && (
                    <tr>
                      <td
                        colSpan={ACTION_COLUMNS.length + 1}
                        className="px-3 py-2 text-sm text-app-muted"
                      >
                        {tr.settings.actionPermissions.companyAdminHint}
                      </td>
                    </tr>
                  )}
                  {!activeRole.isCompanyAdmin &&
                    groups.map((group) => {
                      const isExpanded = expanded.has(group.pageKey);
                      return (
                        <Fragment key={group.pageKey}>
                          <tr
                            className={clsx(
                              'border-b border-app-border last:border-0',
                              group.hasTabs && 'cursor-pointer hover:bg-app-bg-muted',
                            )}
                            onClick={
                              group.hasTabs ? () => toggleExpanded(group.pageKey) : undefined
                            }
                          >
                            <td className="px-3 py-2">
                              <span
                                className={clsx(
                                  'inline-flex items-center gap-1.5 font-semibold',
                                  group.hasTabs ? 'text-app-primary' : 'text-app-text',
                                )}
                              >
                                {group.hasTabs && (
                                  <ChevronRight
                                    size={14}
                                    className={clsx(
                                      'transition-transform',
                                      isExpanded && 'rotate-90',
                                    )}
                                  />
                                )}
                                {group.label}
                              </span>
                            </td>
                            {ACTION_COLUMNS.map((action) => (
                              <td
                                key={action}
                                className="border-l border-app-border px-3 py-2 text-center"
                                onClick={group.hasTabs ? (e) => e.stopPropagation() : undefined}
                              >
                                {group.hasTabs
                                  ? null
                                  : renderActionSwitch(group.rows[0], action, activeRole)}
                              </td>
                            ))}
                          </tr>
                          {group.hasTabs &&
                            isExpanded &&
                            group.rows.map((row) => (
                              <tr
                                key={`${row.pageKey}-${row.tabKey ?? ''}`}
                                className="border-b border-app-border bg-app-bg-muted/40 last:border-0"
                              >
                                <td className="px-3 py-2 pl-8 text-app-muted">{row.label}</td>
                                {ACTION_COLUMNS.map((action) => (
                                  <td
                                    key={action}
                                    className="border-l border-app-border px-3 py-2 text-center"
                                  >
                                    {renderActionSwitch(row, action, activeRole)}
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
          )}
        </>
      )}
    </section>
  );
}
