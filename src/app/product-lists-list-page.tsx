import { Pencil, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { IconActionButton } from '../components/ui/icon-action-button';
import { PageHelp } from '../components/ui/page-help';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { useToast } from '../components/ui/toast-context';
import { useMeQuery } from '../features/auth/use-auth';
import { NewProductListModal } from '../features/crm/new-product-list-modal';
import { ProductListEditModal } from './product-list-edit-modal';
import {
  useDeleteProductListMutation,
  useProductListsQuery,
} from '../features/crm/use-product-lists';
import { ApiError, type ProductListWithCount } from '../lib/api';
import { useDebouncedValue } from '../lib/use-debounced-value';
import { tr } from '../i18n/tr';

export function ProductListsListContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const backState = { from: `${location.pathname}${location.search}` };
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [qInput, setQInput] = useState('');
  const q = useDebouncedValue(qInput.trim());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProductList, setEditingProductList] = useState<ProductListWithCount | undefined>(
    undefined,
  );
  const [deletingProductList, setDeletingProductList] = useState<ProductListWithCount | undefined>(
    undefined,
  );
  const meQuery = useMeQuery();
  const pageSize = meQuery.data?.defaultPageSize ?? 25;
  const productListsQuery = useProductListsQuery({ page, pageSize, q: q || undefined });
  const deleteMutation = useDeleteProductListMutation();

  function handleConfirmDelete() {
    if (!deletingProductList) return;
    deleteMutation.mutate(deletingProductList.id, {
      onSuccess: () => {
        toast.success(tr.crm.productLists.deleteSuccess);
        setDeletingProductList(undefined);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  }

  const columns: TableColumn<ProductListWithCount>[] = [
    {
      key: 'name',
      header: tr.crm.productLists.nameColumn,
      required: true,
      render: (pl) => <span className="font-semibold text-app-text">{pl.name}</span>,
    },
    {
      key: 'productCount',
      header: tr.crm.productLists.productCountColumn,
      render: (pl) => <span className="text-app-text">{pl.productCount}</span>,
    },
    {
      key: 'actions',
      header: tr.crm.productLists.actionsColumn,
      className: 'w-px',
      required: true,
      render: (pl) => (
        <div className="flex items-center gap-1">
          <IconActionButton
            icon={Pencil}
            tooltip={tr.crm.productLists.editTooltip}
            onClick={() => setEditingProductList(pl)}
          />
          <IconActionButton
            icon={Trash2}
            tooltip={tr.crm.productLists.deleteTooltip}
            variant="danger"
            onClick={() => setDeletingProductList(pl)}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">{tr.crm.productLists.title}</h1>
            <PageHelp text={tr.help.productLists} />
          </div>
          <p className="mt-1 text-sm text-app-muted">{tr.crm.productLists.subtitle}</p>
        </div>
        <Button type="button" onClick={() => setIsCreateModalOpen(true)}>
          {tr.crm.productLists.newButton}
        </Button>
      </div>

      <div className="relative mt-6 w-full">
        <Search
          size={16}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-app-muted"
        />
        <input
          type="search"
          value={qInput}
          onChange={(event) => {
            setPage(1);
            setQInput(event.target.value);
          }}
          placeholder={tr.crm.productLists.searchPlaceholder}
          className="w-full rounded-lg border border-app-border bg-app-surface py-2.5 pr-3 pl-9 text-sm text-app-text outline-none focus:border-app-primary"
        />
      </div>

      <Table
        columns={columns}
        data={productListsQuery.data?.data ?? []}
        keyField={(productList) => productList.id}
        onRowClick={(productList) =>
          navigate(`/urun-listeleri/${productList.id}`, { state: backState })
        }
        getRowHref={(productList) => `/urun-listeleri/${productList.id}`}
        isLoading={productListsQuery.isPending}
        loadingMessage={tr.crm.productLists.loading}
        emptyMessage={tr.crm.productLists.empty}
      />

      {productListsQuery.data && productListsQuery.data.data.length > 0 && (
        <Pagination
          page={productListsQuery.data.meta.page}
          totalPages={productListsQuery.data.meta.totalPages}
          total={productListsQuery.data.meta.total}
          onPageChange={setPage}
          onPrevious={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}

      {editingProductList && (
        <ProductListEditModal
          productList={editingProductList}
          onClose={() => setEditingProductList(undefined)}
        />
      )}

      {deletingProductList && (
        <ConfirmModal
          title={tr.crm.productLists.deleteConfirmTitle}
          message={tr.crm.productLists.deleteConfirm}
          confirmLabel={tr.crm.productLists.deleteTooltip}
          isPending={deleteMutation.isPending}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingProductList(undefined)}
        />
      )}

      {isCreateModalOpen && (
        <NewProductListModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={() => setIsCreateModalOpen(false)}
        />
      )}
    </>
  );
}

export function ProductListsListPage() {
  return (
    <AppShell>
      <ProductListsListContent />
    </AppShell>
  );
}
