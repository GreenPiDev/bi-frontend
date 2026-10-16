import { useEffect, useRef, useState } from 'react';

const FLASH_DELAY_MS = 300;

function readHighlightParam(): string | null {
  return new URLSearchParams(window.location.search).get('highlight');
}

function clearHighlightParam() {
  const url = new URL(window.location.href);
  url.searchParams.delete('highlight');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  // react-router'in BrowserRouter'i (`history` paketi) URL degisikliklerini sadece
  // native 'popstate' olayindan ogrenir - duz `replaceState` bunu tetiklemez, bu
  // yuzden router'in kendi arama parametresi state'i (orn. HorizontalTabPanel'in tab
  // degistirirken klonladigi searchParams) senkron kalmaz ve "highlight" bir sonraki
  // tab degisiminde geri gelebilir. Bu hook bilerek react-router'a bagimli degil
  // (CollapsibleSection Router'siz render eden testlerde de kullaniliyor) - senkronu
  // olayi elle tetikleyerek sagliyoruz.
  window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
}

/**
 * Baska bir sayfadaki "X alanini tanimlamak icin ayarlara git" linkiyle
 * (bkz. `SettingsNavigateLink`) `?highlight=<key>` sorgu parametresiyle buraya
 * yonlendirildiginde, bu bolume scroll edip bolumu ACMADAN arka planini bir
 * kere acik mavi yanip-sondurmek icin merkezi mekanizma - `CollapsibleSection`
 * `highlightKey` prop'u uzerinden bunu kullanir, her yeni "...tanimlamak icin
 * ayarlara git" akisi bu deseni tekrar yazmadan paylasir.
 *
 * `key` ile eslesen `?highlight=<key>` bulununca: (1) bolume scroll edilir,
 * (2) kisa bir gecikmeyle (kullanici once sayfanin normal/kapali halini gorsun)
 * flash animasyonu tetiklenir, (3) URL'den `highlight` parametresi silinir ki
 * baska bir tab'a gecilince anlamsiz sekilde yapismis kalmasin.
 */
export function useSectionHighlight(key?: string) {
  const ref = useRef<HTMLDivElement>(null);
  // Ilk render degerine sabitlenir - asagidaki URL temizligi sonrasinda param
  // kaybolsa da flash/scroll davranisi bundan etkilenmemeli.
  const [shouldHighlight] = useState(() => Boolean(key) && readHighlightParam() === key);
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    if (!shouldHighlight) return;
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timer = setTimeout(() => setIsFlashing(true), FLASH_DELAY_MS);
    clearHighlightParam();
    return () => clearTimeout(timer);
  }, [shouldHighlight]);

  return { ref, className: isFlashing ? 'animate-highlight-pulse' : undefined };
}
