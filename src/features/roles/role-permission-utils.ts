import type { PermissionAction, RolePermissionInput, RoleView } from '../../lib/api';

export function flattenRolePermissions(role: RoleView): RolePermissionInput[] {
  return Object.values(
    role.permissions.reduce<Record<string, RolePermissionInput>>((acc, p) => {
      const key = `${p.pageKey}::${p.tabKey ?? ''}`;
      acc[key] ??= { pageKey: p.pageKey, tabKey: p.tabKey, actions: [] };
      acc[key].actions.push(p.action);
      return acc;
    }, {}),
  );
}

export function findPermissionEntry(
  value: RolePermissionInput[],
  pageKey: string,
  tabKey: string | null,
): RolePermissionInput | undefined {
  return value.find((p) => p.pageKey === pageKey && (p.tabKey ?? null) === tabKey);
}

export function withPermissionActions(
  value: RolePermissionInput[],
  pageKey: string,
  tabKey: string | null,
  actions: PermissionAction[],
): RolePermissionInput[] {
  const rest = value.filter((p) => !(p.pageKey === pageKey && (p.tabKey ?? null) === tabKey));
  if (actions.length === 0) return rest;
  return [...rest, { pageKey, tabKey, actions }];
}
