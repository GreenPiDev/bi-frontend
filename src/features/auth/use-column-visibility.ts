import { useMeQuery, useUpdateProfileMutation } from './use-auth';

export interface ColumnVisibilityDef {
  key: string;
  label: string;
  /** Her zaman gorunur - "Gosterilecek kolonlar" seciciside sunulmaz, gizlenemez. */
  required?: boolean;
}

/**
 * Liste sayfalarindaki "Gosterilecek kolonlar" seceneginin backend'e baglanmasi -
 * kullanici bazli (User.columnPreferences JSON, pageKey -> gorunur opsiyonel kolon
 * anahtarlari), mevcut PATCH /users/me + useMeQuery cache'i uzerinden calisir. Tercih
 * hic ayarlanmamissa (kayit yoksa) tum opsiyonel kolonlar varsayilan olarak gorunur.
 */
export function useColumnVisibility(pageKey: string, columns: ColumnVisibilityDef[]) {
  const meQuery = useMeQuery();
  const updateMutation = useUpdateProfileMutation();

  const requiredKeys = columns.filter((c) => c.required).map((c) => c.key);
  const optionalColumns = columns.filter((c) => !c.required);
  const savedKeys = meQuery.data?.columnPreferences?.[pageKey];
  const visibleOptionalKeys = savedKeys ?? optionalColumns.map((c) => c.key);
  const visibleKeySet = new Set([...requiredKeys, ...visibleOptionalKeys]);

  function setVisibleOptionalKeys(nextKeys: string[]) {
    const current = meQuery.data?.columnPreferences ?? {};
    updateMutation.mutate({ columnPreferences: { ...current, [pageKey]: nextKeys } });
  }

  return {
    isColumnVisible: (key: string) => visibleKeySet.has(key),
    visibleOptionalKeys,
    setVisibleOptionalKeys,
    optionalColumns,
  };
}
