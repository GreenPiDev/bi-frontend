import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from './app-shell';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { PageHelp } from '../components/ui/page-help';
import { Pagination, Table, type TableColumn } from '../components/ui/table';
import { usePriceListsQuery } from '../features/crm/use-price-lists';
import type { PriceList } from '../lib/api';
import { tr } from '../i18n/tr';

const columns: TableColumn<PriceList>[] = [
  {
    key: 'name',
    header: tr.crm.priceLists.nameColumn,
    render: (p) => (
      <span className="flex items-center gap-2 font-semibold text-app-text">
        {p.name}
        {p.isDefault && <Badge variant="info">{tr.crm.priceLists.defaultBadge}</Badge>}
      </span>
    ),
  },
  {
    key: 'itemCount',
    header: tr.crm.priceLists.itemCountColumn,
    className: 'text-app-muted',
    render: (p) => p.items.length,
  },
];

export function PriceListsListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const priceListsQuery = usePriceListsQuery({ page });

  return (
    <AppShell>
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
    </AppShell>
  );
}
