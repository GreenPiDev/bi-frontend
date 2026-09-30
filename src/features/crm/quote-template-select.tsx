import { Select } from '../../components/ui/select';
import { tr } from '../../i18n/tr';
import { useQuoteTemplatesQuery } from './use-quote-templates';

interface QuoteTemplateSelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

/** Ad-hoc: PDF sablonu secici (bkz. docs/VARSAYIMLAR.md V41) - IbanSelect ile ayni
 * desen, kendi listesini kendisi ceker. "Sablonsuz" secenegi her zaman ilk sirada,
 * value="" ona karsilik gelir (backend'de templateId: null). */
export function QuoteTemplateSelect({ value, onChange, error }: QuoteTemplateSelectProps) {
  const templatesQuery = useQuoteTemplatesQuery({ pageSize: 100 });
  const options = [
    { value: '', label: tr.crm.quotes.form.templateNoneOption },
    ...(templatesQuery.data?.data ?? []).map((template) => ({
      value: template.id,
      label: template.name,
    })),
  ];

  return (
    <Select
      label={tr.crm.quotes.form.templateLabel}
      hint={tr.crm.quotes.form.templateHint}
      error={error}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      options={options}
    />
  );
}
