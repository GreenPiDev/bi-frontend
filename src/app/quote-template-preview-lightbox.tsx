import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import type { QuoteTemplateFormValues } from '../features/crm/schemas';
import { tr } from '../i18n/tr';
import {
  buildQuoteTemplatePrintPages,
  type QuoteTemplatePrintDocumentData,
} from './quote-template-print-pages';

interface QuoteTemplateImages {
  logoUrl: string | null;
  coverImageUrl: string | null;
  closingImageUrl: string | null;
}

interface QuoteTemplatePreviewLightboxProps {
  values: QuoteTemplateFormValues;
  images: QuoteTemplateImages;
  onClose: () => void;
}

/** Sayfanin dogal genisligi - A4'un 96dpi karsiligi. Sayfa icerigi (kapak/kapanis
 * sayfalari min-h-screen/h-screen kullandigi icin) tarayici pencere yuksekligine
 * gore degisir; bu yuzden dogal boyut olcup asagidaki useLayoutEffect'te mevcut
 * cerceveye orantili sigdiriyoruz (transform: scale), genislik/yukseklik birlikte
 * kucultuldugu icin metin/gorsel oranlari bozulmuyor. */
const PAGE_WIDTH_PX = 794;

/** "Kaydet/Vazgec" satirindaki "Onizlemeyi Gor" butonunun actigi tam ekran lightbox -
 * henuz kaydedilmemis form alanlariyla (metinler) + zaten yuklenmis gorsellerle (bkz.
 * ImageUploadField'in "seçilince aninda yukler" deseni) ornek/sahte bir teklif
 * dolduruluyor, gercek yazdirma sayfalari (buildQuoteTemplatePrintPages, yazdirma
 * rotasiyla birebir ayni) tek seferde tek sayfa olacak sekilde, sag/sol oklarla
 * gezilerek gosteriliyor. Hicbir backend cagrisi yok - components/ui/Modal'daki
 * kutulu dialog yerine tam ekran koyu overlay kullanildigi icin ayri bir bilesen. */
export function QuoteTemplatePreviewLightbox({
  values,
  images,
  onClose,
}: QuoteTemplatePreviewLightboxProps) {
  const strings = tr.crm.quoteTemplates.form.preview;
  const pages = useMemo(() => {
    const sampleQuote = buildSampleQuote(values, images);
    return buildQuoteTemplatePrintPages(sampleQuote);
  }, [values, images]);

  const [index, setIndex] = useState(0);
  const canGoPrev = index > 0;
  const canGoNext = index < pages.length - 1;

  const frameRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  // Oklari sayfanin (kucultulmus) gercek gorsel kenarina yaslamak icin - sadece
  // `scale`'i degil, kucultulmus sayfanin piksel genislik/yuksekligini de tutuyoruz;
  // bu boyut disaridaki wrapper'a verilip oklar ona gore konumlaniyor (bkz. asagidaki
  // render). `scrollWidth`/`scrollHeight` CSS transform'dan etkilenmedigi icin mevcut
  // scale ne olursa olsun dogal boyutu dogru olcer.
  const [layout, setLayout] = useState({ scale: 1, width: PAGE_WIDTH_PX, height: PAGE_WIDTH_PX });

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const page = pageRef.current;
    if (!frame || !page) return;

    function recalcScale() {
      if (!frame || !page) return;
      const frameRect = frame.getBoundingClientRect();
      const naturalWidth = page.scrollWidth;
      const naturalHeight = page.scrollHeight;
      if (naturalWidth === 0 || naturalHeight === 0) return;
      const scale = Math.min(frameRect.width / naturalWidth, frameRect.height / naturalHeight, 1);
      setLayout({ scale, width: naturalWidth * scale, height: naturalHeight * scale });
    }

    recalcScale();
    const resizeObserver = new ResizeObserver(recalcScale);
    resizeObserver.observe(frame);
    return () => resizeObserver.disconnect();
  }, [index, pages]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') setIndex((current) => Math.max(0, current - 1));
      if (event.key === 'ArrowRight')
        setIndex((current) => Math.min(pages.length - 1, current + 1));
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, pages.length]);

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={strings.modalTitle}
      /* top-16/md:left-16: AppShell'in sabit header'i (h-16) ve sidebar'in kapali
       * hali (w-16) kadar bosluk birakiyor - koyu overlay bu sabit UI parcalarinin
       * uzerine binmiyor. Sidebar hover'da acilip (w-60) overlay'in ustune
       * binmesi sorun degil, z-index'i (z-[90]) zaten daha yuksek (bkz. kullanici
       * bildirimi). */
      className="fixed top-16 right-0 bottom-0 left-0 z-50 flex flex-col bg-black/70 md:left-16"
      onClick={handleBackdropClick}
    >
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <span className="text-sm font-semibold text-white/90">{strings.modalTitle}</span>
        <button
          type="button"
          onClick={onClose}
          className="text-white/80 hover:text-white"
          aria-label={strings.closeLabel}
        >
          <X size={22} />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 pb-4 sm:px-12">
        <div ref={frameRef} className="flex h-full w-full items-center justify-center">
          {/* Bu wrapper'in boyutu (layout.width/height) sayfanin kucultulmus
              gercek gorsel boyutuna esit - oklar buna gore, sayfanin hemen
              disina yaslanacak sekilde konumlaniyor (bkz. kullanici bildirimi). */}
          <div className="relative" style={{ width: layout.width, height: layout.height }}>
            <div
              ref={pageRef}
              className="overflow-hidden rounded-lg bg-white shadow-2xl"
              style={{
                width: PAGE_WIDTH_PX,
                transform: `scale(${layout.scale})`,
                transformOrigin: 'top left',
              }}
            >
              {pages[index]}
            </div>

            <button
              type="button"
              onClick={() => setIndex((current) => Math.max(0, current - 1))}
              disabled={!canGoPrev}
              className="absolute top-1/2 left-0 -translate-x-[calc(100%+0.75rem)] -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 disabled:pointer-events-none disabled:opacity-30"
              aria-label={strings.previousPageLabel}
            >
              <ChevronLeft size={24} />
            </button>

            <button
              type="button"
              onClick={() => setIndex((current) => Math.min(pages.length - 1, current + 1))}
              disabled={!canGoNext}
              className="absolute top-1/2 right-0 translate-x-[calc(100%+0.75rem)] -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 disabled:pointer-events-none disabled:opacity-30"
              aria-label={strings.nextPageLabel}
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      </div>

      <div className="pb-4 text-center text-xs font-semibold text-white/70">
        {index + 1} / {pages.length}
      </div>
    </div>
  );
}

function buildSampleQuote(
  values: QuoteTemplateFormValues,
  images: QuoteTemplateImages,
): QuoteTemplatePrintDocumentData {
  const strings = tr.crm.quoteTemplates.form.preview;

  return {
    quoteNumber: strings.sampleQuoteNumber,
    quoteDate: new Date().toISOString(),
    account: {
      name: strings.sampleAccountName,
      address: strings.sampleAccountAddress,
      district: strings.sampleAccountDistrict,
      city: strings.sampleAccountCity,
    },
    contact: { firstName: strings.sampleContactFirstName, lastName: strings.sampleContactLastName },
    items: [
      {
        id: 'preview-item-1',
        quantity: '2',
        unitPrice: '1500',
        currency: 'TRY',
        discountPct: '0',
        vatPct: '20',
        product: { name: strings.sampleItem1Name },
      },
      {
        id: 'preview-item-2',
        quantity: '5',
        unitPrice: '350',
        currency: 'TRY',
        discountPct: '10',
        vatPct: '20',
        product: { name: strings.sampleItem2Name },
      },
    ],
    salesTerms: strings.sampleSalesTerms,
    deliveryTerms: strings.sampleDeliveryTerms,
    ibanBankName: null,
    ibanAccountHolderName: null,
    ibanAccountNumber: null,
    ibanNumber: null,
    template: {
      logoUrl: images.logoUrl,
      coverImageUrl: images.coverImageUrl,
      closingImageUrl: images.closingImageUrl,
      companyDisplayName: values.companyDisplayName.trim() || strings.sampleCompanyName,
      companyTagline: values.companyTagline?.trim() || null,
      companyPhone: values.companyPhone?.trim() || null,
      companyEmail: values.companyEmail?.trim() || null,
      senderName: values.senderName?.trim() || null,
      senderTitle: values.senderTitle?.trim() || null,
      senderPhone: values.senderPhone?.trim() || null,
      senderEmail: values.senderEmail?.trim() || null,
    },
  };
}
