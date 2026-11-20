import type { CSSProperties } from 'react';
import type { StandardQuotePdfTheme } from '../../lib/api';

/**
 * Standart (sablonsuz) teklif PDF'inin renk temasi - bkz. docs/VARSAYIMLAR.md V89.
 * Varsayilanlar backend'deki DEFAULT_STANDARD_QUOTE_PDF_THEME'in kasitli kopyasi
 * (CLAUDE.md SS3) ve bu ozellik gelmeden once kodda sabit duran renklerle birebir
 * aynidir.
 */
export const DEFAULT_STANDARD_QUOTE_PDF_THEME: StandardQuotePdfTheme = {
  titleColor: '#8bc34a',
  headingColor: '#2196f3',
  textColor: '#16202e',
  accentColor: '#8bc34a',
  tableHeaderBgColor: '#ffffff',
  tableHeaderTextColor: '#2196f3',
  rowOddBgColor: '#ffffff',
  rowEvenBgColor: '#e8f5e9',
  groupRowBgColor: '#e3f2fd',
  footerBgColor: '#e8f5e9',
  footerTextColor: '#16202e',
};

export const STANDARD_QUOTE_TEMPLATE_ID = 'standart';

/**
 * QuoteContentBody'nin (quote-detail-page.tsx) yazdirma gorunumu renkleri bu CSS
 * degiskenlerinden okur (`var(--qp-heading)` vb.) - boylece ayni bilesen hem
 * gercek PDF'te hem duzenleme ekranindaki canli onizlemede temayi alir.
 */
export function standardQuotePdfThemeStyle(
  theme: StandardQuotePdfTheme = DEFAULT_STANDARD_QUOTE_PDF_THEME,
): CSSProperties {
  return {
    '--qp-title': theme.titleColor,
    '--qp-heading': theme.headingColor,
    '--qp-text': theme.textColor,
    '--qp-accent': theme.accentColor,
    '--qp-th-bg': theme.tableHeaderBgColor,
    '--qp-th-text': theme.tableHeaderTextColor,
    '--qp-row-odd': theme.rowOddBgColor,
    '--qp-row-even': theme.rowEvenBgColor,
    '--qp-group-row': theme.groupRowBgColor,
  } as CSSProperties;
}
