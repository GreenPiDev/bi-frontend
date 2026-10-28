import { useEffect, useRef, useState } from 'react';

/** Bir eleman viewport'a girince bir kerelik `true`'ya doner - tanitim sayfasindaki
 * scroll-reveal animasyonlari icin (fade/slide-in). Eleman gorunduktan sonra gozlemi
 * birakir, geri kaydirinca tekrar tetiklenmez. */
export function useScrollReveal<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}
