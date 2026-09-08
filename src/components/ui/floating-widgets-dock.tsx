import type { ReactNode } from 'react';

interface FloatingWidgetsDockProps {
  children: ReactNode;
}

/**
 * Sag-alt kosede yan yana duran gezici widget'lar (chatbot, mesajlasma...) icin ortak
 * konumlandirma katmani. Sorumlulugu sadece "children'i saga/asagiya sabitle, soldan
 * sagsa dogal flex akisiyla dizile" - hangi widget'in ne kadar genisleyecegini bilmez.
 * DOM sirasi = gorsel sira: ilk cocuk en solda, son cocuk ekran kenarina en yakin. Bir
 * widget genisleyince (ornegin mesajlasma paneli acilinca) flex akisi soldakileri
 * otomatik iter - elle px hesabi gerekmez.
 */
export function FloatingWidgetsDock({ children }: FloatingWidgetsDockProps) {
  return (
    <div className="fixed right-5 bottom-5 z-[110] flex flex-row items-end gap-3">{children}</div>
  );
}
