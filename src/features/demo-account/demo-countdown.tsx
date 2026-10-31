import { clsx } from 'clsx';
import { Clock } from 'lucide-react';
import { tr } from '../../i18n/tr';
import { formatRemaining } from './use-demo-trial';

const WARNING_THRESHOLD_MS = 60 * 60 * 1000;

/** Header'in ortasinda gosterilen demo hesabi geri sayimi - son 1 saatte kirmiziya doner. */
export function DemoCountdown({ remainingMs }: { remainingMs: number }) {
  const time = formatRemaining(remainingMs);
  const isWarning = remainingMs <= WARNING_THRESHOLD_MS;
  return (
    <div
      role="timer"
      aria-label={tr.demoTrial.remainingAria(time)}
      className={clsx(
        'pointer-events-auto inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold',
        isWarning
          ? 'border-red-200 bg-red-50 text-app-danger'
          : 'border-app-border bg-app-bg-muted text-app-text',
      )}
    >
      <Clock size={16} aria-hidden="true" />
      <span className="hidden sm:inline">{tr.demoTrial.remainingLabel}:</span>
      <span className="tabular-nums">{time}</span>
    </div>
  );
}
