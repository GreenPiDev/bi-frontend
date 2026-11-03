import { useEffect, useState, useSyncExternalStore } from 'react';
import { hasBackendChanged, subscribeBackendVersion } from './backend-version';

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

async function fetchLatestVersion(): Promise<string | null> {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const body = (await res.json()) as { version?: unknown };
    return typeof body.version === 'string' ? body.version : null;
  } catch {
    return null;
  }
}

/** Yeni frontend veya backend surumu yayinlandiysa true doner (frontend: periyodik + sekmeye donuldugunde kontrol, backend: API yanit header'i). */
export function useAppUpdateAvailable(): boolean {
  const [frontendUpdated, setAvailable] = useState(false);
  const backendUpdated = useSyncExternalStore(subscribeBackendVersion, hasBackendChanged);
  const available = frontendUpdated || backendUpdated;

  useEffect(() => {
    // Yerel gelistirmede (dev server) version.json yok, kontrol anlamsiz.
    if (import.meta.env.DEV || available) return;

    const check = async () => {
      const latest = await fetchLatestVersion();
      if (latest && latest !== __APP_VERSION__) setAvailable(true);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };

    const interval = window.setInterval(() => void check(), CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [available]);

  // Eski chunk'lar silindiginde lazy import patlar: bir kez yenile (sonsuz donguye karsi korumali).
  useEffect(() => {
    const onPreloadError = () => {
      if (sessionStorage.getItem('preload-reloaded') === __APP_VERSION__) return;
      sessionStorage.setItem('preload-reloaded', __APP_VERSION__);
      window.location.reload();
    };
    window.addEventListener('vite:preloadError', onPreloadError);
    return () => window.removeEventListener('vite:preloadError', onPreloadError);
  }, []);

  return available;
}
