import { InlineSelect } from '../../components/ui/inline-select';
import { useToast } from '../../components/ui/toast-context';
import { useProductListsQuery } from './use-product-lists';
import { useUpdateProductMutation } from './use-products';
import { ApiError, type Product } from '../../lib/api';
import { tr } from '../../i18n/tr';

/** /envanter?tab=products ve /urun-listeleri/:id/duzenle ürün tablolarındaki "Ürün Listesi"
 * hücresi - `ProductUnitSelect` ile aynı desen: hücrenin kendisi tıklanabilir bir dropdown,
 * seçim değişince PATCH /products/:id ile anında kaydedilir. Form içindeki
 * `ProductListSelect` (zorunlu, ayrı value/onChange props'lu) ile karıştırılmamalı - o
 * formda kullanılıyor, bu satır-içi düzenleme için. `/urun-listeleri/:id/duzenle`'deki
 * tablo zaten seçili listeye göre filtrelenmiş (productListId) - taşıma sonrası mutation'ın
 * standart PRODUCTS_QUERY_KEY invalidation'ı listeyi yeniden çekip taşınan ürünü otomatik
 * olarak tablodan düşürüyor, ayrı bir "kaybol" mantığı gerekmiyor. */
export function ProductListInlineSelect({ product }: { product: Product }) {
  const toast = useToast();
  const productListsQuery = useProductListsQuery();
  const updateMutation = useUpdateProductMutation(product.id);
  const options = productListsQuery.data?.data ?? [];

  return (
    <InlineSelect
      value={product.productList.id}
      currentLabel={product.productList.name}
      options={options.map((option) => ({ value: option.id, label: option.name }))}
      disabled={updateMutation.isPending || Boolean(product.deletedAt)}
      selectClassName="text-app-muted disabled:opacity-50"
      onChange={(productListId) => {
        const targetList = options.find((option) => option.id === productListId);
        updateMutation.mutate(
          { productListId },
          {
            onSuccess: () => {
              toast.success(
                tr.crm.products.productListMoveSuccess(product.name, targetList?.name ?? ''),
              );
            },
            onError: (error) => {
              toast.error(
                error instanceof ApiError ? error.message : tr.crm.products.productListUpdateError,
              );
            },
          },
        );
      }}
    />
  );
}
