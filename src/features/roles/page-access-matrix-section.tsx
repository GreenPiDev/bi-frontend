import { useQueryClient } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { useToast } from '../../components/ui/toast-context';
import { ApiError, updateRole, type RolePermissionInput } from '../../lib/api';
import { tr } from '../../i18n/tr';
import { useMeQuery } from '../auth/use-auth';
import {
  findPermissionEntry,
  flattenRolePermissions,
  withPermissionActions,
} from './role-permission-utils';
import { usePageRegistryQuery, useRolesQuery } from './use-roles';

/** Roller x Sayfalar gorunurluk matrisi. Her sayfa icin rol basina tek bir VIEW switch'i
 * var (CREATE/UPDATE/DELETE yonetimi ayri bir sekmeye tasinacak, bkz. CLAUDE.md). Birden
 * fazla tab'i olan sayfalar (su an sadece "Ayarlar") mavi ve genisletilebilir gosterilir;
 * genisletilince o sayfanin tab'lari icin de rol basina ayri VIEW switch'leri acilir.
 * Bu ekranin GORUNURLUGU RBAC'a bagli ama izin DEGISTIRME (PATCH /roles/:id) backend'de
 * hala sabit CompanyAdminGuard'da - VIEW-only kullanicilar bu matrisi salt-okunur gorur. */
export function PageAccessMatrixSection() {
  const toast = useToast();
  const meQuery = useMeQuery();
  const isCompanyAdmin = meQuery.data?.permissions.isCompanyAdmin ?? false;
  const queryClient = useQueryClient();
  const rolesQuery = useRolesQuery();
  const pageRegistryQuery = usePageRegistryQuery();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<Record<string, RolePermissionInput[]>>({});
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);

  const roles = rolesQuery.data ?? [];
  const pages = (pageRegistryQuery.data ?? []).filter((p) => !p.alwaysVisible);
  const isLoading = rolesQuery.isPending || pageRegistryQuery.isPending;
  const dirtyRoleIds = useMemo(() => Object.keys(draft), [draft]);

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

  function toggleView(roleId: string, pageKey: string, tabKey: string | null) {
    const current = permissionsFor(roleId);
    const entryActions = findPermissionEntry(current, pageKey, tabKey)?.actions ?? [];
    const nextActions = entryActions.includes('VIEW')
      ? entryActions.filter((a) => a !== 'VIEW')
      : [...entryActions, 'VIEW' as const];
    const next = withPermissionActions(current, pageKey, tabKey, nextActions);
    setDraft((prev) => ({ ...prev, [roleId]: next }));
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
      toast.success(tr.settings.pageAccess.saveSuccess);
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
          <h2 className="text-base font-bold text-app-text">{tr.settings.pageAccess.title}</h2>
          <p className="text-sm text-app-muted">{tr.settings.pageAccess.subtitle}</p>
        </div>
        {isCompanyAdmin && dirtyRoleIds.length > 0 && (
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="secondary" onClick={discardChanges}>
              {tr.settings.pageAccess.discardButton}
            </Button>
            <Button
              type="button"
              disabled={savingRoleId !== null}
              onClick={() => void saveChanges()}
            >
              {savingRoleId !== null
                ? tr.settings.roles.form.saving
                : tr.settings.pageAccess.saveButton}
            </Button>
          </div>
        )}
      </div>

      {roles.length === 0 ? (
        <p className="text-sm text-app-muted">{tr.settings.pageAccess.noRoles}</p>
      ) : (
        <div className="overflow-auto rounded-lg border border-app-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-app-border bg-app-bg-muted text-xs uppercase text-app-muted">
              <tr>
                <th className="px-3 py-2">{tr.settings.pageAccess.pageColumn}</th>
                {roles.map((role) => (
                  <th
                    key={role.id}
                    className="border-l border-app-border px-3 py-2 text-center normal-case text-app-text"
                  >
                    <span className="font-semibold">{role.name}</span>
                    {role.isSystem && (
                      <span className="ml-1 text-[10px] font-normal normal-case text-app-muted">
                        ({tr.settings.roles.systemBadge})
                      </span>
                    )}
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
                      {roles.map((role) => {
                        const permissions = permissionsFor(role.id);
                        return (
                          <td
                            key={role.id}
                            className="border-l border-app-border px-3 py-2 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Switch
                              disabled={!isCompanyAdmin || role.isSystem}
                              checked={
                                role.isCompanyAdmin ||
                                (findPermissionEntry(permissions, page.key, null)?.actions.includes(
                                  'VIEW',
                                ) ??
                                  false)
                              }
                              onChange={() => toggleView(role.id, page.key, null)}
                              label={`${role.name} - ${page.label}`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                    {hasTabs &&
                      isExpanded &&
                      page.tabs?.map((tab) => (
                        <tr
                          key={`${page.key}-${tab.key}`}
                          className="border-b border-app-border bg-app-bg-muted/40 last:border-0"
                        >
                          <td className="px-3 py-2 pl-8 text-app-muted">{tab.label}</td>
                          {roles.map((role) => {
                            const permissions = permissionsFor(role.id);
                            return (
                              <td
                                key={role.id}
                                className="border-l border-app-border px-3 py-2 text-center"
                              >
                                <Switch
                                  disabled={!isCompanyAdmin || role.isSystem}
                                  checked={
                                    role.isCompanyAdmin ||
                                    (findPermissionEntry(
                                      permissions,
                                      page.key,
                                      tab.key,
                                    )?.actions.includes('VIEW') ??
                                      false)
                                  }
                                  onChange={() => toggleView(role.id, page.key, tab.key)}
                                  label={`${role.name} - ${page.label} / ${tab.label}`}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
