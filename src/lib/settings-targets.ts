/**
 * `/settings` sayfasindaki, baska sayfalardan `SettingsNavigateLink` ile
 * baglanti verilen bolumlerin tek kaynagi. Hem link veren taraf (`target=`)
 * hem hedef `CollapsibleSection` (`highlightKey=`) buradan okur; boylece
 * string'lerin elle ayni yazilmasina dayanan sessiz kopukluk (typo) derleme
 * hatasina doner.
 */
export const SETTINGS_TARGETS = {
  sector: { tab: 'crm', highlightKey: 'sectorOptions' },
  department: { tab: 'crm', highlightKey: 'departmentOptions' },
  title: { tab: 'crm', highlightKey: 'titleOptions' },
  productCategory: { tab: 'crm', highlightKey: 'productCategoryOptions' },
  brand: { tab: 'crm', highlightKey: 'brandOptions' },
  unit: { tab: 'crm', highlightKey: 'unitOptions' },
  paymentMethod: { tab: 'crm', highlightKey: 'paymentMethodOptions' },
  quoteRejectionReason: { tab: 'crm', highlightKey: 'quoteRejectionReasonOptions' },
  interactionType: { tab: 'crm', highlightKey: 'interactionTypeOptions' },
  reminderType: { tab: 'crm', highlightKey: 'reminderTypeOptions' },
  iban: { tab: 'crm', highlightKey: 'ibanOptions' },
  defaultQuoteTerms: { tab: 'crm', highlightKey: 'defaultQuoteTerms' },
  companyInfo: { tab: 'crm', highlightKey: 'companyInfo' },
  stockHoldingCost: { tab: 'general', highlightKey: 'stockHoldingCost' },
} as const;

export type SettingsTarget = (typeof SETTINGS_TARGETS)[keyof typeof SETTINGS_TARGETS];
export type SettingsHighlightKey = SettingsTarget['highlightKey'];
