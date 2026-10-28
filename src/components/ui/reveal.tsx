import { clsx } from 'clsx';
import type { CSSProperties, ReactNode } from 'react';
import { useScrollReveal } from '../../lib/use-scroll-reveal';

type RevealDirection = 'up' | 'left' | 'right' | 'none';

interface RevealProps {
  children: ReactNode;
  /** ms cinsinden, stagger (sirali) animasyon icin. */
  delay?: number;
  direction?: RevealDirection;
  className?: string;
}

const HIDDEN_TRANSFORM: Record<RevealDirection, string> = {
  up: 'translate-y-6',
  left: '-translate-x-6',
  right: 'translate-x-6',
  none: 'translate-y-0',
};

/** Viewport'a girince fade+slide ile beliren genel sarmalayici - tanitim sayfasindaki
 * scroll-reveal animasyonlarinin tek noktadan uygulanmasi icindir (bkz. use-scroll-reveal). */
export function Reveal({ children, delay = 0, direction = 'up', className }: RevealProps) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();
  const style: CSSProperties = { transitionDelay: `${delay}ms` };

  return (
    <div
      ref={ref}
      style={style}
      className={clsx(
        'transition-all duration-700 ease-out',
        isVisible
          ? 'translate-x-0 translate-y-0 opacity-100'
          : `opacity-0 ${HIDDEN_TRANSFORM[direction]}`,
        className,
      )}
    >
      {children}
    </div>
  );
}
