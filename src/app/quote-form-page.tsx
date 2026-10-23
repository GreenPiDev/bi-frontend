import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { Select } from '../components/ui/select';
import { SettingsNavigateLink } from '../components/ui/settings-navigate-link';
import { Switch } from '../components/ui/switch';
import { TextareaField } from '../components/ui/textarea-field';
import { TextField } from '../components/ui/text-field';
import { ThousandsNumberField } from '../components/ui/thousands-number-field';
import { useToast } from '../components/ui/toast-context';
import { AccountAutocomplete } from '../features/crm/account-autocomplete';
import { AddIbanOptionModal } from '../features/crm/add-iban-option-modal';
import { AddOptionModal } from '../features/crm/add-option-modal';
import {
  decodeIbanSelections,
  deriveIbanSelectionsFromSnapshot,
  encodeIbanGroupSelection,
  encodeIbanOptionSelection,
} from '../features/crm/iban-selection';
import { useIbanOptionGroupsQuery } from '../features/crm/use-iban-option-groups';
import { useIbanOptionsQuery } from '../features/crm/use-iban-options';
import { NewAccountModal } from '../features/crm/new-account-modal';
import { NewProductModal } from '../features/crm/new-product-modal';
import { QuoteItemLinesCard } from '../features/crm/quote-item-lines-card';
import { QuoteNewContactModal } from '../features/crm/quote-new-contact-modal';
import { useAccountQuery } from '../features/crm/use-accounts';
import { useMeQuery } from '../features/auth/use-auth';
import {
  QuoteExchangeRatesSection,
  type QuoteExchangeRatesValue,
} from '../features/crm/quote-exchange-rates';
import { QuoteMetaFields } from '../features/crm/quote-meta-fields';
import { useContactsQuery } from '../features/crm/use-contacts';
import { useCreateBrandOptionMutation } from '../features/crm/use-brand-options';
import { useCreatePaymentMethodOptionMutation } from '../features/crm/use-payment-method-options';
import { useProductListsQuery } from '../features/crm/use-product-lists';
import { useCreateProductMutation } from '../features/crm/use-products';
import {
  useCreateQuoteMutation,
  useQuoteAssignableUsersQuery,
  useQuoteQuery,
  useQuoteRevisionSummaryQuery,
  useUpdateQuoteMutation,
} from '../features/crm/use-quotes';
import { useTenantSettingsQuery } from '../features/crm/use-tenant-settings';
import { useUnitOptionsQuery } from '../features/crm/use-unit-options';
import {
  DEFAULT_QUOTE_DELIVERY_TERMS_KEY,
  DEFAULT_QUOTE_GENERAL_TERMS_KEY,
  DEFAULT_QUOTE_PAYMENT_TERMS_KEY,
  DEFAULT_QUOTE_SALES_TERMS_KEY,
  DEFAULT_QUOTE_VAT_PCT,
  DEFAULT_QUOTE_VAT_PCT_KEY,
} from '../features/crm/tenant-settings.constants';
import { quoteFormSchema, type QuoteFormValues } from '../features/crm/schemas';
import {
  ApiError,
  type Account,
  type Contact,
  type CreateQuoteInput,
  type OpportunityStage,
  type Product,
  type UpdateQuoteInput,
} from '../lib/api';
import { groupQuoteItemTotals } from '../lib/quote-totals';
import { tr } from '../i18n/tr';

const STAGE_OPTIONS: { value: OpportunityStage; label: string }[] = (
  ['NEW', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'] as const
).map((stage) => ({ value: stage, label: tr.crm.opportunities.stageOptions[stage] }));

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

/** /teklifler/yeni ve /teklifler/duzenle/:id - proje konvansiyonu (bkz. account-form-page.tsx,
 * project-form-page.tsx, opportunity-form-page.tsx): olusturma/duzenleme icin TEK sayfa,
 * useParams'tan id varligina gore isEdit hesaplanir, farkliliklar isEdit dallanmasiyla
 * yonetilir - ayri bir "paylasilan alt bilesen" cikarilmaz. */
export function QuoteFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillAccountId = searchParams.get('accountId') ?? undefined;
  const toast = useToast();
  const contactsQuery = useContactsQuery();
  const meQuery = useMeQuery();
  const assignableUsersQuery = useQuoteAssignableUsersQuery();
  const productListsQuery = useProductListsQuery();
  const unitOptionsQuery = useUnitOptionsQuery();
  const createProductMutation = useCreateProductMutation();
  const tenantSettingsQuery = useTenantSettingsQuery();
  const defaultVatPctSetting = tenantSettingsQuery.data?.find(
    (setting) => setting.key === DEFAULT_QUOTE_VAT_PCT_KEY,
  );
  const defaultVatPct = String(defaultVatPctSetting?.value ?? DEFAULT_QUOTE_VAT_PCT);

  const quoteQuery = useQuoteQuery(id ?? '');
  const ibanOptionsQuery = useIbanOptionsQuery();
  const createMutation = useCreateQuoteMutation();
  const updateMutation = useUpdateQuoteMutation(id ?? '');
  const mutation = isEdit ? updateMutation : createMutation;
  const createPaymentMethodOptionMutation = useCreatePaymentMethodOptionMutation();
  const createBrandOptionMutation = useCreateBrandOptionMutation();
  // Odeme Yontemi/IBAN/Marka icin "+ Yeni ..." modallari, urun formundaki
  // Birim/Kategori/Marka desenindeki gibi bilincli olarak <form>'un DISINDA render
  // edilir - Select'lerin kendi icinde render edilselerdi modal'in <form>'u disardaki
  // teklif formunun <form>'una ic ice girer, "Kaydet" native submit'e dusup sayfayi
  // yeniler ve eklenen deger hic kaydedilmez (bkz. product-form-page.tsx).
  const [activeOptionModal, setActiveOptionModal] = useState<
    'paymentMethod' | 'iban' | 'brand' | null
  >(null);
  // "+ Yeni Marka" hangi kalem satirindan tetiklendi - modal'dan donen yeni marka
  // etiketi o satirin brand alanina yazilir (bkz. AddOptionModal onCreated).
  const [brandTargetIndex, setBrandTargetIndex] = useState<number | null>(null);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false);
  const [isNewContactModalOpen, setIsNewContactModalOpen] = useState(false);
  // Sadece duzenleme + REVIZE durumunda kullanilir (bkz. asagidaki isRevisionMode).
  const [revisionNote, setRevisionNote] = useState('');
  const [revisionNoteTouched, setRevisionNoteTouched] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
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
  const { fields, append, remove, move } = useFieldArray({ control, name: 'items' });
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

  // Duzenleme modunda, teklif verisi gelince formu (react-hook-form'un reset()'i ile,
  // proje konvansiyonu - bkz. project-form-page.tsx) ve form disi state'leri (kur) bir
  // kerelige doldurur.
  const [initializedForQuoteId, setInitializedForQuoteId] = useState<string | null>(null);
  useEffect(() => {
    if (!isEdit || !quoteQuery.data || quoteQuery.data.id === initializedForQuoteId) return;
    const quote = quoteQuery.data;
    setInitializedForQuoteId(quote.id);
    reset({
      accountId: quote.accountId,
      contactId: quote.contactId ?? undefined,
      quoteDate: quote.quoteDate.slice(0, 10),
      productListId: quote.items[0]?.product.productListId,
      items: quote.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        currency: item.currency,
        discountPct: item.discountPct,
        vatPct: item.vatPct,
        brand: item.brand ?? '',
      })),
      title: quote.title ?? undefined,
      leadTime: quote.leadTime ?? undefined,
      validityPeriod: quote.validityPeriod ?? undefined,
      paymentMethod: quote.paymentMethod ?? undefined,
      paymentTerms: quote.paymentTerms ?? undefined,
      salesTerms: quote.salesTerms ?? undefined,
      deliveryTerms: quote.deliveryTerms ?? undefined,
      generalTerms: quote.generalTerms ?? undefined,
      templateId: quote.templateId ?? undefined,
      senderId: quote.senderId ?? undefined,
      quoteCurrency: quote.quoteCurrency,
      hasOpportunity: false,
    });
    const savedRates = quote.exchangeRates;
    setExchangeRates({
      rates: Object.fromEntries(
        Object.entries(savedRates?.rates ?? {}).map(([currency, rate]) => [currency, String(rate)]),
      ),
      asOf: savedRates?.asOf,
    });
  }, [isEdit, quoteQuery.data, initializedForQuoteId, reset]);

  // ibanSelections, duzenleme modunda quote + guncel IBAN hesap listesi ikisi de gelince
  // ayrica kurulur (quote genelde iban listesinden once gelir) - bkz.
  // deriveIbanSelectionsFromSnapshot doc comment'i.
  const [ibanInitializedForQuoteId, setIbanInitializedForQuoteId] = useState<string | null>(null);
  useEffect(() => {
    if (
      !isEdit ||
      !quoteQuery.data ||
      !ibanOptionsQuery.data ||
      ibanInitializedForQuoteId === quoteQuery.data.id
    ) {
      return;
    }
    setIbanInitializedForQuoteId(quoteQuery.data.id);
    setValue(
      'ibanSelections',
      deriveIbanSelectionsFromSnapshot(quoteQuery.data.ibanAccounts ?? [], ibanOptionsQuery.data),
    );
  }, [isEdit, quoteQuery.data, ibanOptionsQuery.data, ibanInitializedForQuoteId, setValue]);

  // Gonderen varsayilan olarak istegi yapan kullanici (bkz. docs/VARSAYIMLAR.md) - SADECE
  // olusturma modunda; duzenlemede senderId zaten quote'tan geliyor (yukaridaki reset).
  // Kullanici elle degistirirse (dirty) bir sonraki /auth/me yanitiyla ezilmez.
  useEffect(() => {
    if (!isEdit && meQuery.data && !dirtyFields.senderId) {
      setValue('senderId', meQuery.data.id);
    }
  }, [isEdit, meQuery.data, dirtyFields.senderId, setValue]);

  // Varsayilan hesap grubu (bkz. IbanOptionGroup.isDefault) - SADECE olusturma modunda;
  // duzenlemede yukaridaki iban snapshot eslestirmesi kullanilir. Kullanici elle
  // degistirirse (dirty) bir sonraki fetch ile ezilmez, senderId ile ayni desen.
  const ibanOptionGroupsQuery = useIbanOptionGroupsQuery();
  useEffect(() => {
    if (isEdit) return;
    const defaultGroup = ibanOptionGroupsQuery.data?.find((group) => group.isDefault);
    if (defaultGroup && !dirtyFields.ibanSelections) {
      setValue('ibanSelections', [encodeIbanGroupSelection(defaultGroup.id)]);
    }
  }, [isEdit, ibanOptionGroupsQuery.data, dirtyFields.ibanSelections, setValue]);

  // Kosul metni alanlari (odeme/satis/teslimat/genel hukumler), ayarlardaki varsayilan
  // degerlerle doldurulur - SADECE olusturma modunda; duzenlemede degerler zaten
  // quote'tan geliyor (yukaridaki reset). tenantSettingsQuery baska bir sekmede ayar
  // kaydedilince realtime ile yeniden fetch olur (bkz. useTenantSettingsRealtimeSync) ve
  // bu ekran da guncellenir - ama kullanicinin zaten elle degistirdigi (dirty) alanlar
  // ezilmez.
  useEffect(() => {
    if (isEdit || !tenantSettingsQuery.data) return;
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
    isEdit,
    tenantSettingsQuery.data,
    setValue,
    dirtyFields.paymentTerms,
    dirtyFields.salesTerms,
    dirtyFields.deliveryTerms,
    dirtyFields.generalTerms,
  ]);

  // "+ Yeni Ürün" ile sistemde hiç kayıtlı olmayan bir ürün oluşturulunca, hem seçtiği
  // ürün listesine kalıcı olarak eklenir (NewProductModal içinde) hem de bu teklife
  // varsayılan miktar/fiyatla doğrudan satır olarak eklenir.
  function handleProductCreated(product: Product) {
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
  // handleProductCreated ile aynı desen). Sadece olusturma modunda ulasilabilir (firma
  // duzenlemede degistirilemez, bkz. accountSlot).
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

  // Para birimi bazli ara toplam/KDV/genel toplam - satir detayi/tablosu artik
  // QuoteItemLinesCard'in kendi icinde hesaplaniyor, bu toplamlar sadece
  // QuoteExchangeRatesSection'a (kur bilgisi bolumu) aktarilmak icin burada tutulur.
  const summaryTotalsByCurrency = groupQuoteItemTotals(
    (watchedItems ?? []).map((item) => ({
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      discountPct: Number(item.discountPct) || 0,
      vatPct: Number(item.vatPct) || 0,
      currency: item.currency || 'TRY',
    })),
  );
  const rawItemErrors = errors.items as
    | Array<
        | {
            productId?: { message?: string };
            quantity?: { message?: string };
            unitPrice?: { message?: string };
            discountPct?: { message?: string };
            vatPct?: { message?: string };
          }
        | undefined
      >
    | undefined;
  const itemRowErrors = (rawItemErrors ?? []).map((itemError) =>
    itemError
      ? {
          productId: itemError.productId?.message,
          quantity: itemError.quantity?.message,
          unitPrice: itemError.unitPrice?.message,
          discountPct: itemError.discountPct?.message,
          vatPct: itemError.vatPct?.message,
        }
      : undefined,
  );

  // Satirda gercek bir urun secilmemis ama ProductAutocomplete'e serbest metin bir ad
  // yazilmissa (hizli urun ekleme - bkz. kullanici talebi), submit oncesi o urunu
  // secili urun listesine gercekten olusturup productId'sini doldurur. Birim secimi
  // kullaniciya sorulmaz, tenant'in varsayilan birimi (UnitOption.isDefault)
  // kullanilir - backend'deki CreateProductManualSchema'nin 'adet' varsayilanindan
  // farkli olarak burada tenant'in gercek varsayilan birimi tercih edilir.
  async function resolveQuickAddedProducts(
    items: QuoteFormValues['items'],
  ): Promise<QuoteFormValues['items']> {
    const defaultUnit =
      unitOptionsQuery.data?.find((option) => option.isDefault)?.label ??
      unitOptionsQuery.data?.[0]?.label ??
      'adet';
    const resolved = [...items];
    for (let index = 0; index < resolved.length; index += 1) {
      const item = resolved[index];
      if (item.productId) continue;
      const quickAddName = (item.productName ?? '').trim();
      if (!quickAddName) continue;
      const product = await createProductMutation.mutateAsync({
        productListId: selectedProductListId!,
        name: quickAddName,
        unit: defaultUnit,
        price: Number(item.unitPrice),
        currency: item.currency || quoteCurrency || 'TRY',
        brand: item.brand || undefined,
      });
      resolved[index] = { ...item, productId: product.id };
    }
    return resolved;
  }

  const onSubmit = handleSubmit(async (values) => {
    let resolvedItems: QuoteFormValues['items'];
    try {
      resolvedItems = await resolveQuickAddedProducts(values.items);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      return;
    }
    values = { ...values, items: resolvedItems };

    if (isEdit) {
      const isRevisionMode = quoteQuery.data?.status === 'REVIZE';
      if (isRevisionMode && !revisionNote.trim()) {
        setRevisionNoteTouched(true);
        toast.error(tr.crm.quotes.edit.revisionNoteRequired);
        return;
      }
      const updateInput: UpdateQuoteInput = {
        ...(isRevisionMode ? { revisionNote: revisionNote.trim() } : {}),
        // Validasyon + resolveQuickAddedProducts yukarida gectiyse her satirin
        // productId'si garanti doludur (hizli eklenenler de artik gercek bir urune
        // sahip) - bkz. superRefine.
        items: values.items.map((item) => ({
          productId: item.productId!,
          quantity: Number(item.quantity),
          unitPrice: item.unitPrice ? Number(item.unitPrice) : undefined,
          currency: item.currency || undefined,
          discountPct: item.discountPct ? Number(item.discountPct) : 0,
          vatPct: item.vatPct ? Number(item.vatPct) : 0,
          brand: item.brand ?? undefined,
        })),
        contactId: values.contactId || null,
        quoteDate: values.quoteDate ? new Date(values.quoteDate).toISOString() : undefined,
        title: values.title || null,
        leadTime: values.leadTime || null,
        validityPeriod: values.validityPeriod || null,
        paymentMethod: values.paymentMethod || null,
        // Kullanici hic secim yapmadiysa (bos dizi) hicbir alan gonderilmez - backend
        // bunu "degistirilmedi" sayar ve mevcut snapshot'i korur (bkz.
        // UpdateQuoteSchema.ibanOptionIds doc comment'i).
        ...((values.ibanSelections ?? []).length > 0
          ? decodeIbanSelections(values.ibanSelections ?? [])
          : {}),
        paymentTerms: values.paymentTerms || null,
        salesTerms: values.salesTerms || null,
        deliveryTerms: values.deliveryTerms || null,
        generalTerms: values.generalTerms || null,
        // Duzenlemede undefined "dokunma" anlamina gelir (bkz. UpdateQuoteSchema) - bu
        // yuzden burada daima acik deger gonderilir.
        templateId: values.templateId || null,
        senderId: values.senderId || undefined,
        quoteCurrency: values.quoteCurrency,
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
      updateMutation.mutate(updateInput, {
        onSuccess: (updated) => {
          toast.success(tr.crm.quotes.edit.updateSuccess);
          navigate(`/teklifler/${updated.id}`);
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      });
      return;
    }

    const input: CreateQuoteInput = {
      accountId: values.accountId,
      contactId: values.contactId || undefined,
      senderId: values.senderId,
      items: values.items.map((item) => ({
        productId: item.productId!,
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

  const apiErrorMessage = mutation.error instanceof ApiError ? mutation.error.message : undefined;

  if (isEdit && quoteQuery.isPending) {
    return (
      <AppShell>
        <p className="mt-6 text-sm text-app-muted">{tr.common.loading}</p>
      </AppShell>
    );
  }
  if (isEdit && !quoteQuery.data) {
    return null;
  }

  const quote = quoteQuery.data;
  const isRevisionMode = quote?.status === 'REVIZE';
  if (quote) {
    const isEditableStatus =
      quote.status === 'DRAFT' ||
      quote.status === 'SENT' ||
      quote.status === 'PENDING_APPROVAL' ||
      quote.status === 'REVIZE';
    if (!isEditableStatus) {
      return (
        <AppShell>
          <BackLink to={`/teklifler/${quote.id}`} label={tr.crm.quotes.edit.back} />
          <div className="mt-6 rounded-lg border border-app-border bg-app-surface p-6 text-center">
            <h1 className="text-lg font-bold text-app-text">
              {tr.crm.quotes.edit.notEditableTitle}
            </h1>
            <p className="mt-2 text-sm text-app-muted">{tr.crm.quotes.edit.notEditableMessage}</p>
          </div>
        </AppShell>
      );
    }
  }

  return (
    <AppShell>
      <BackLink
        to={quote ? `/teklifler/${quote.id}` : '/teklifler'}
        label={isEdit ? tr.crm.quotes.edit.back : tr.crm.quotes.title}
      />

      <div className="mt-6">
        <h1 className="text-lg font-bold text-app-text">
          {quote ? (
            <>
              {tr.crm.quotes.edit.title} — {quote.quoteNumber}
            </>
          ) : (
            tr.crm.quotes.form.newTitle
          )}
        </h1>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-6">
          <FormError message={apiErrorMessage} />

          <QuoteMetaFields
            accountSlot={
              quote ? (
                <div>
                  <p className="text-xs font-semibold text-app-muted">
                    {tr.crm.quotes.edit.accountLabel}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-app-text">{quote.account.name}</p>
                </div>
              ) : (
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
              )
            }
            contactOptions={contactOptions}
            contactTrailingAction={
              !isEdit ? (
                <Button
                  type="button"
                  variant="navy"
                  className="shrink-0"
                  disabled={!selectedAccountId}
                  onClick={() => setIsNewContactModalOpen(true)}
                >
                  {tr.crm.quotes.form.newContactButton}
                </Button>
              ) : undefined
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
            onRequestAddPaymentMethod={
              !isEdit ? () => setActiveOptionModal('paymentMethod') : undefined
            }
            onRequestAddIban={!isEdit ? () => setActiveOptionModal('iban') : undefined}
            ibanCurrentInfo={
              quote
                ? quote.ibanAccounts && quote.ibanAccounts.length > 0
                  ? quote.ibanAccounts.map((account) => ({
                      bankName: account.bankName,
                      ibanNumber: account.iban,
                    }))
                  : null
                : undefined
            }
          />

          <TextField
            label={isEdit ? tr.crm.quotes.edit.titleLabel : tr.crm.quotes.form.titleLabel}
            placeholder={tr.crm.quotes.form.titlePlaceholder}
            hint={tr.crm.quotes.form.titleHint}
            error={errors.title?.message}
            {...register('title')}
          />

          <QuoteItemLinesCard
            texts={{
              title: tr.crm.quotes.form.summaryTitle,
              productListHint: tr.crm.quotes.form.productListHint,
              emptyState: tr.crm.quotes.form.summaryEmpty,
            }}
            productListId={selectedProductListId}
            productListOptions={(productListsQuery.data?.data ?? []).map((productList) => ({
              value: productList.id,
              label: productList.name,
            }))}
            productListError={errors.productListId?.message}
            onProductListChange={(value) =>
              setValue('productListId', value, { shouldValidate: true })
            }
            onRequestAddProductList={() => setIsNewProductModalOpen(true)}
            itemKeys={fields.map((field) => field.id)}
            items={watchedItems ?? []}
            itemErrors={itemRowErrors}
            itemsError={errors.items?.message}
            defaultVatPct={defaultVatPct}
            onAddItem={() =>
              append({
                productId: '',
                quantity: '1',
                unitPrice: '',
                currency: quoteCurrency || 'TRY',
                discountPct: '0',
                vatPct: defaultVatPct,
                brand: '',
              })
            }
            onRemoveItem={remove}
            onMoveItem={move}
            onItemChange={(index, field, value) =>
              setValue(`items.${index}.${field}` as const, value as never, {
                shouldValidate: true,
              })
            }
            onRequestAddBrand={(index) => {
              setBrandTargetIndex(index);
              setActiveOptionModal('brand');
            }}
            onProductFreeTextChange={(index, text) => setValue(`items.${index}.productName`, text)}
            footer={
              <QuoteExchangeRatesSection
                quoteCurrency={quoteCurrency}
                totalsByCurrency={summaryTotalsByCurrency}
                value={exchangeRates}
                onChange={setExchangeRates}
              />
            }
          />

          <div className="flex flex-col gap-4">
            <div>
              <TextareaField
                label={
                  isEdit
                    ? tr.crm.quotes.edit.paymentTermsLabel
                    : tr.crm.quotes.form.paymentTermsLabel
                }
                placeholder={tr.crm.quotes.form.paymentTermsPlaceholder}
                hint={tr.crm.quotes.form.paymentTermsHint}
                error={errors.paymentTerms?.message}
                {...register('paymentTerms')}
              />
              <TermsDefaultLink />
            </div>
            <div>
              <TextareaField
                label={
                  isEdit ? tr.crm.quotes.edit.salesTermsLabel : tr.crm.quotes.form.salesTermsLabel
                }
                placeholder={tr.crm.quotes.form.salesTermsPlaceholder}
                hint={tr.crm.quotes.form.salesTermsHint}
                error={errors.salesTerms?.message}
                {...register('salesTerms')}
              />
              <TermsDefaultLink />
            </div>
            <div>
              <TextareaField
                label={
                  isEdit
                    ? tr.crm.quotes.edit.deliveryTermsLabel
                    : tr.crm.quotes.form.deliveryTermsLabel
                }
                placeholder={tr.crm.quotes.form.deliveryTermsPlaceholder}
                hint={tr.crm.quotes.form.deliveryTermsHint}
                error={errors.deliveryTerms?.message}
                {...register('deliveryTerms')}
              />
              <TermsDefaultLink />
            </div>
            <div>
              <TextareaField
                label={
                  isEdit
                    ? tr.crm.quotes.edit.generalTermsLabel
                    : tr.crm.quotes.form.generalTermsLabel
                }
                placeholder={tr.crm.quotes.form.generalTermsPlaceholder}
                hint={tr.crm.quotes.form.generalTermsHint}
                error={errors.generalTerms?.message}
                {...register('generalTerms')}
              />
              <TermsDefaultLink />
            </div>
          </div>

          {!isEdit && (
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
                  <Controller
                    name="opportunityValue"
                    control={control}
                    render={({ field }) => (
                      <ThousandsNumberField
                        label={tr.crm.quotes.form.opportunityValueLabel}
                        hint={tr.crm.quotes.form.opportunityValueHint}
                        error={errors.opportunityValue?.message}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>
              )}
            </div>
          )}

          {isRevisionMode && (
            <TextareaField
              label={tr.crm.quotes.edit.revisionNoteLabel}
              required
              placeholder={tr.crm.quotes.edit.revisionNotePlaceholder}
              hint={tr.crm.quotes.edit.revisionNoteHint}
              value={revisionNote}
              onChange={(event) => setRevisionNote(event.target.value)}
              error={
                revisionNoteTouched && !revisionNote.trim()
                  ? tr.crm.quotes.edit.revisionNoteRequired
                  : undefined
              }
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending
                ? isEdit
                  ? tr.crm.quotes.edit.submitting
                  : tr.crm.quotes.form.submitting
                : isEdit
                  ? tr.crm.quotes.edit.submit
                  : tr.crm.quotes.form.submit}
            </Button>
            <Button
              type="button"
              variant="danger"
              className="w-full border border-white"
              onClick={() => navigate(quote ? `/teklifler/${quote.id}` : '/teklifler')}
            >
              {isEdit ? tr.crm.quotes.edit.cancel : tr.crm.quotes.form.cancel}
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
      {activeOptionModal === 'brand' && (
        <AddOptionModal
          title={tr.crm.products.form.brandNewModalTitle}
          fieldLabel={tr.crm.products.form.brandNewFieldLabel}
          placeholder={tr.crm.products.form.brandNewPlaceholder}
          successMessage={tr.crm.products.form.brandNewSuccess}
          createMutation={createBrandOptionMutation}
          onClose={() => {
            setActiveOptionModal(null);
            setBrandTargetIndex(null);
          }}
          onCreated={(label) => {
            if (brandTargetIndex !== null) {
              setValue(`items.${brandTargetIndex}.brand`, label);
            }
            setActiveOptionModal(null);
            setBrandTargetIndex(null);
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
