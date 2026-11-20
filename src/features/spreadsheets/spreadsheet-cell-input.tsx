import { ROW_HEIGHT } from './spreadsheet-grid-cell';
import { columnLetter } from './spreadsheet-model';

interface SpreadsheetCellInputProps {
  row: number;
  col: number;
  text: string;
  left: number;
  width: number;
  onChange: (text: string) => void;
  /** commit=false -> Escape (vazgec); move = [satir, sutun] kaydirma. */
  onFinish: (commit: boolean, move?: [number, number]) => void;
}

/** Duzenlenen hucrenin uzerine acilan metin kutusu. */
export function SpreadsheetCellInput({
  row,
  col,
  text,
  left,
  width,
  onChange,
  onFinish,
}: SpreadsheetCellInputProps) {
  return (
    <input
      autoFocus
      aria-label={`${columnLetter(col)}${row + 1}`}
      value={text}
      onChange={(event) => onChange(event.target.value)}
      onBlur={() => onFinish(true)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          onFinish(true, [1, 0]);
        } else if (event.key === 'Tab') {
          event.preventDefault();
          onFinish(true, [0, event.shiftKey ? -1 : 1]);
        } else if (event.key === 'Escape') {
          event.preventDefault();
          onFinish(false);
        }
      }}
      className="absolute z-10 border-2 border-app-brand bg-white px-1.5 text-sm text-app-text shadow-lg outline-none"
      style={{
        top: row * ROW_HEIGHT - 1,
        left: left - 1,
        minWidth: width + 1,
        height: ROW_HEIGHT + 1,
      }}
    />
  );
}
