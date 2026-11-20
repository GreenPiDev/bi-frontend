import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/modal';
import type { SpreadsheetConflict } from '../../lib/api';
import { tr } from '../../i18n/tr';
import type { CellContent } from './spreadsheet-model';

interface SpreadsheetConflictModalProps {
  conflicts: SpreadsheetConflict[];
  getMine: (row: number, col: number) => CellContent;
  isSaving: boolean;
  onTakeTheirs: () => void;
  onKeepMine: () => void;
  onClose: () => void;
}

function ValueWithColors({ content }: { content: CellContent }) {
  return (
    <span
      className="inline-block max-w-56 truncate rounded px-1.5 py-0.5 align-middle"
      style={{
        backgroundColor: content.bgColor ?? undefined,
        color: content.fontColor ?? undefined,
      }}
    >
      {content.value ?? tr.spreadsheets.conflict.emptyValue}
    </span>
  );
}

export function SpreadsheetConflictModal({
  conflicts,
  getMine,
  isSaving,
  onTakeTheirs,
  onKeepMine,
  onClose,
}: SpreadsheetConflictModalProps) {
  const t = tr.spreadsheets.conflict;
  return (
    <Modal
      title={t.title}
      subtitle={t.description}
      onClose={onClose}
      width="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" disabled={isSaving} onClick={onTakeTheirs}>
            {t.takeTheirs}
          </Button>
          <Button type="button" variant="danger" disabled={isSaving} onClick={onKeepMine}>
            {t.keepMine}
          </Button>
        </div>
      }
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-app-border text-left text-app-muted">
            <th className="py-2 pr-3 font-medium">{t.cellColumn}</th>
            <th className="py-2 pr-3 font-medium">{t.theirsColumn}</th>
            <th className="py-2 pr-3 font-medium">{t.byColumn}</th>
            <th className="py-2 font-medium">{t.mineColumn}</th>
          </tr>
        </thead>
        <tbody>
          {conflicts.map((conflict) => (
            <tr key={conflict.cell} className="border-b border-app-border/60">
              <td className="py-2 pr-3 font-mono text-xs font-semibold">{conflict.cell}</td>
              <td className="py-2 pr-3">
                <ValueWithColors content={conflict} />
              </td>
              <td className="py-2 pr-3 text-app-muted">{conflict.updatedByName}</td>
              <td className="py-2">
                <ValueWithColors content={getMine(conflict.row, conflict.col)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}
