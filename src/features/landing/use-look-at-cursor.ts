import { useEffect, type RefObject } from 'react';

const PERSPECTIVE_PX = 1100;
const EASING = 0.08;

const clamp = (value: number) => Math.min(Math.max(value, -1), 1);

/**
 * Elemani, imlec sayfanin neresinde olursa olsun ona dogru 3B dondurur ("imlece bakan" kart).
 * Imlecin elemanin merkezine gore yatay/dikey uzakligi pencere boyutuyla normalize edilir,
 * donus rAF ile yumusakca hedefe yaklasir. Imlec pencereden cikinca duz konuma doner.
 * Dokunmatik cihazlarda ve "hareketi azalt" tercihinde hic calismaz.
 */
export function useLookAtCursor(ref: RefObject<HTMLElement | null>, maxTiltDeg: number) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const canFollow = window.matchMedia(
      '(hover: hover) and (prefers-reduced-motion: no-preference)',
    ).matches;
    if (!canFollow) return;

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let frame = 0;

    function paint() {
      current.x += (target.x - current.x) * EASING;
      current.y += (target.y - current.y) * EASING;
      element!.style.transform = `perspective(${PERSPECTIVE_PX}px) rotateY(${current.x * maxTiltDeg}deg) rotateX(${-current.y * maxTiltDeg}deg)`;
      frame = requestAnimationFrame(paint);
    }

    function handleMove(event: MouseEvent) {
      const rect = element!.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      target.x = clamp((event.clientX - centerX) / (window.innerWidth / 2));
      target.y = clamp((event.clientY - centerY) / (window.innerHeight / 2));
    }

    function handleLeave() {
      target.x = 0;
      target.y = 0;
    }

    window.addEventListener('mousemove', handleMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', handleLeave);
    frame = requestAnimationFrame(paint);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('mousemove', handleMove);
      document.documentElement.removeEventListener('mouseleave', handleLeave);
      element.style.transform = '';
    };
  }, [ref, maxTiltDeg]);
}
