import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ColumnVisibilityPicker } from '../components/ui/column-visibility-picker';
import { FormError } from '../components/ui/form-error';
import { IconActionButton } from '../components/ui/icon-action-button';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { Select } from '../components/ui/select';
import { SettingsNavigateLink } from '../components/ui/settings-navigate-link';
import { Switch } from '../components/ui/switch';
import { TextareaField } from '../components/ui/textarea-field';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import { AccountAutocomplete } from '../features/crm/account-autocomplete';
import { AddIbanOptionModal } from '../features/crm/add-iban-option-modal';
import { AddOptionModal } from '../features/crm/add-option-modal';
import { BrandSelect } from '../features/crm/brand-select';
import {
  decodeIbanSelections,
  encodeIbanGroupSelection,
  encodeIbanOptionSelection,
} from '../features/crm/iban-selection';
import { useIbanOptionGroupsQuery } from '../features/crm/use-iban-option-groups';
import { NewAccountModal } from '../features/crm/new-account-modal';
import { NewProductModal } from '../features/crm/new-product-modal';
import { QuoteNewContactModal } from '../features/crm/quote-new-contact-modal';
import { useAccountQuery } from '../features/crm/use-accounts';
import { useColumnVisibility } from '../features/auth/use-column-visibility';
import { useMeQuery } from '../features/auth/use-auth';
import {
  QuoteExchangeRatesSection,
  type QuoteExchangeRatesValue,
} from '../features/crm/quote-exchange-rates';
import { QUOTE_CURRENCY_OPTIONS, QuoteMetaFields } from '../features/crm/quote-meta-fields';
import { useContactsQuery } from '../features/crm/use-contacts';
import { useCreateBrandOptionMutation } from '../features/crm/use-brand-options';
import { useCreatePaymentMethodOptionMutation } from '../features/crm/use-payment-method-options';
import { useProductListsQuery } from '../features/crm/use-product-lists';
import { useProductAttributeKeysQuery, useProductsQuery } from '../features/crm/use-products';
import {
  useCreateQuoteMutation,
  useQuoteAssignableUsersQuery,
  useQuoteRevisionSummaryQuery,
} from '../features/crm/use-quotes';
import { useTenantSettingsQuery } from '../features/crm/use-tenant-settings';
import {
  DEFAULT_QUOTE_DELIVERY_TERMS_KEY,
  DEFAULT_QUOTE_GENERAL_TERMS_KEY,
  DEFAULT_QUOTE_PAYMENT_TERMS_KEY,
  DEFAULT_QUOTE_SALES_TERMS_KEY,
  DEFAULT_QUOTE_VAT_PCT,
  DEFAULT_QUOTE_VAT_PCT_KEY,
  QUOTE_VAT_PCT_SETTING_ANCHOR_ID,
} from '../features/crm/tenant-settings.constants';
import { quoteFormSchema, type QuoteFormValues } from '../features/crm/schemas';
import {
  ApiError,
  convertCurrencyAmount,
  type Account,
  type Contact,
  type CreateQuoteInput,
  type OpportunityStage,
  type Product,
} from '../lib/api';
import { useDebouncedValue } from '../lib/use-debounced-value';
import { computeLineTotal, formatCurrencyAmount, groupQuoteItemTotals } from '../lib/quote-totals';
import { tr } from '../i18n/tr';

const STAGE_OPTIONS: { value: OpportunityStage; label: string }[] = (
  ['NEW', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'] as const
).map((stage) => ({ value: stage, label: tr.crm.opportunities.stageOptions[stage] }));

const plainNumber = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const PICKER_PAGE_SIZE = 10;

/** Sayısal metin alanları icin: type="number" spinner oklarini kaldirmak amaciyla
 * type="text" kullanilir, bu yuzden rakam/nokta disindaki karakterler onChange'de
 * filtrelenir. */
function sanitizeDecimalInput(value: string): string {
  return value.replace(/[^0-9.]/g, '');
}

/** KDV alanının altında, tenant'ın varsayılan KDV oranı ayarına (yeni sekmede,
 * ilgili bölüme kaydırarak) götüren kısa bağlantı. */
function VatPctDefaultLink() {
  return (
    <p className="text-xs text-app-muted">
      <Link
        to={`/settings?tab=crm#${QUOTE_VAT_PCT_SETTING_ANCHOR_ID}`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-app-brand hover:underline"
      >
        {tr.crm.quotes.form.vatPctSetDefaultLink}
      </Link>
    </p>
  );
}

/** Koşul metni alanlarının altında, tenant'ın varsayılan koşul metinleri ayarına
 * (yeni sekmede, ilgili bölüme scroll+flash ile) götüren kısa bağlantı - bkz.
 * `SettingsNavigateLink` / `CollapsibleSection`in `highlightKey` prop'u. */
function TermsDefaultLink() {
  return (
    <p className="text-xs text-app-muted">
      <SettingsNavigateLink tab="crm" highlightKey="defaultQuoteTerms">
        {tr.crm.quotes.form.termsSetDefaultLink}
      </SettingsNavigateLink>
    </p>
  );
}

function todayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function QuoteFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillAccountId = searchParams.get('accountId') ?? undefined;
  const toast = useToast();
  const contactsQuery = useContactsQuery();
  const meQuery = useMeQuery();
  const assignableUsersQuery = useQuoteAssignableUsersQuery();
  const productListsQuery = useProductListsQuery();
  const tenantSettingsQuery = useTenantSettingsQuery();
  const defaultVatPctSetting = tenantSettingsQuery.data?.find(
    (setting) => setting.key === DEFAULT_QUOTE_VAT_PCT_KEY,
  );
  const defaultVatPct = String(defaultVatPctSetting?.value ?? DEFAULT_QUOTE_VAT_PCT);
  const createMutation = useCreateQuoteMutation();
  const createPaymentMethodOptionMutation = useCreatePaymentMethodOptionMutation();
  const createBrandOptionMutation = useCreateBrandOptionMutation();
  // Odeme Yontemi/IBAN icin "+ Yeni ..." modallari, urun formundaki
  // Birim/Kategori/Marka desenindeki gibi bilincli olarak <form>'un DISINDA render
  // edilir - Select'lerin kendi icinde render edilselerdi modal'in <form>'u disardaki
  // teklif formunun <form>'una ic ice girer, "Kaydet" native submit'e dusup sayfayi
  // yeniler ve eklenen deger hic kaydedilmez (bkz. product-form-page.tsx).
  const [activeOptionModal, setActiveOptionModal] = useState<
    'paymentMethod' | 'iban' | 'brandEntry' | 'brandEdit' | null
  >(null);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false);
  const [isNewContactModalOpen, setIsNewContactModalOpen] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, dirtyFields },
  } = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      accountId: prefillAccountId,
      quoteDate: todayDateString(),
      items: [],
      hasOpportunity: false,
      quoteCurrency: 'TRY',
    },
  });
  const { fields, append, remove, update } = useFieldArray({ control, name: 'items' });
  const hasOpportunity = watch('hasOpportunity');
  const selectedAccountId = watch('accountId');
  const selectedProductListId = watch('productListId');
  const watchedItems = watch('items');
  const quoteCurrency = watch('quoteCurrency') || 'TRY';
  const [exchangeRates, setExchangeRates] = useState<QuoteExchangeRatesValue>({ rates: {} });
  // Kur input'lari currency koduyla anahtarlanir (hangi quoteCurrency'ye gore
  // hesaplandigi tutulmaz) - para birimi degisince eski degerler yanlis referansa
  // gore kalir, sifirlanip yeniden cekilmeli.
  useEffect(() => {
    setExchangeRates({ rates: {} });
  }, [quoteCurrency]);
  const revisionSummaryQuery = useQuoteRevisionSummaryQuery(selectedAccountId);
  // "+ Yeni Kişi" modalında "X şirketine eklenecek" notu için - AccountAutocomplete
  // sadece id tutar, ismi göstermek için ayrıca çekilir (interaction-form-page.tsx'teki
  // prefillAccountQuery ile aynı desen).
  const selectedAccountQuery = useAccountQuery(selectedAccountId ?? '');

  // Gonderen varsayilan olarak istegi yapan kullanici (bkz. docs/VARSAYIMLAR.md) -
  // kullanici elle degistirirse (dirty) bir sonraki /auth/me yanitiyla ezilmez.
  useEffect(() => {
    if (meQuery.data && !dirtyFields.senderId) {
      setValue('senderId', meQuery.data.id);
    }
  }, [meQuery.data, dirtyFields.senderId, setValue]);

  // Varsayilan hesap grubu (bkz. IbanOptionGroup.isDefault) teklif IBAN
  // secimine onceden secili gelir - kullanici elle degistirirse (dirty) bir
  // sonraki fetch ile ezilmez, senderId ile ayni desen.
  const ibanOptionGroupsQuery = useIbanOptionGroupsQuery();
  useEffect(() => {
    const defaultGroup = ibanOptionGroupsQuery.data?.find((group) => group.isDefault);
    if (defaultGroup && !dirtyFields.ibanSelections) {
      setValue('ibanSelections', [encodeIbanGroupSelection(defaultGroup.id)]);
    }
  }, [ibanOptionGroupsQuery.data, dirtyFields.ibanSelections, setValue]);

  // Kosul metni alanlari (odeme/satis/teslimat/genel hukumler), ayarlardaki varsayilan
  // degerlerle doldurulur. tenantSettingsQuery baska bir sekmede ayar kaydedilince
  // realtime ile yeniden fetch olur (bkz. useTenantSettingsRealtimeSync) ve bu ekran da
  // guncellenir - ama kullanicinin zaten elle degistirdigi (dirty) alanlar ezilmez.
  useEffect(() => {
    if (!tenantSettingsQuery.data) return;
    const findSetting = (key: string) =>
      tenantSettingsQuery.data?.find((setting) => setting.key === key)?.value;
    const paymentTerms = findSetting(DEFAULT_QUOTE_PAYMENT_TERMS_KEY);
    const salesTerms = findSetting(DEFAULT_QUOTE_SALES_TERMS_KEY);
    const deliveryTerms = findSetting(DEFAULT_QUOTE_DELIVERY_TERMS_KEY);
    const generalTerms = findSetting(DEFAULT_QUOTE_GENERAL_TERMS_KEY);
    if (paymentTerms && !dirtyFields.paymentTerms) setValue('paymentTerms', String(paymentTerms));
    if (salesTerms && !dirtyFields.salesTerms) setValue('salesTerms', String(salesTerms));
    if (deliveryTerms && !dirtyFields.deliveryTerms)
      setValue('deliveryTerms', String(deliveryTerms));
    if (generalTerms && !dirtyFields.generalTerms) setValue('generalTerms', String(generalTerms));
  }, [
    tenantSettingsQuery.data,
    setValue,
    dirtyFields.paymentTerms,
    dirtyFields.salesTerms,
    dirtyFields.deliveryTerms,
    dirtyFields.generalTerms,
  ]);

  // Ürün seçici: soldan arama + sayfalama ile backend'den paginated çekilir, tüm liste
  // frontende çekilip filtrelenmez. Seçilen ürün listesine göre filtrelenir.
  const [pickerPage, setPickerPage] = useState(1);
  const [pickerQuery, setPickerQuery] = useState('');
  const debouncedPickerQuery = useDebouncedValue(pickerQuery.trim());
  const productsQuery = useProductsQuery(
    {
      page: pickerPage,
      pageSize: PICKER_PAGE_SIZE,
      q: debouncedPickerQuery || undefined,
      productListId: selectedProductListId || undefined,
    },
    { enabled: Boolean(selectedProductListId) },
  );
  const pickerProducts = productsQuery.data?.data ?? [];
  const pickerAttributeKeysQuery = useProductAttributeKeysQuery();

  // Sağdaki özet, arama/sayfalama boyunca görünürden çıkan ürünleri de doğru
  // gösterebilsin diye görülen her ürün burada biriktirilir (id -> Product).
  const [productCatalog, setProductCatalog] = useState<Record<string, Product>>({});
  useEffect(() => {
    const data = productsQuery.data?.data;
    if (!data || data.length === 0) return;
    setProductCatalog((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const product of data) {
        if (next[product.id] !== product) {
          next[product.id] = product;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [productsQuery.data]);
  const productNameById = new Map(
    Object.values(productCatalog).map((product) => [product.id, product.name]),
  );
  const productPriceById = new Map(
    Object.values(productCatalog)
      .filter((product) => product.price !== null)
      .map((product) => [product.id, Number(product.price)]),
  );
  const productCurrencyById = new Map(
    Object.values(productCatalog).map((product) => [product.id, product.currency]),
  );

  // Ürün satırına tıklayınca altında açılan miktar/iskonto/KDV giriş paneli.
  const [entryProductId, setEntryProductId] = useState<string | null>(null);
  const [entryQuantity, setEntryQuantity] = useState('1');
  const [entryUnitPrice, setEntryUnitPrice] = useState('');
  const [entryCurrency, setEntryCurrency] = useState('TRY');
  const [entryDiscountPct, setEntryDiscountPct] = useState('0');
  const [entryVatPct, setEntryVatPct] = useState(defaultVatPct);
  const [entryBrand, setEntryBrand] = useState('');

  function handleToggleEntry(product: Product) {
    if (entryProductId === product.id) {
      setEntryProductId(null);
      return;
    }
    setEntryProductId(product.id);
    setEntryQuantity('1');
    setEntryUnitPrice(product.price ?? '');
    setEntryCurrency(product.currency);
    setEntryDiscountPct('0');
    setEntryVatPct(defaultVatPct);
    setEntryBrand(product.brand ?? '');
  }

  // Satır para birimi değiştirilince, girilmiş birim fiyat anlık kurla yeni para
  // birimine çevrilir (otomatik ön doldurma - kullanıcı isterse elle düzeltebilir,
  // bkz. convertCurrencyAmount).
  async function handleEntryCurrencyChange(newCurrency: string) {
    const oldCurrency = entryCurrency;
    setEntryCurrency(newCurrency);
    const amount = Number(entryUnitPrice);
    if (oldCurrency === newCurrency || !entryUnitPrice || Number.isNaN(amount) || amount <= 0) {
      return;
    }
    const converted = await convertCurrencyAmount(amount, oldCurrency, newCurrency);
    if (converted !== null) {
      setEntryUnitPrice(converted.toFixed(2));
    }
  }

  function handleAddEntry(product: Product) {
    const quantity = Number(entryQuantity);
    if (!entryQuantity || Number.isNaN(quantity) || quantity <= 0) {
      toast.error(tr.crm.quotes.form.itemInvalidQuantity);
      return;
    }
    if (!entryUnitPrice && !product.price) {
      toast.error(tr.crm.quotes.form.itemInvalidUnitPrice);
      return;
    }
    append({
      productId: product.id,
      quantity: entryQuantity,
      unitPrice: entryUnitPrice,
      currency: entryCurrency,
      discountPct: entryDiscountPct || '0',
      vatPct: entryVatPct || '0',
      brand: entryBrand,
    });
    setEntryProductId(null);
    toast.success(tr.crm.quotes.form.itemAddSuccess);
  }

  // Satırdaki ok ikonuna basınca, detay panelini açmadan ürünü varsayılan miktar/fiyat/KDV
  // ile doğrudan teklife ekler (handleToggleEntry + handleAddEntry'nin kısayolu).
  function handleQuickAdd(product: Product) {
    if (!product.price) {
      toast.error(tr.crm.quotes.form.itemInvalidUnitPrice);
      return;
    }
    append({
      productId: product.id,
      quantity: '1',
      unitPrice: product.price,
      currency: product.currency,
      discountPct: '0',
      vatPct: defaultVatPct,
      brand: product.brand ?? '',
    });
    if (entryProductId === product.id) setEntryProductId(null);
    toast.success(tr.crm.quotes.form.itemAddSuccess);
  }

  // "+ Yeni Ürün" ile sistemde hiç kayıtlı olmayan bir ürün oluşturulunca, hem seçtiği
  // ürün listesine kalıcı olarak eklenir (NewProductModal içinde) hem de bu teklife
  // varsayılan miktar/fiyatla doğrudan satır olarak eklenir - ayrıca "Teklife Ekle"
  // panelinin açılmasına gerek yok.
  function handleProductCreated(product: Product) {
    setProductCatalog((prev) => ({ ...prev, [product.id]: product }));
    append({
      productId: product.id,
      quantity: '1',
      unitPrice: product.price ?? '',
      currency: product.currency,
      discountPct: '0',
      vatPct: defaultVatPct,
      brand: product.brand ?? '',
    });
    setIsNewProductModalOpen(false);
  }

  // "+ Yeni Firma" ile sistemde hiç kayıtlı olmayan bir firma oluşturulunca, doğrudan
  // bu teklifin firma alanına seçili olarak atanır (NewProductModal'daki
  // handleProductCreated ile aynı desen).
  function handleAccountCreated(account: Account) {
    setValue('accountId', account.id, { shouldValidate: true });
    setIsNewAccountModalOpen(false);
  }

  // "+ Yeni Kişi" ile seçili firmaya bağlı yeni bir kişi oluşturulunca, doğrudan bu
  // teklifin muhatap kişi alanına seçili olarak atanır - handleAccountCreated ile
  // aynı desen.
  function handleContactCreated(contact: Contact) {
    setValue('contactId', contact.id, { shouldValidate: true });
    setIsNewContactModalOpen(false);
  }

  // Teklif özeti tablosundaki mevcut satırlara tıklayınca açılan düzenleme paneli -
  // ürün ekleme panelindeki aynı miktar/fiyat/iskonto/KDV deseni (bkz. quote-edit-page.tsx).
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editQuantity, setEditQuantity] = useState('1');
  const [editUnitPrice, setEditUnitPrice] = useState('');
  const [editCurrency, setEditCurrency] = useState('TRY');
  const [editDiscountPct, setEditDiscountPct] = useState('0');
  const [editVatPct, setEditVatPct] = useState('0');
  const [editBrand, setEditBrand] = useState('');

  function handleToggleEditRow(index: number) {
    if (editingIndex === index) {
      setEditingIndex(null);
      return;
    }
    const item = watchedItems?.[index];
    if (!item) return;
    setEditingIndex(index);
    setEditQuantity(item.quantity);
    setEditUnitPrice(item.unitPrice ?? '');
    setEditCurrency(item.currency ?? productCurrencyById.get(item.productId) ?? 'TRY');
    setEditDiscountPct(item.discountPct ?? '0');
    setEditVatPct(item.vatPct ?? '0');
    setEditBrand(item.brand ?? '');
  }

  // handleEntryCurrencyChange ile ayni desen (bkz. convertCurrencyAmount).
  async function handleEditCurrencyChange(newCurrency: string) {
    const oldCurrency = editCurrency;
    setEditCurrency(newCurrency);
    const amount = Number(editUnitPrice);
    if (oldCurrency === newCurrency || !editUnitPrice || Number.isNaN(amount) || amount <= 0) {
      return;
    }
    const converted = await convertCurrencyAmount(amount, oldCurrency, newCurrency);
    if (converted !== null) {
      setEditUnitPrice(converted.toFixed(2));
    }
  }

  function handleSaveEditRow(index: number) {
    const item = watchedItems?.[index];
    if (!item) return;
    const quantity = Number(editQuantity);
    if (!editQuantity || Number.isNaN(quantity) || quantity <= 0) {
      toast.error(tr.crm.quotes.form.itemInvalidQuantity);
      return;
    }
    if (!editUnitPrice && !productPriceById.get(item.productId)) {
      toast.error(tr.crm.quotes.form.itemInvalidUnitPrice);
      return;
    }
    update(index, {
      productId: item.productId,
      quantity: editQuantity,
      unitPrice: editUnitPrice,
      currency: editCurrency,
      discountPct: editDiscountPct || '0',
      vatPct: editVatPct || '0',
      brand: editBrand,
    });
    setEditingIndex(null);
    toast.success(tr.crm.quotes.form.itemUpdateSuccess);
  }

  const contactOptions = (contactsQuery.data?.data ?? [])
    .filter((contact) => !selectedAccountId || contact.accountId === selectedAccountId)
    .map((contact) => ({
      value: contact.id,
      label: `${contact.firstName} ${contact.lastName}`,
    }));

  const senderOptions = (assignableUsersQuery.data ?? []).map((user) => ({
    value: user.id,
    label: user.name,
  }));

  const summaryRows = (watchedItems ?? []).map((item, index) => {
    const quantity = Number(item.quantity) || 0;
    const manualPrice = item.unitPrice ? Number(item.unitPrice) : undefined;
    const productPrice = productPriceById.get(item.productId);
    const unitPrice = manualPrice ?? productPrice ?? 0;
    const isDefaultPrice = manualPrice === undefined && productPrice !== undefined;
    const discountPct = Number(item.discountPct) || 0;
    const vatPct = Number(item.vatPct) || 0;
    const currency = item.currency || productCurrencyById.get(item.productId) || 'TRY';
    const { lineSubtotal, lineTotal } = computeLineTotal({
      quantity,
      unitPrice,
      discountPct,
      vatPct,
    });
    return {
      index,
      productName: productNameById.get(item.productId),
      quantity,
      unitPrice,
      currency,
      isDefaultPrice,
      discountPct,
      vatPct,
      lineSubtotal,
      lineTotal,
    };
  });
  type SummaryRow = (typeof summaryRows)[number];
  const summaryTotalsByCurrency = groupQuoteItemTotals(summaryRows);

  const onSubmit = handleSubmit((values) => {
    const input: CreateQuoteInput = {
      accountId: values.accountId,
      contactId: values.contactId || undefined,
      senderId: values.senderId,
      items: values.items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        unitPrice: item.unitPrice ? Number(item.unitPrice) : undefined,
        currency: item.currency || undefined,
        discountPct: item.discountPct ? Number(item.discountPct) : 0,
        vatPct: item.vatPct ? Number(item.vatPct) : 0,
        brand: item.brand ?? undefined,
      })),
      ...(values.hasOpportunity && values.opportunityName
        ? {
            opportunity: {
              name: values.opportunityName,
              stage: values.opportunityStage,
              estimatedValue: values.opportunityValue ? Number(values.opportunityValue) : undefined,
            },
          }
        : {}),
      quoteDate: new Date(values.quoteDate).toISOString(),
      leadTime: values.leadTime || undefined,
      validityPeriod: values.validityPeriod || undefined,
      paymentMethod: values.paymentMethod || undefined,
      title: values.title || undefined,
      paymentTerms: values.paymentTerms || undefined,
      salesTerms: values.salesTerms || undefined,
      deliveryTerms: values.deliveryTerms || undefined,
      generalTerms: values.generalTerms || undefined,
      ...decodeIbanSelections(values.ibanSelections ?? []),
      quoteCurrency: values.quoteCurrency,
      // Bos birakilirsa backend tenant'in varsayilan sablonunu otomatik atar
      // (bkz. QuotesService.resolveTemplateId) - bu yuzden burada undefined.
      templateId: values.templateId || undefined,
      exchangeRates:
        Object.keys(exchangeRates.rates).length > 0
          ? {
              asOf: exchangeRates.asOf,
              rates: Object.fromEntries(
                Object.entries(exchangeRates.rates)
                  .filter(([, rate]) => rate)
                  .map(([currency, rate]) => [currency, Number(rate)]),
              ),
            }
          : undefined,
    };

    createMutation.mutate(input, {
      onSuccess: (quote) => {
        toast.success(tr.crm.quotes.form.createSuccess);
        navigate(`/teklifler/${quote.id}`);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  });

  const apiErrorMessage =
    createMutation.error instanceof ApiError ? createMutation.error.message : undefined;

  const pickerAttributeKeys = [...(pickerAttributeKeysQuery.data ?? [])].sort();
  const pickerAttributeColumns: TableColumn<Product>[] = pickerAttributeKeys.map((key) => ({
    key: `attr:${key}`,
    header: key,
    className: 'text-app-muted',
    render: (product) => product.attributes?.[key] ?? '—',
  }));

  const ALL_PICKER_COLUMNS: TableColumn<Product>[] = [
    {
      key: 'product',
      header: tr.crm.quotes.form.pickerProductColumn,
      required: true,
      render: (product) => product.name,
    },
    {
      key: 'sku',
      header: tr.crm.products.skuColumn,
      className: 'text-app-muted',
      render: (product) => product.sku ?? '—',
    },
    {
      key: 'unit',
      header: tr.crm.quotes.form.pickerUnitColumn,
      className: 'text-app-muted',
      render: (product) => product.unit,
    },
    {
      key: 'category',
      header: tr.crm.products.categoryColumn,
      className: 'text-app-muted',
      render: (product) => product.category ?? '—',
    },
    {
      key: 'brand',
      header: tr.crm.products.brandColumn,
      className: 'text-app-muted',
      render: (product) => product.brand ?? '—',
    },
    {
      key: 'maxDiscountPct',
      header: tr.crm.products.maxDiscountColumn,
      className: 'text-app-muted',
      render: (product) => (product.maxDiscountPct ? `%${product.maxDiscountPct}` : '—'),
    },
    {
      key: 'price',
      header: tr.crm.quotes.form.pickerPriceColumn,
      className: 'text-app-muted',
      render: (product) =>
        product.price !== null
          ? `${plainNumber.format(Number(product.price))} ${product.currency}`
          : '—',
    },
    {
      key: 'avgCost',
      header: tr.crm.products.avgCostColumn,
      className: 'text-app-muted',
      render: (product) => (product.avgCost != null ? product.avgCost : '—'),
    },
    {
      key: 'minStockLevel',
      header: tr.crm.products.minStockLevelColumn,
      className: 'text-app-muted',
      render: (product) => (product.minStockLevel != null ? product.minStockLevel : '—'),
    },
    {
      key: 'description',
      header: tr.crm.products.descriptionColumn,
      className: 'text-app-muted',
      render: (product) => product.description ?? '—',
    },
    ...pickerAttributeColumns,
    {
      key: 'quickAdd',
      header: '',
      required: true,
      className: 'w-8',
      render: (product) => (
        <IconActionButton
          icon={ArrowRight}
          tooltip={tr.crm.quotes.form.quickAddTooltip}
          onClick={() => handleQuickAdd(product)}
        />
      ),
    },
  ];

  const {
    isColumnVisible: isPickerColumnVisible,
    optionalColumns: optionalPickerColumns,
    visibleOptionalKeys: visiblePickerKeys,
    setVisibleOptionalKeys: setVisiblePickerKeys,
  } = useColumnVisibility(
    'quote-product-picker',
    ALL_PICKER_COLUMNS.map((c) => ({ key: c.key, label: c.header, required: c.required })),
    ['price'],
  );
  const pickerColumns = ALL_PICKER_COLUMNS.filter((c) => isPickerColumnVisible(c.key));

  function renderEntryPanel(product: Product) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:items-start lg:grid-cols-7">
        <TextField
          type="text"
          inputMode="decimal"
          label={tr.crm.quotes.form.quantityLabel}
          value={entryQuantity}
          onChange={(event) => setEntryQuantity(sanitizeDecimalInput(event.target.value))}
        />
        <TextField
          type="text"
          inputMode="decimal"
          label={tr.crm.quotes.form.unitPriceLabel(entryCurrency)}
          value={entryUnitPrice}
          onChange={(event) => setEntryUnitPrice(sanitizeDecimalInput(event.target.value))}
        />
        <div>
          <Select
            label={tr.crm.quotes.form.currencyLabel}
            options={QUOTE_CURRENCY_OPTIONS}
            value={entryCurrency}
            onChange={(event) => void handleEntryCurrencyChange(event.target.value)}
          />
          <p className="mt-1.5 text-xs text-app-muted">{tr.crm.quotes.form.currencyHint}</p>
        </div>
        <TextField
          type="text"
          inputMode="decimal"
          label={tr.crm.quotes.form.discountPctLabel}
          value={entryDiscountPct}
          onChange={(event) => setEntryDiscountPct(sanitizeDecimalInput(event.target.value))}
        />
        <div>
          <TextField
            type="text"
            inputMode="decimal"
            label={tr.crm.quotes.form.vatPctLabel}
            value={entryVatPct}
            onChange={(event) => setEntryVatPct(sanitizeDecimalInput(event.target.value))}
          />
          <VatPctDefaultLink />
        </div>
        <BrandSelect
          value={entryBrand}
          onChange={setEntryBrand}
          onRequestAddNew={() => setActiveOptionModal('brandEntry')}
        />
        <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-4 lg:col-span-1">
          <span aria-hidden="true" className="text-sm font-semibold text-transparent select-none">
            &nbsp;
          </span>
          <Button type="button" className="w-full" onClick={() => handleAddEntry(product)}>
            {tr.crm.quotes.form.addToQuote}
          </Button>
        </div>
      </div>
    );
  }

  const summaryColumns: TableColumn<SummaryRow>[] = [
    {
      key: 'product',
      header: tr.crm.quotes.form.pickerProductColumn,
      className: 'align-top',
      render: (row) => (
        <>
          <div className="font-semibold text-app-text">
            {row.productName ?? tr.crm.quotes.form.summaryIncompleteRow}
          </div>
          {row.isDefaultPrice && (
            <Badge variant="neutral" className="mt-0.5">
              {tr.crm.quotes.form.summaryPriceFromList}
            </Badge>
          )}
        </>
      ),
    },
    {
      key: 'quantity',
      header: tr.crm.quotes.form.quantityLabel,
      className: 'w-16 align-top text-app-muted',
      render: (row) => row.quantity,
    },
    {
      key: 'discountPct',
      header: tr.crm.quotes.detail.discountColumn,
      className: 'w-16 align-top font-semibold whitespace-nowrap text-app-success',
      render: (row) => (row.discountPct > 0 ? `-%${row.discountPct}` : ''),
    },
    {
      key: 'vatPct',
      header: tr.crm.quotes.detail.vatColumn,
      className: 'w-16 align-top font-semibold whitespace-nowrap text-app-danger',
      render: (row) => (row.vatPct > 0 ? `+%${row.vatPct}` : ''),
    },
    {
      key: 'lineTotal',
      header: tr.crm.quotes.detail.lineTotalColumn,
      className: 'w-24 align-top font-semibold whitespace-nowrap text-app-text',
      render: (row) => formatCurrencyAmount(row.lineTotal, row.currency),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-8 align-top',
      render: (row) => (
        <IconActionButton
          icon={X}
          tooltip={tr.crm.quotes.form.removeItem}
          variant="danger"
          onClick={() => {
            remove(row.index);
            if (editingIndex === row.index) setEditingIndex(null);
          }}
        />
      ),
    },
  ];

  function renderEditPanel() {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:items-start lg:grid-cols-7">
        <TextField
          type="text"
          inputMode="decimal"
          label={tr.crm.quotes.form.quantityLabel}
          value={editQuantity}
          onChange={(event) => setEditQuantity(sanitizeDecimalInput(event.target.value))}
        />
        <TextField
          type="text"
          inputMode="decimal"
          label={tr.crm.quotes.form.unitPriceLabel(editCurrency)}
          value={editUnitPrice}
          onChange={(event) => setEditUnitPrice(sanitizeDecimalInput(event.target.value))}
        />
        <div>
          <Select
            label={tr.crm.quotes.form.currencyLabel}
            options={QUOTE_CURRENCY_OPTIONS}
            value={editCurrency}
            onChange={(event) => void handleEditCurrencyChange(event.target.value)}
          />
          <p className="mt-1.5 text-xs text-app-muted">{tr.crm.quotes.form.currencyHint}</p>
        </div>
        <TextField
          type="text"
          inputMode="decimal"
          label={tr.crm.quotes.form.discountPctLabel}
          value={editDiscountPct}
          onChange={(event) => setEditDiscountPct(sanitizeDecimalInput(event.target.value))}
        />
        <div>
          <TextField
            type="text"
            inputMode="decimal"
            label={tr.crm.quotes.form.vatPctLabel}
            value={editVatPct}
            onChange={(event) => setEditVatPct(sanitizeDecimalInput(event.target.value))}
          />
          <VatPctDefaultLink />
        </div>
        <BrandSelect
          value={editBrand}
          onChange={setEditBrand}
          onRequestAddNew={() => setActiveOptionModal('brandEdit')}
        />
        <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-4 lg:col-span-1">
          <span aria-hidden="true" className="text-sm font-semibold text-transparent select-none">
            &nbsp;
          </span>
          <Button
            type="button"
            className="w-full"
            onClick={() => handleSaveEditRow(editingIndex as number)}
          >
            {tr.crm.quotes.edit.saveRow}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <BackLink to={'/teklifler'} label={tr.crm.quotes.title} />

      <div className="mt-6">
        <h1 className="text-lg font-bold text-app-text">{tr.crm.quotes.form.newTitle}</h1>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-6">
          <FormError message={apiErrorMessage} />

          <QuoteMetaFields
            accountSlot={
              <div>
                <Controller
                  name="accountId"
                  control={control}
                  render={({ field }) => (
                    <AccountAutocomplete
                      label={tr.crm.quotes.form.accountLabel}
                      required
                      placeholder={tr.crm.quotes.form.accountPlaceholder}
                      hint={tr.crm.quotes.form.accountHint}
                      error={errors.accountId?.message}
                      value={field.value}
                      onChange={field.onChange}
                      loadAllWhenEmpty
                      trailingAction={
                        <Button
                          type="button"
                          variant="navy"
                          className="shrink-0"
                          onClick={() => setIsNewAccountModalOpen(true)}
                        >
                          {tr.crm.quotes.form.newAccountButton}
                        </Button>
                      }
                    />
                  )}
                />
                {selectedAccountId && (revisionSummaryQuery.data?.count ?? 0) > 0 && (
                  <p className="mt-1.5 text-xs font-semibold text-app-danger">
                    {tr.crm.quotes.form.accountRevisionWarning(revisionSummaryQuery.data!.count)}
                  </p>
                )}
              </div>
            }
            contactOptions={contactOptions}
            contactTrailingAction={
              <Button
                type="button"
                variant="navy"
                className="shrink-0"
                disabled={!selectedAccountId}
                onClick={() => setIsNewContactModalOpen(true)}
              >
                {tr.crm.quotes.form.newContactButton}
              </Button>
            }
            senderOptions={senderOptions}
            values={{
              contactId: watch('contactId') ?? '',
              quoteDate: watch('quoteDate') ?? '',
              leadTime: watch('leadTime') ?? '',
              validityPeriod: watch('validityPeriod') ?? '',
              paymentMethod: watch('paymentMethod') ?? '',
              ibanSelections: watch('ibanSelections') ?? [],
              quoteCurrency,
              templateId: watch('templateId') ?? '',
              senderId: watch('senderId') ?? '',
            }}
            onChange={(field, value) => setValue(field, value as never, { shouldValidate: true })}
            errors={{
              contactId: errors.contactId?.message,
              quoteDate: errors.quoteDate?.message,
              leadTime: errors.leadTime?.message,
              validityPeriod: errors.validityPeriod?.message,
              paymentMethod: errors.paymentMethod?.message,
              ibanSelections: errors.ibanSelections?.message,
              quoteCurrency: errors.quoteCurrency?.message,
              templateId: errors.templateId?.message,
              senderId: errors.senderId?.message,
            }}
            onRequestAddPaymentMethod={() => setActiveOptionModal('paymentMethod')}
            onRequestAddIban={() => setActiveOptionModal('iban')}
          />

          <TextField
            label={tr.crm.quotes.form.titleLabel}
            placeholder={tr.crm.quotes.form.titlePlaceholder}
            hint={tr.crm.quotes.form.titleHint}
            error={errors.title?.message}
            {...register('title')}
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-app-border bg-app-surface p-4">
              <span className="text-sm font-semibold text-app-text">
                {tr.crm.quotes.form.itemsSectionTitle}
              </span>
              <FormError message={errors.items?.message} />

              <div className="mt-3">
                <Select
                  label={tr.crm.quotes.form.productListLabel}
                  required
                  placeholder={tr.crm.quotes.form.productListPlaceholder}
                  hint={tr.crm.quotes.form.productListHint}
                  error={errors.productListId?.message}
                  options={(productListsQuery.data?.data ?? []).map((productList) => ({
                    value: productList.id,
                    label: productList.name,
                  }))}
                  trailingAction={
                    <Button
                      type="button"
                      variant="navy"
                      className="shrink-0"
                      onClick={() => setIsNewProductModalOpen(true)}
                    >
                      {tr.crm.quotes.form.newProductButton}
                    </Button>
                  }
                  {...register('productListId', {
                    onChange: () => {
                      setPickerPage(1);
                      setPickerQuery('');
                      setEntryProductId(null);
                      setEditingIndex(null);
                    },
                  })}
                />
              </div>

              {!selectedProductListId ? (
                <p className="mt-3 rounded-lg border border-dashed border-app-border p-4 text-center text-sm text-app-muted">
                  {tr.crm.quotes.form.pickerSelectProductListFirst}
                </p>
              ) : (
                <>
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <div className="relative flex-1">
                      <Search
                        size={16}
                        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-app-muted"
                      />
                      <input
                        type="search"
                        value={pickerQuery}
                        onChange={(event) => {
                          setPickerPage(1);
                          setPickerQuery(event.target.value);
                        }}
                        placeholder={tr.crm.quotes.form.pickerSearchPlaceholder}
                        className="w-full rounded-lg border border-app-border bg-app-surface py-2.5 pr-3 pl-9 text-sm text-app-text outline-none focus:border-app-primary"
                      />
                    </div>
                    <ColumnVisibilityPicker
                      columns={optionalPickerColumns}
                      value={visiblePickerKeys}
                      onChange={setVisiblePickerKeys}
                    />
                  </div>

                  <p className="mt-2 text-sm text-app-muted">
                    {tr.crm.quotes.form.summaryEditHint}
                  </p>

                  <Table
                    columns={pickerColumns}
                    data={pickerProducts}
                    keyField={(product) => product.id}
                    onRowClick={handleToggleEntry}
                    isRowExpanded={(product) => entryProductId === product.id}
                    renderExpandedRow={(product) => renderEntryPanel(product)}
                    rowClassName={(product) =>
                      entryProductId === product.id ? 'bg-blue-50' : undefined
                    }
                  />

                  {productsQuery.isPending && (
                    <p className="mt-3 text-center text-sm text-app-muted">
                      {tr.crm.quotes.form.pickerLoading}
                    </p>
                  )}
                  {!productsQuery.isPending && pickerProducts.length === 0 && (
                    <p className="mt-3 text-center text-sm text-app-muted">
                      {tr.crm.quotes.form.pickerEmpty}
                    </p>
                  )}

                  {productsQuery.data && pickerProducts.length > 0 && (
                    <Pagination
                      page={productsQuery.data.meta.page}
                      totalPages={productsQuery.data.meta.totalPages}
                      total={productsQuery.data.meta.total}
                      onPageChange={setPickerPage}
                      onPrevious={() => setPickerPage((p) => p - 1)}
                      onNext={() => setPickerPage((p) => p + 1)}
                    />
                  )}
                </>
              )}
            </div>

            <aside className="lg:sticky lg:top-6 lg:self-start">
              <div className="flex flex-col gap-4 rounded-lg border border-app-border bg-app-surface p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-app-text">
                    {tr.crm.quotes.form.summaryTitle}
                  </h2>
                  <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold text-app-primary">
                    {tr.crm.quotes.form.summaryItemCount(summaryRows.length)}
                  </span>
                </div>

                <p className="text-sm text-app-muted">{tr.crm.quotes.form.summaryEditHint}</p>

                {summaryRows.length === 0 ? (
                  <p className="text-xs text-app-muted">{tr.crm.quotes.form.summaryEmpty}</p>
                ) : (
                  <Table
                    columns={summaryColumns}
                    data={summaryRows}
                    keyField={(row) => fields[row.index]?.id ?? String(row.index)}
                    onRowClick={(row) => handleToggleEditRow(row.index)}
                    isRowExpanded={(row) => editingIndex === row.index}
                    renderExpandedRow={() => renderEditPanel()}
                    rowClassName={(row) => (editingIndex === row.index ? 'bg-blue-50' : undefined)}
                  />
                )}

                <div className="flex flex-wrap gap-4 border-t border-app-border pt-4 text-sm">
                  {summaryTotalsByCurrency.map((totals) => (
                    <div key={totals.currency} className="flex min-w-40 flex-1 flex-col gap-1.5">
                      {summaryTotalsByCurrency.length > 1 && (
                        <span className="text-xs font-semibold text-app-muted">
                          {totals.currency}
                        </span>
                      )}
                      <div className="flex justify-between text-app-muted">
                        <span>{tr.crm.quotes.detail.subtotalLabel}</span>
                        <span>{formatCurrencyAmount(totals.subtotal, totals.currency)}</span>
                      </div>
                      <div className="flex justify-between text-app-muted">
                        <span>{tr.crm.quotes.detail.vatTotalLabel}</span>
                        <span>{formatCurrencyAmount(totals.vatTotal, totals.currency)}</span>
                      </div>
                      <div className="flex justify-between text-base font-bold text-app-text">
                        <span>{tr.crm.quotes.detail.totalLabel}</span>
                        <span>{formatCurrencyAmount(totals.grandTotal, totals.currency)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <QuoteExchangeRatesSection
                  quoteCurrency={quoteCurrency}
                  totalsByCurrency={summaryTotalsByCurrency}
                  value={exchangeRates}
                  onChange={setExchangeRates}
                />
              </div>
            </aside>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <TextareaField
                label={tr.crm.quotes.form.paymentTermsLabel}
                placeholder={tr.crm.quotes.form.paymentTermsPlaceholder}
                hint={tr.crm.quotes.form.paymentTermsHint}
                error={errors.paymentTerms?.message}
                {...register('paymentTerms')}
              />
              <TermsDefaultLink />
            </div>
            <div>
              <TextareaField
                label={tr.crm.quotes.form.salesTermsLabel}
                placeholder={tr.crm.quotes.form.salesTermsPlaceholder}
                hint={tr.crm.quotes.form.salesTermsHint}
                error={errors.salesTerms?.message}
                {...register('salesTerms')}
              />
              <TermsDefaultLink />
            </div>
            <div>
              <TextareaField
                label={tr.crm.quotes.form.deliveryTermsLabel}
                placeholder={tr.crm.quotes.form.deliveryTermsPlaceholder}
                hint={tr.crm.quotes.form.deliveryTermsHint}
                error={errors.deliveryTerms?.message}
                {...register('deliveryTerms')}
              />
              <TermsDefaultLink />
            </div>
            <div>
              <TextareaField
                label={tr.crm.quotes.form.generalTermsLabel}
                placeholder={tr.crm.quotes.form.generalTermsPlaceholder}
                hint={tr.crm.quotes.form.generalTermsHint}
                error={errors.generalTerms?.message}
                {...register('generalTerms')}
              />
              <TermsDefaultLink />
            </div>
          </div>

          <div className="rounded-lg border border-app-border bg-app-surface p-4">
            <Controller
              name="hasOpportunity"
              control={control}
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Switch checked={field.value ?? false} onChange={field.onChange} />
                  <span className="text-sm font-semibold text-app-text">
                    {tr.crm.quotes.form.opportunityCheckboxLabel}
                  </span>
                </div>
              )}
            />
            {hasOpportunity && (
              <div className="mt-4 flex flex-col gap-4">
                <TextField
                  label={tr.crm.quotes.form.opportunityNameLabel}
                  required
                  hint={tr.crm.quotes.form.opportunityNameHint}
                  error={errors.opportunityName?.message}
                  {...register('opportunityName')}
                />
                <Select
                  label={tr.crm.quotes.form.opportunityStageLabel}
                  hint={tr.crm.quotes.form.opportunityStageHint}
                  options={STAGE_OPTIONS}
                  error={errors.opportunityStage?.message}
                  {...register('opportunityStage')}
                />
                <TextField
                  type="number"
                  step="0.01"
                  label={tr.crm.quotes.form.opportunityValueLabel}
                  hint={tr.crm.quotes.form.opportunityValueHint}
                  error={errors.opportunityValue?.message}
                  {...register('opportunityValue')}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending ? tr.crm.quotes.form.submitting : tr.crm.quotes.form.submit}
            </Button>
            <Button
              type="button"
              variant="danger"
              className="w-full border border-white"
              onClick={() => navigate('/teklifler')}
            >
              {tr.crm.quotes.form.cancel}
            </Button>
          </div>
        </form>
      </div>

      {activeOptionModal === 'paymentMethod' && (
        <AddOptionModal
          title={tr.crm.quotes.form.paymentMethodNewModalTitle}
          fieldLabel={tr.crm.quotes.form.paymentMethodNewFieldLabel}
          placeholder={tr.crm.quotes.form.paymentMethodNewPlaceholder}
          successMessage={tr.crm.quotes.form.paymentMethodNewSuccess}
          createMutation={createPaymentMethodOptionMutation}
          onClose={() => setActiveOptionModal(null)}
          onCreated={(label) => {
            setValue('paymentMethod', label, { shouldValidate: true });
            setActiveOptionModal(null);
          }}
        />
      )}
      {activeOptionModal === 'iban' && (
        <AddIbanOptionModal
          onClose={() => setActiveOptionModal(null)}
          onCreated={(option) => {
            setValue(
              'ibanSelections',
              [...(watch('ibanSelections') ?? []), encodeIbanOptionSelection(option.id)],
              { shouldValidate: true, shouldDirty: true },
            );
            setActiveOptionModal(null);
          }}
        />
      )}
      {(activeOptionModal === 'brandEntry' || activeOptionModal === 'brandEdit') && (
        <AddOptionModal
          title={tr.crm.products.form.brandNewModalTitle}
          fieldLabel={tr.crm.products.form.brandNewFieldLabel}
          placeholder={tr.crm.products.form.brandNewPlaceholder}
          successMessage={tr.crm.products.form.brandNewSuccess}
          createMutation={createBrandOptionMutation}
          onClose={() => setActiveOptionModal(null)}
          onCreated={(label) => {
            if (activeOptionModal === 'brandEntry') {
              setEntryBrand(label);
            } else {
              setEditBrand(label);
            }
            setActiveOptionModal(null);
          }}
        />
      )}
      {isNewProductModalOpen && (
        <NewProductModal
          defaultProductListId={selectedProductListId}
          onClose={() => setIsNewProductModalOpen(false)}
          onCreated={handleProductCreated}
        />
      )}
      {isNewAccountModalOpen && (
        <NewAccountModal
          onClose={() => setIsNewAccountModalOpen(false)}
          onCreated={handleAccountCreated}
        />
      )}
      {isNewContactModalOpen && selectedAccountId && (
        <QuoteNewContactModal
          accountId={selectedAccountId}
          accountName={selectedAccountQuery.data?.name ?? ''}
          onClose={() => setIsNewContactModalOpen(false)}
          onCreated={handleContactCreated}
        />
      )}
    </AppShell>
  );
}
