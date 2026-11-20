import { Baseline, PaintBucket } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { tr } from '../../i18n/tr';
import { ColorPaletteButton } from './color-palette-button';
import type { CellContent } from './spreadsheet-model';

interface SpreadsheetToolbarProps {
  canEdit: boolean;
  selectionLabel: string;
  activeCell: CellContent;
  pendingCount: number;
  isSaving: boolean;
  onBgColor: (color: string | null) => void;
  onFontColor: (color: string | null) => void;
  onSave: () => void;
  onDiscard: () => void;
}

export function SpreadsheetToolbar({
  canEdit,
  selectionLabel,
  activeCell,
  pendingCount,
  isSaving,
  onBgColor,
  onFontColor,
  onSave,
  onDiscard,
}: SpreadsheetToolbarProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {canEdit && (
          <>
            <ColorPaletteButton
              icon={PaintBucket}
              label={tr.spreadsheets.toolbar.bgColor}
              currentColor={activeCell.bgColor}
              onSelect={onBgColor}
            />
            <ColorPaletteButton
              icon={Baseline}
              label={tr.spreadsheets.toolbar.fontColor}
              currentColor={activeCell.fontColor}
              onSelect={onFontColor}
            />
            <span className="mx-1 h-6 w-px bg-app-border" />
          </>
        )}
        <span className="text-sm text-app-muted">{selectionLabel}</span>
        {canEdit && (
          <div className="ml-auto flex items-center gap-2">
            <span
              className={
                pendingCount > 0 ? 'text-sm font-semibold text-amber-600' : 'text-sm text-app-muted'
              }
            >
              {pendingCount > 0
                ? tr.spreadsheets.toolbar.pendingCount(pendingCount)
                : tr.spreadsheets.toolbar.noPending}
            </span>
            <Button
              type="button"
              variant="secondary"
              disabled={pendingCount === 0 || isSaving}
              onClick={onDiscard}
            >
              {tr.spreadsheets.toolbar.discard}
            </Button>
            <Button type="button" disabled={pendingCount === 0 || isSaving} onClick={onSave}>
              {isSaving ? tr.spreadsheets.toolbar.saving : tr.spreadsheets.toolbar.save}
            </Button>
          </div>
        )}
      </div>
      <div className="flex min-h-9 items-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-1.5 text-sm">
        <span className="font-mono text-xs font-semibold text-app-muted">fx</span>
        <span className="truncate text-app-text">{activeCell.value ?? ''}</span>
      </div>
      {canEdit && <p className="text-xs text-app-muted">{tr.spreadsheets.toolbar.editHint}</p>}
    </div>
  );
}
