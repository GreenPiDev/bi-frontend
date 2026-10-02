export const CONTACT_INACTIVITY_THRESHOLD_DAYS_KEY = 'crm.contactInactivityThresholdDays';
export const DEFAULT_CONTACT_INACTIVITY_THRESHOLD_DAYS = 180;

export const DEFAULT_QUOTE_VAT_PCT_KEY = 'crm.defaultQuoteVatPct';
export const DEFAULT_QUOTE_VAT_PCT = 20;

/** `/settings?tab=crm#<bu id>` ile dogrudan KDV orani ayarina baglanti verip
 * scroll etmek icin (bkz. quote-form-page.tsx "Varsayılan Değer Ata" linki,
 * crm-settings-section.tsx DefaultQuoteVatPctSetting). */
export const QUOTE_VAT_PCT_SETTING_ANCHOR_ID = 'ayarlar-kdv-orani';

/** Teklif formundaki (`/teklifler/yeni`) dort kosul metni alaninin varsayilan
 * degerleri - `/settings?tab=crm`'deki "Teklif Oluşturma" bölümünden tanımlanır,
 * yeni teklif formuna dolu gelir, kullanıcı üzerinde değişiklik yapabilir. */
export const DEFAULT_QUOTE_PAYMENT_TERMS_KEY = 'crm.defaultQuotePaymentTerms';
export const DEFAULT_QUOTE_SALES_TERMS_KEY = 'crm.defaultQuoteSalesTerms';
export const DEFAULT_QUOTE_DELIVERY_TERMS_KEY = 'crm.defaultQuoteDeliveryTerms';
export const DEFAULT_QUOTE_GENERAL_TERMS_KEY = 'crm.defaultQuoteGeneralTerms';

/** `/settings?tab=crm#<bu id>` ile bu dort kosul metni ayarina baglanti verip
 * scroll etmek icin - KDV orani anchor'uyla ayni desen. */
export const QUOTE_DEFAULT_TERMS_SETTING_ANCHOR_ID = 'ayarlar-teklif-metinleri';
