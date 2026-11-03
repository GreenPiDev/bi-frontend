import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { tr } from '@/i18n/tr';
import { useAppUpdateAvailable } from './use-app-update';

export function AppUpdateBanner() {
  const available = useAppUpdateAvailable();
  const [dismissed, setDismissed] = useState(false);

  if (!available || dismissed) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-3 rounded-xl bg-[#1e2a4a] px-4 py-3 text-sm text-white shadow-lg"
    >
      <span>{tr.appUpdate.message}</span>
      <Button onClick={() => window.location.reload()} className="px-3 py-1.5">
        {tr.appUpdate.reload}
      </Button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="cursor-pointer text-white/70 hover:text-white"
      >
        {tr.appUpdate.dismiss}
      </button>
    </div>
  );
}
