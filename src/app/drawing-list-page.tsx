import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Table, type TableColumn } from '../components/ui/table';
import { useDrawingsQuery } from '../features/crm/use-drawings';
import type { Drawing } from '../lib/api';
import { tr } from '../i18n/tr';

export function DrawingListContent() {
  const navigate = useNavigate();
  const drawingsQuery = useDrawingsQuery();

  const columns: TableColumn<Drawing>[] = [
    {
      key: 'name',
      header: tr.crm.drawingTemplates.nameColumn,
      required: true,
      render: (d) => (
        <span className="flex items-center gap-2 font-semibold text-app-text">
          {d.name}
          <Badge variant={d.status === 'FINALIZED' ? 'success' : 'info'}>{d.status}</Badge>
        </span>
      ),
    },
    {
      key: 'panelGroupLabel',
      header: 'Pano/Hücre',
      className: 'text-app-muted',
      render: (d) => d.panelGroupLabel ?? '—',
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="text-sm text-app-muted">{tr.crm.drawings.create.subtitle}</p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/cizimler/pdf-ice-aktar')}
          >
            {tr.crm.drawingImports.title}
          </Button>
          <Button type="button" onClick={() => navigate('/cizimler/yeni')}>
            {tr.crm.drawings.create.title}
          </Button>
        </div>
      </div>

      <Table
        columns={columns}
        data={drawingsQuery.data ?? []}
        keyField={(drawing) => drawing.id}
        onRowClick={(drawing) => navigate(`/cizimler/${drawing.id}`)}
        isLoading={drawingsQuery.isPending}
        loadingMessage={tr.common.loading}
        emptyMessage={tr.crm.drawingTemplates.empty}
      />
    </>
  );
}
