import { useEffect, useRef } from 'react';

/** Sayfa uzerindeki ince ilerleme cizgisi + imleci yumusakca izleyen genis isik halesi.
 * Dokunmatik cihazlarda ve "hareketi azalt" tercihinde hale kapali kalir. */
export function AmbientEffects() {
  const progressRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const progress = progressRef.current;
    const glow = glowRef.current;
    if (!progress || !glow) return;

    const canFollow = window.matchMedia(
      '(hover: hover) and (prefers-reduced-motion: no-preference)',
    ).matches;
    const target = { x: window.innerWidth / 2, y: window.innerHeight / 3 };
    const current = { ...target };
    let frame = 0;

    function paint() {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
      progress!.style.transform = `scaleX(${Math.min(Math.max(ratio, 0), 1)})`;

      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;
      glow!.style.transform = `translate3d(${current.x - 200}px, ${current.y - 200}px, 0)`;
      frame = requestAnimationFrame(paint);
    }

    function handleMove(event: MouseEvent) {
      target.x = event.clientX;
      target.y = event.clientY;
    }

    if (canFollow) window.addEventListener('mousemove', handleMove, { passive: true });
    frame = requestAnimationFrame(paint);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('mousemove', handleMove);
    };
  }, []);

  return (
    <>
      <div
        ref={progressRef}
        aria-hidden="true"
        className="fixed top-0 right-0 left-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400"
        style={{ transform: 'scaleX(0)' }}
      />
      <div
        ref={glowRef}
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-0 hidden h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(90,120,255,0.13),transparent_65%)] [@media(hover:hover)]:block"
      />
    </>
  );
}
