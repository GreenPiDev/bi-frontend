import { Plus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Select } from '../../components/ui/select';
import { SettingsNavigateLink } from '../../components/ui/settings-navigate-link';
import { Tooltip } from '../../components/ui/tooltip';
import { tr } from '../../i18n/tr';
import { useBrandOptionsQuery } from './use-brand-options';

interface BrandSelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  /** Verilirse ve en az 1 marka tanımlıysa, select'in yanında ayarlara gitmeden tek bir
   * yeni marka eklemeye yarayan "+ Yeni Marka" butonu gösterilir. Modal'ın kendisi bu
   * bileşenin dışında (sayfa seviyesinde, dış `<form>`'un dışında) render edilir - aksi
   * halde iç içe `<form>` oluşur ve "Kaydet" native form submit'e düşüp sayfayı yeniler
   * (bkz. kullanıcı bildirimi). */
  onRequestAddNew?: () => void;
  /** Etiketi (ve bos-durum ipucu metnini) gorsel olarak gizler - sutun basligi zaten
   * alan adini tasiyan tablo hucrelerinde (orn. quote-form-page.tsx kalem satirlari)
   * tekrarini onlemek icin opt-in, bkz. TextField/Select'teki ayni desen. */
  hideLabel?: boolean;
  /** "+ Yeni Marka" butonunu metin yerine lacivert zeminli, yesil "+" ikonlu kucuk bir
   * butona cevirir - dar tablo hucrelerinde (quote-form-page.tsx kalem satirlari) yer
   * kazanmak icin opt-in; diger kullanim yerlerinde (urun formu vb.) metinli buton
   * degismez. */
  compactAddButton?: boolean;
}

/** Departman/Ünvan alanlarıyla (`DepartmentSelect`/`TitleSelect`) aynı desen: tenant
 * henüz marka tanımlamadıysa dropdown yerine ayarlara (yeni sekmede) yönlendiren bir
 * mesaj/link gösterilir. Marka oradan eklenince `useBrandOptionsRealtimeSync` bu
 * sorguyu invalidate eder ve dropdown sayfa yenilenmeden otomatik güncellenir. */
export function BrandSelect({
  value,
  onChange,
  error,
  onRequestAddNew,
  hideLabel,
  compactAddButton,
}: BrandSelectProps) {
  const brandOptionsQuery = useBrandOptionsQuery();
  const options = brandOptionsQuery.data ?? [];

  if (brandOptionsQuery.isSuccess && options.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className={hideLabel ? 'sr-only' : 'text-sm font-semibold text-app-muted'}>
          {tr.crm.products.form.brandLabel}
        </span>
        <div className="rounded-lg border border-dashed border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-muted">
          {tr.crm.products.form.brandEmptyMessage}{' '}
          <SettingsNavigateLink tab="crm" highlightKey="brandOptions">
            {tr.crm.products.form.brandEmptyLink}
          </SettingsNavigateLink>
        </div>
      </div>
    );
  }

  return (
    <Select
      label={tr.crm.products.form.brandLabel}
      hideLabel={hideLabel}
      placeholder={tr.crm.products.form.brandPlaceholder}
      hint={hideLabel ? undefined : tr.crm.products.form.brandHintRestricted}
      error={error}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      options={options.map((option) => ({ value: option.label, label: option.label }))}
      trailingAction={
        onRequestAddNew &&
        (compactAddButton ? (
          <Tooltip content={tr.crm.products.form.brandNewButton} className="self-stretch">
            <Button
              type="button"
              variant="navy"
              className="inline-flex shrink-0 items-center justify-center self-stretch px-2.5"
              aria-label={tr.crm.products.form.brandNewButton}
              onClick={onRequestAddNew}
            >
              <Plus size={16} className="text-app-success" />
            </Button>
          </Tooltip>
        ) : (
          <Button type="button" variant="navy" className="shrink-0" onClick={onRequestAddNew}>
            {tr.crm.products.form.brandNewButton}
          </Button>
        ))
      }
    />
  );
}
