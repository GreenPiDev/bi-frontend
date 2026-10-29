import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { handlePointerGlow } from '../../lib/use-pointer-glow';

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
}

/** Imleci izleyen isikli kenarlik/dolgu efektli cam kart (bkz. .landing-spot). */
export function SpotlightCard({ children, className }: SpotlightCardProps) {
  return (
    <div
      onMouseMove={handlePointerGlow}
      className={clsx(
        'landing-spot overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.025] backdrop-blur-sm',
        className,
      )}
    >
      {children}
    </div>
  );
}
