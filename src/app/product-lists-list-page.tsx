import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { PageHelp } from '../components/ui/page-help';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { useMeQuery } from '../features/auth/use-auth';
import { useProductListsQuery } from '../features/crm/use-product-lists';
import type { ProductList } from '../lib/api';
import { tr } from '../i18n/tr';

const columns: TableColumn<ProductList>[] = [
  {
    key: 'name',
    header: tr.crm.productLists.nameColumn,
    render: (pl) => (
      <span className="flex items-center gap-2 font-semibold text-app-text">
        {pl.name}
        {pl.isDefault && <Badge variant="info">{tr.crm.productLists.defaultBadge}</Badge>}
      </span>
    ),
  },
];

export function ProductListsListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const meQuery = useMeQuery();
  const pageSize = meQuery.data?.defaultPageSize ?? 25;
  const productListsQuery = useProductListsQuery({ page, pageSize });

  return (
    <AppShell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">{tr.crm.productLists.title}</h1>
            <PageHelp text={tr.help.productLists} />
          </div>
          <p className="mt-1 text-sm text-app-muted">{tr.crm.productLists.subtitle}</p>
        </div>
        <Button type="button" onClick={() => navigate('/urun-listeleri/yeni')}>
          {tr.crm.productLists.newButton}
        </Button>
      </div>

      <Table
        columns={columns}
        data={productListsQuery.data?.data ?? []}
        keyField={(productList) => productList.id}
        onRowClick={(productList) => navigate(`/urun-listeleri/${productList.id}/duzenle`)}
        isLoading={productListsQuery.isPending}
        loadingMessage={tr.crm.productLists.loading}
        emptyMessage={tr.crm.productLists.empty}
      />

      {productListsQuery.data && productListsQuery.data.data.length > 0 && (
        <Pagination
          page={productListsQuery.data.meta.page}
          totalPages={productListsQuery.data.meta.totalPages}
          onPrevious={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}
    </AppShell>
  );
}
