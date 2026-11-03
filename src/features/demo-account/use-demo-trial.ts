import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { AuthenticatedUser } from '../../lib/api';
import { useRealtimeEvent } from '../../lib/realtime';
import { AUTH_QUERY_KEY } from '../auth/use-auth';

const TICK_MS = 1000;

export interface DemoTrialState {
  isDemo: boolean;
  /** Kalan sure (ms), demo degilse ya da sure henuz baslamadiysa null. */
  remainingMs: number | null;
  expired: boolean;
}

/** Demo kullanicisinin kalan deneme suresini saniyede bir gunceller. Gercek kisit
 * backend'de (DemoAccessGuard, DEMO_EXPIRED) - bu sadece header sayaci ve "sure doldu"
 * modal'inin ne zaman acilacagi icin. */
export function useDemoTrial(user: AuthenticatedUser | null | undefined): DemoTrialState {
  const expiresAt = user?.isDemoUser && user.demoExpiresAt ? Date.parse(user.demoExpiresAt) : null;
  const [now, setNow] = useState(() => Date.now());
  const queryClient = useQueryClient();

  // Super admin ended/extended this trial: refetch /auth/me so the expired modal (or the
  // countdown) updates without a page refresh.
  useRealtimeEvent<{ userId: string }>('demo-user.updated', ({ userId }) => {
    if (user?.isDemoUser && userId === user.id) {
      void queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
    }
  });

  useEffect(() => {
    if (expiresAt === null) return;
    const interval = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(interval);
  }, [expiresAt]);

  if (!user?.isDemoUser) {
    return { isDemo: false, remainingMs: null, expired: false };
  }
  if (expiresAt === null) {
    return { isDemo: true, remainingMs: null, expired: false };
  }
  const remainingMs = Math.max(expiresAt - now, 0);
  return { isDemo: true, remainingMs, expired: remainingMs === 0 };
}

export function formatRemaining(remainingMs: number): string {
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}
