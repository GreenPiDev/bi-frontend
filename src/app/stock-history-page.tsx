import { ListFilter } from 'lucide-react';
import { useState } from 'react';
import { AppShell } from './app-shell';
import { Button } from '../components/ui/button';
import { CircleIconButton } from '../components/ui/circle-icon-button';
import { Drawer } from '../components/ui/drawer';
import { Modal } from '../components/ui/modal';
import { PageHelp } from '../components/ui/page-help';
import { Select } from '../components/ui/select';
import { Table, type TableColumn } from '../components/ui/table';
import { ProductAutocomplete } from '../features/crm/product-autocomplete';
import { useUsersQuery } from '../features/roles/use-users';
import { useStockHistoryQuery } from '../features/crm/use-stock-items';
import type { StockMovement } from '../lib/api';
import { tr } from '../i18n/tr';

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const NOTE_TRUNCATE_LENGTH = 40;

function NoteCell({ row, onOpen }: { row: StockMovement; onOpen: (row: StockMovement) => void }) {
  if (!row.note) return <>—</>;
  if (row.note.length <= NOTE_TRUNCATE_LENGTH) return <>{row.note}</>;
  return (
    <button
      type="button"
      className="cursor-pointer text-left text-app-text hover:text-blue-600"
      onClick={() => onOpen(row)}
    >
      {`${row.note.slice(0, NOTE_TRUNCATE_LENGTH)}...`}
    </button>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta > 0) {
    return <span className="text-xs font-semibold text-app-success">{`+${delta}`}</span>;
  }
  if (delta < 0) {
    return <span className="text-xs font-semibold text-app-danger">{delta}</span>;
  }
  return <span className="text-xs font-semibold text-app-muted">0</span>;
}

export function StockHistoryContent() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [productId, setProductId] = useState<string | undefined>(undefined);
  const [userId, setUserId] = useState('');
  const [noteModalRow, setNoteModalRow] = useState<StockMovement | null>(null);
  const usersQuery = useUsersQuery();
  const historyQuery = useStockHistoryQuery({
    productId: productId || undefined,
    userId: userId || undefined,
  });
  const hasActiveFilter = Boolean(productId) || Boolean(userId);

  function resetFilters() {
    setProductId(undefined);
    setUserId('');
  }

  const columns: TableColumn<StockMovement>[] = [
    {
      key: 'product',
      header: tr.crm.stock.history.productColumn,
      className: 'font-semibold text-app-text',
      required: true,
      render: (row) => row.productName,
    },
    {
      key: 'user',
      header: tr.crm.stock.history.userColumn,
      className: 'whitespace-nowrap',
      required: true,
      render: (row) => row.userName,
    },
    {
      key: 'note',
      header: tr.crm.stock.history.noteColumn,
      className: 'max-w-xs text-app-muted',
      render: (row) => <NoteCell row={row} onOpen={setNoteModalRow} />,
    },
    {
      key: 'previousQuantity',
      header: tr.crm.stock.history.previousQuantityColumn,
      className: 'whitespace-nowrap text-app-muted',
      render: (row) => row.previousQuantity,
    },
    {
      key: 'delta',
      header: tr.crm.stock.history.deltaColumn,
      className: 'whitespace-nowrap',
      required: true,
      render: (row) => <DeltaBadge delta={row.delta} />,
    },
    {
      key: 'quantity',
      header: tr.crm.stock.history.quantityColumn,
      className: 'whitespace-nowrap font-semibold text-app-text',
      required: true,
      render: (row) => row.quantity,
    },
    {
      key: 'createdAt',
      header: tr.crm.stock.history.dateColumn,
      className: 'whitespace-nowrap text-app-muted',
      render: (row) => dateFormatter.format(new Date(row.createdAt)),
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">{tr.crm.stock.history.title}</h1>
            <PageHelp text={tr.help.stockHistory} />
          </div>
          <p className="mt-1 text-sm text-app-muted">{tr.crm.stock.history.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <CircleIconButton
            icon={ListFilter}
            tooltip={tr.crm.stock.history.filterButton}
            onClick={() => setDrawerOpen(true)}
          >
            {hasActiveFilter && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-app-surface" />
            )}
          </CircleIconButton>
        </div>
      </div>

      <div className="mt-6">
        <Table
          columns={columns}
          data={historyQuery.data ?? []}
          keyField={(row) => row.id}
          isLoading={historyQuery.isPending}
          loadingMessage={tr.crm.stock.history.loading}
          emptyMessage={tr.crm.stock.history.empty}
        />
      </div>

      {drawerOpen && (
        <Drawer
          title={tr.crm.stock.history.filterDrawer.title}
          onClose={() => setDrawerOpen(false)}
        >
          <div className="flex flex-col gap-4">
            <ProductAutocomplete
              label={tr.crm.stock.history.filterDrawer.productLabel}
              placeholder={tr.crm.stock.history.filterDrawer.productPlaceholder}
              value={productId}
              onChange={setProductId}
              clearable
            />
            <Select
              label={tr.crm.stock.history.filterDrawer.userLabel}
              placeholder={tr.crm.stock.history.filterDrawer.userPlaceholder}
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              options={(usersQuery.data ?? []).map((u) => ({ value: u.id, label: u.name }))}
              clearable
              onClear={() => setUserId('')}
            />
            <Button type="button" variant="secondary" onClick={resetFilters}>
              {tr.crm.stock.history.filterDrawer.reset}
            </Button>
          </div>
        </Drawer>
      )}

      {noteModalRow && (
        <Modal title={tr.crm.stock.history.noteModal.title} onClose={() => setNoteModalRow(null)}>
          <div className="flex flex-col gap-3 text-sm">
            <div>
              <div className="text-xs font-semibold text-app-muted">
                {tr.crm.stock.history.noteModal.noteLabel}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-app-text">{noteModalRow.note}</p>
            </div>
            <dl className="grid grid-cols-2 gap-3 border-t border-app-border pt-3">
              <div>
                <dt className="text-xs font-semibold text-app-muted">
                  {tr.crm.stock.history.noteModal.productLabel}
                </dt>
                <dd className="text-app-text">{noteModalRow.productName}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-app-muted">
                  {tr.crm.stock.history.noteModal.userLabel}
                </dt>
                <dd className="text-app-text">{noteModalRow.userName}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-app-muted">
                  {tr.crm.stock.history.noteModal.previousQuantityLabel}
                </dt>
                <dd className="text-app-text">{noteModalRow.previousQuantity}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-app-muted">
                  {tr.crm.stock.history.noteModal.quantityLabel}
                </dt>
                <dd className="text-app-text">{noteModalRow.quantity}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-app-muted">
                  {tr.crm.stock.history.noteModal.deltaLabel}
                </dt>
                <dd>
                  <DeltaBadge delta={noteModalRow.delta} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-app-muted">
                  {tr.crm.stock.history.noteModal.dateLabel}
                </dt>
                <dd className="text-app-text">
                  {dateFormatter.format(new Date(noteModalRow.createdAt))}
                </dd>
              </div>
            </dl>
          </div>
        </Modal>
      )}
    </>
  );
}

export function StockHistoryPage() {
  return (
    <AppShell>
      <StockHistoryContent />
    </AppShell>
  );
}
