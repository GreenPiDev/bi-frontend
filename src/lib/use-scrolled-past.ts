import { useEffect, useState } from 'react';

/** Sayfa belirtilen piksel miktari kadar asagi kaydirilinca `true` doner - tanitim
 * sayfasindaki seffaf header'in, hero'dan cikildiktan sonra okunabilir bir zemine
 * gecmesi icin kullanilir. */
export function useScrolledPast(thresholdPx: number): boolean {
  const [scrolledPast, setScrolledPast] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolledPast(window.scrollY > thresholdPx);
    }

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [thresholdPx]);

  return scrolledPast;
}
