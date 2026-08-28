import type { EffectivePermissionSet, PermissionAction } from '../../lib/api';

/**
 * Backend'deki core/permissions/permission.types.ts::hasPermission ile birebir ayni
 * mantik - frontend kendi Zod/tip kopyasini tutar (bkz. CLAUDE.md SS3, packages/shared yok).
 */
export function hasPermission(
  set: EffectivePermissionSet | undefined,
  pageKey: string,
  action: PermissionAction,
  tabKey?: string,
): boolean {
  if (!set) return false;
  if (set.isCompanyAdmin) return true;
  return set.permissions.some(
    (p) =>
      p.pageKey === pageKey &&
      p.action === action &&
      (tabKey === undefined ? true : p.tabKey === tabKey),
  );
}
