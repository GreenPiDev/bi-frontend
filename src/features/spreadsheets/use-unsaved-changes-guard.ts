import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Kaydedilmemis degisiklik varken sayfadan ayrilmayi engeller. Uygulama BrowserRouter
 * kullandigi icin (data router degil) react-router'in useBlocker'i yok - bunun yerine
 * (1) tarayici kapatma/yenileme icin beforeunload, (2) uygulama ici linkler (nav vb.)
 * icin capture asamasinda <a href> tiklamalari yakalanir ve onay istenir.
 */
export function useUnsavedChangesGuard(hasChanges: boolean) {
  const navigate = useNavigate();
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  useEffect(() => {
    if (!hasChanges) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    function onDocumentClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === '_blank') return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const path = `${url.pathname}${url.search}${url.hash}`;
      if (path === `${window.location.pathname}${window.location.search}`) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingPath(path);
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onDocumentClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onDocumentClick, true);
    };
  }, [hasChanges]);

  /** Uygulama ici programatik gecisler (geri butonu vb.) icin. */
  const requestNavigation = useCallback(
    (path: string) => {
      if (hasChanges) setPendingPath(path);
      else navigate(path);
    },
    [hasChanges, navigate],
  );

  return {
    pendingPath,
    requestNavigation,
    confirmNavigation: () => {
      const path = pendingPath;
      setPendingPath(null);
      if (path) navigate(path);
    },
    cancelNavigation: () => setPendingPath(null),
  };
}
