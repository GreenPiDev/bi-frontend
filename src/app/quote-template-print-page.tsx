import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import {
  buildQuoteTemplatePrintPages,
  type QuoteTemplatePrintDocumentData,
} from './quote-template-print-pages';
import { getQuotePrintData } from '../lib/api';
import { tr } from '../i18n/tr';

/** Markali PDF sablonunun (bkz. docs/VARSAYIMLAR.md V41) 4 sayfalik yazdirma
 * gorunumu - sadece backend'deki QuotePdfService'in Playwright ile `?print=1`
 * olarak actigi bir rota, normal navigasyonda kullanicinin gorecegi bir ekran degil
 * (AppShell'i bile kullanmiyor, kendi tam sayfa duzeni var). `quote.templateId`
 * bos oldugunda export akisi bu rotaya HIC gelmez (bkz. quote-pdf.service.ts) - bu
 * yuzden `template: null` burada sadece savunma amacli, kullanicinin gorecegi
 * normal bir durum degil. */
export function QuoteTemplatePrintPage() {
  const { id = '' } = useParams();
  const printDataQuery = useQuery({
    queryKey: ['quotes', id, 'print-data'],
    queryFn: () => getQuotePrintData(id),
    enabled: Boolean(id),
  });

  if (printDataQuery.isPending) {
    return <div className="min-h-screen bg-white" />;
  }

  const quote = printDataQuery.data;
  if (!quote || !quote.template) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-sm text-app-muted">
        {tr.common.unexpectedError}
      </div>
    );
  }

  return <QuoteTemplatePrintDocument quote={quote} />;
}

/** Sablonun (kapak + teklif detayi + kosullar + kapanis) 4 sayfalik render'i - hem
 * gercek yazdirma rotasi (yukarida) hem de sablon duzenleme sayfasindaki "Onizlemeyi
 * Gor" lightbox'i (quote-template-preview-lightbox.tsx) tarafindan kullanilir. */
export function QuoteTemplatePrintDocument({ quote }: { quote: QuoteTemplatePrintDocumentData }) {
  return (
    <div className="min-h-screen bg-white text-app-text">{buildQuoteTemplatePrintPages(quote)}</div>
  );
}
