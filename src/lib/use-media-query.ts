import { useEffect, useState } from 'react';

/** Generic `window.matchMedia` hook: verilen CSS media query string'ini dinler, eslesme
 * durumu degisince (pencere boyutu/yonelim degisimi) yeniden render tetikler. Belirli
 * breakpoint/yonelim hook'lari (orn. use-mobile-portrait.ts) bunun uzerine kurulur. */
export function useMediaQuery(query: string): boolean {
  const [state, setState] = useState(() => ({
    query,
    matches: typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  }));

  // query parametresi degisirse render sirasinda senkron yeniden hesapla - useEffect
  // icinde setState cagirip bir render'i bosa harcamak yerine (chatbot-widget.tsx'teki
  // ayni desen, bkz. react-hooks/set-state-in-effect kurali).
  if (state.query !== query) {
    setState({ query, matches: window.matchMedia(query).matches });
  }

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);

    function handleChange(event: MediaQueryListEvent) {
      setState({ query, matches: event.matches });
    }

    mediaQueryList.addEventListener('change', handleChange);
    return () => mediaQueryList.removeEventListener('change', handleChange);
  }, [query]);

  return state.matches;
}
