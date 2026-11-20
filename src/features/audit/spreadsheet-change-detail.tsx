import { tr } from '../../i18n/tr';
import type { SpreadsheetChangeMeta } from './spreadsheet-change-meta';

function Swatch({ color }: { color: string | null }) {
  const t = tr.settings.audit.spreadsheetChanges;
  if (!color) return <span className="text-app-muted">{t.noColor}</span>;
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-block h-3.5 w-3.5 rounded border border-app-border"
        style={{ backgroundColor: color }}
      />
      <span className="font-mono text-xs">{color}</span>
    </span>
  );
}

function ColorChange({ from, to }: { from: string | null; to: string | null }) {
  if (from === to) return <span className="text-app-muted">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Swatch color={from} />
      <span className="text-app-muted">→</span>
      <Swatch color={to} />
    </span>
  );
}

function ValueCell({ value, changed }: { value: string | null; changed: boolean }) {
  const t = tr.settings.audit.spreadsheetChanges;
  return (
    <span className={changed ? 'text-app-text' : 'text-app-muted'}>
      {value ?? <span className="italic text-app-muted">{t.empty}</span>}
    </span>
  );
}

/** /settings?tab=audit'te bir e-tablo kaydinin hucre bazli degisiklik listesi. */
export function SpreadsheetChangeDetail({ meta }: { meta: SpreadsheetChangeMeta }) {
  const t = tr.settings.audit.spreadsheetChanges;
  const total = meta.changeCount ?? meta.changes.length;
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="text-app-text">
        <span className="font-semibold">{meta.spreadsheetName}</span>
        {meta.sheetName && (
          <span className="text-app-muted">
            {' · '}
            {t.sheet}: {meta.sheetName}
          </span>
        )}
        {meta.forced && <span className="ml-2 text-xs text-app-danger">({t.forced})</span>}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-app-border text-left text-xs text-app-muted">
              <th className="py-1.5 pr-3 font-medium">{t.cell}</th>
              <th className="py-1.5 pr-3 font-medium">{t.oldValue}</th>
              <th className="py-1.5 pr-3 font-medium">{t.newValue}</th>
              <th className="py-1.5 pr-3 font-medium">{t.bgColor}</th>
              <th className="py-1.5 font-medium">{t.fontColor}</th>
            </tr>
          </thead>
          <tbody>
            {meta.changes.map((change) => {
              const valueChanged = change.oldValue !== change.newValue;
              return (
                <tr key={change.cell} className="border-b border-app-border/50 align-top">
                  <td className="py-1.5 pr-3 font-mono text-xs font-semibold">{change.cell}</td>
                  <td className="max-w-60 py-1.5 pr-3 break-words">
                    <ValueCell value={change.oldValue} changed={valueChanged} />
                  </td>
                  <td className="max-w-60 py-1.5 pr-3 break-words">
                    <ValueCell value={change.newValue} changed={valueChanged} />
                  </td>
                  <td className="py-1.5 pr-3">
                    <ColorChange from={change.oldBgColor} to={change.newBgColor} />
                  </td>
                  <td className="py-1.5">
                    <ColorChange from={change.oldFontColor} to={change.newFontColor} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {meta.truncated && (
        <p className="text-xs text-app-muted">{t.truncated(meta.changes.length, total)}</p>
      )}
    </div>
  );
}
