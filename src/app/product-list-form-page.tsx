import { zodResolver } from '@hookform/resolvers/zod';
import { Download, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Button } from '../components/ui/button';
import { CircleIconButton } from '../components/ui/circle-icon-button';
import { FormError } from '../components/ui/form-error';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import {
  useCreateProductListMutation,
  useProductListQuery,
} from '../features/crm/use-product-lists';
import { ProductListInlineSelect } from '../features/crm/product-list-inline-select';
import { useProductsQuery } from '../features/crm/use-products';
import { productListFormSchema, type ProductListFormValues } from '../features/crm/schemas';
import { ApiError, type Product, type ProductListInput } from '../lib/api';
import { formatCurrencyAmount } from '../lib/quote-totals';
import { useDebouncedValue } from '../lib/use-debounced-value';
import { tr } from '../i18n/tr';

export function ProductListFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();
  const backTo = (location.state as { from?: string } | null)?.from ?? '/urun-listeleri';
  // Bu sayfadan /urunler/:id veya /urunler/yeni'ye gidilirse, oradaki "geri dön" bu
  // formun kendi URL'ine dönmeli. productListId, /urunler/yeni'de "Ürün Listesi"
  // dropdown'ının bu listeyle önceden dolu gelmesi için taşınıyor. parentFrom, bu
  // sayfanın kendi "nereden geldim" adresi (backTo) - ürün detayından buraya geri
  // dönüldüğünde bu sayfanın kendi state'ini kaybetmemesi için zincirin bir sonraki
  // halkasına taşınıyor (bkz. kullanıcı bildirimi: /urun-listeleri/:id → /urunler/:id →
  // geri → /urun-listeleri/:id → geri, /envanter?tab=productLists'ten kopuyordu).
  const productBackState = {
    from: `${location.pathname}${location.search}`,
    productListId: id,
    parentFrom: backTo,
  };
  const toast = useToast();
  const productListQuery = useProductListQuery(id ?? '');
  const createMutation = useCreateProductListMutation();
  const [productPage, setProductPage] = useState(1);
  const [productQInput, setProductQInput] = useState('');
  const productQ = useDebouncedValue(productQInput.trim());
  const productsQuery = useProductsQuery(
    { productListId: id, page: productPage, pageSize: 25, q: productQ || undefined },
    { enabled: isEdit },
  );

  // İçe aktarma sırasında "özel alan olarak sakla" seçilen kolonlar (Faz B) - bu listedeki
  // ürünlerde görülen tüm anahtarların birleşimi kadar sütun eklenir; bir üründe o anahtar
  // yoksa hücre boş kalır (bkz. docs/VARSAYIMLAR.md V40).
  const attributeKeys = [
    ...new Set((productsQuery.data?.data ?? []).flatMap((p) => Object.keys(p.attributes ?? {}))),
  ].sort();
  const productColumns: TableColumn<Product>[] = [
    {
      key: 'name',
      header: tr.crm.products.nameColumn,
      render: (p) => <span className="font-semibold text-app-text">{p.name}</span>,
    },
    {
      key: 'productList',
      header: tr.crm.products.productListColumn,
      className: 'text-app-muted',
      render: (p) => <ProductListInlineSelect product={p} />,
    },
    {
      key: 'sku',
      header: tr.crm.products.skuColumn,
      className: 'text-app-muted',
      render: (p) => p.sku ?? '—',
    },
    {
      key: 'unit',
      header: tr.crm.products.unitColumn,
      className: 'text-app-muted',
      render: (p) => p.unit,
    },
    {
      key: 'brand',
      header: tr.crm.products.brandColumn,
      className: 'text-app-muted',
      render: (p) => p.brand ?? '—',
    },
    {
      key: 'price',
      header: tr.crm.products.priceColumn,
      className: 'text-app-muted',
      render: (p) => (p.price != null ? formatCurrencyAmount(Number(p.price), p.currency) : '—'),
    },
    ...attributeKeys.map((key) => ({
      key: `attr:${key}`,
      header: key,
      className: 'text-app-muted',
      render: (p: Product) => p.attributes?.[key] ?? '—',
    })),
  ];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductListFormValues>({
    resolver: zodResolver(productListFormSchema),
  });

  if (isEdit && productListQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-app-muted">{tr.common.loading}</p>
      </AppShell>
    );
  }

  const onSubmit = handleSubmit((values) => {
    const input: ProductListInput = { name: values.name };
    createMutation.mutate(input, {
      onSuccess: () => {
        toast.success(tr.crm.productLists.form.createSuccess);
        navigate(backTo);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  });

  const apiErrorMessage =
    createMutation.error instanceof ApiError ? createMutation.error.message : undefined;

  return (
    <AppShell>
      <BackLink to={backTo} label={tr.crm.productLists.title} />

      <div className="mt-6">
        {!isEdit && (
          <>
            <h1 className="text-lg font-bold text-app-text">{tr.crm.productLists.form.newTitle}</h1>
            <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-6" noValidate>
              <FormError message={apiErrorMessage} />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-end">
                <TextField
                  label={tr.crm.productLists.form.nameLabel}
                  error={errors.name?.message}
                  {...register('name')}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending
                    ? tr.crm.productLists.form.submitting
                    : tr.crm.productLists.form.submit}
                </Button>
                <Button type="button" variant="secondary" onClick={() => navigate(backTo)}>
                  {tr.crm.productLists.form.cancel}
                </Button>
              </div>
            </form>
          </>
        )}

        {isEdit && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-base font-bold text-app-text">
                {tr.crm.productLists.productsSection.title(productListQuery.data?.name ?? '')}
              </h2>
              <div className="flex items-center gap-2">
                <CircleIconButton
                  icon={Download}
                  tooltip={tr.crm.productLists.productsSection.importButton}
                  onClick={() => navigate(`/urun-listeleri/${id}/ice-aktar`)}
                />
                <CircleIconButton
                  icon={Plus}
                  tooltip={tr.crm.productLists.productsSection.addButton}
                  variant="success"
                  strokeWidth={3}
                  onClick={() => navigate('/urunler/yeni', { state: productBackState })}
                />
              </div>
            </div>
            <div className="relative mt-3 w-full">
              <Search
                size={16}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-app-muted"
              />
              <input
                type="search"
                value={productQInput}
                onChange={(event) => {
                  setProductPage(1);
                  setProductQInput(event.target.value);
                }}
                placeholder={tr.crm.productLists.productsSection.searchPlaceholder}
                className="w-full rounded-lg border border-app-border bg-app-surface py-2.5 pr-3 pl-9 text-sm text-app-text outline-none focus:border-app-primary"
              />
            </div>
            <div className="mt-3">
              <Table
                columns={productColumns}
                data={productsQuery.data?.data ?? []}
                keyField={(product) => product.id}
                onRowClick={(product) =>
                  navigate(`/urunler/${product.id}`, { state: productBackState })
                }
                getRowHref={(product) => `/urunler/${product.id}`}
                isLoading={productsQuery.isPending}
                loadingMessage={tr.crm.productLists.productsSection.loading}
                emptyMessage={tr.crm.productLists.productsSection.empty}
              />
            </div>

            {productsQuery.data && productsQuery.data.data.length > 0 && (
              <Pagination
                page={productsQuery.data.meta.page}
                totalPages={productsQuery.data.meta.totalPages}
                total={productsQuery.data.meta.total}
                onPageChange={setProductPage}
                onPrevious={() => setProductPage((p) => p - 1)}
                onNext={() => setProductPage((p) => p + 1)}
              />
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
