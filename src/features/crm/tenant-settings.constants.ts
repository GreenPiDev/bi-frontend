export const CONTACT_INACTIVITY_THRESHOLD_DAYS_KEY = 'crm.contactInactivityThresholdDays';
export const DEFAULT_CONTACT_INACTIVITY_THRESHOLD_DAYS = 180;

export const DEFAULT_QUOTE_VAT_PCT_KEY = 'crm.defaultQuoteVatPct';
export const DEFAULT_QUOTE_VAT_PCT = 20;

/** `/settings?tab=crm#<bu id>` ile dogrudan KDV orani ayarina baglanti verip
 * scroll etmek icin (bkz. quote-form-page.tsx "Varsayılan Değer Ata" linki,
 * crm-settings-section.tsx DefaultQuoteVatPctSetting). */
export const QUOTE_VAT_PCT_SETTING_ANCHOR_ID = 'ayarlar-kdv-orani';
