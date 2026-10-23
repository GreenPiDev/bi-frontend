import type { ReactNode } from 'react';

interface FloatingWidgetsDockProps {
  children: ReactNode;
}

/**
 * Sag-alt kosede yan yana duran gezici widget'lar (chatbot, mesajlasma...) icin ortak
 * konumlandirma katmani. Sorumlulugu sadece "children'i saga/asagiya sabitle, soldan
 * sagsa dogal flex akisiyla dizile" - hangi widget'in ne kadar genisleyecegini bilmez.
 * DOM sirasi = gorsel sira: ilk cocuk en solda, son cocuk ekran kenarina en yakin.
 * Kapaliyken (sadece ikon/pill) her widget kucuk oldugu icin telefonda da ayni satira
 * sigar; bir widget genisleyince (panel/liste acilinca) o widget kendi icinde telefon
 * dikey konumda `fixed` bir overlay'e donusur (bkz. use-mobile-portrait.ts) - bu
 * dock'un flex akisindan bagimsiz calisir, dock'u elle degistirmeye gerek kalmaz.
 */
export function FloatingWidgetsDock({ children }: FloatingWidgetsDockProps) {
  return (
    <div className="fixed right-3 bottom-3 z-[110] flex flex-row items-end gap-3 sm:right-5 sm:bottom-5">
      {children}
    </div>
  );
}
