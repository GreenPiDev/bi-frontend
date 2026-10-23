import { useMediaQuery } from './use-media-query';

/** Telefon genisliginde (Tailwind `sm` kirilimi altinda) VE dikey konumda mi? Sag-alt
 * gezici widget'lar (chatbot, mesajlasma...) gibi masaustunde sabit genislikte duran
 * ama telefonda ekrani kaplamasi gereken bilesenler bunu kullanir. */
export function useIsMobilePortrait(): boolean {
  return useMediaQuery('(max-width: 640px) and (orientation: portrait)');
}
