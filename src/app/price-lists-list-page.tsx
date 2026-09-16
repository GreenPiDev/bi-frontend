import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ColumnVisibilityPicker } from '../components/ui/column-visibility-picker';
import { PageHelp } from '../components/ui/page-help';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { useColumnVisibility } from '../features/auth/use-column-visibility';
import { useMeQuery } from '../features/auth/use-auth';
import { usePriceListsQuery } from '../features/crm/use-price-lists';
import type { PriceList } from '../lib/api';
import { tr } from '../i18n/tr';

const ALL_COLUMNS: TableColumn<PriceList>[] = [
  {
    key: 'name',
    header: tr.crm.priceLists.nameColumn,
    required: true,
    render: (p) => (
      <span className="flex items-center gap-2 font-semibold text-app-text">
        {p.name}
        {p.isDefault && <Badge variant="info">{tr.crm.priceLists.defaultBadge}</Badge>}
      </span>
    ),
  },
  {
    key: 'productList',
    header: tr.crm.priceLists.productListColumn,
    className: 'text-app-muted',
    render: (p) => p.productList.name,
  },
  {
    key: 'itemCount',
    header: tr.crm.priceLists.itemCountColumn,
    className: 'text-app-muted',
    render: (p) => p.items.length,
  },
];

export function PriceListsListContent() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const meQuery = useMeQuery();
  const pageSize = meQuery.data?.defaultPageSize ?? 25;
  const priceListsQuery = usePriceListsQuery({ page, pageSize });
  const { isColumnVisible, optionalColumns, visibleOptionalKeys, setVisibleOptionalKeys } =
    useColumnVisibility(
      'price-lists',
      ALL_COLUMNS.map((c) => ({ key: c.key, label: c.header, required: c.required })),
    );
  const columns = ALL_COLUMNS.filter((c) => isColumnVisible(c.key));

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">{tr.crm.priceLists.title}</h1>
            <PageHelp text={tr.help.priceLists} />
          </div>
          <p className="mt-1 text-sm text-app-muted">{tr.crm.priceLists.subtitle}</p>
        </div>
        <Button type="button" onClick={() => navigate('/fiyat-listeleri/yeni')}>
          {tr.crm.priceLists.newButton}
        </Button>
      </div>

      <div className="mt-4 flex justify-end">
        <ColumnVisibilityPicker
          columns={optionalColumns}
          value={visibleOptionalKeys}
          onChange={setVisibleOptionalKeys}
        />
      </div>

      <Table
        columns={columns}
        data={priceListsQuery.data?.data ?? []}
        keyField={(priceList) => priceList.id}
        onRowClick={(priceList) => navigate(`/fiyat-listeleri/${priceList.id}/duzenle`)}
        isLoading={priceListsQuery.isPending}
        loadingMessage={tr.crm.priceLists.loading}
        emptyMessage={tr.crm.priceLists.empty}
      />

      {priceListsQuery.data && priceListsQuery.data.data.length > 0 && (
        <Pagination
          page={priceListsQuery.data.meta.page}
          totalPages={priceListsQuery.data.meta.totalPages}
          onPrevious={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}
    </>
  );
}

export function PriceListsListPage() {
  return (
    <AppShell>
      <PriceListsListContent />
    </AppShell>
  );
}
