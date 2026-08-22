import type { QueryResult } from '../../../lib/api';

const numberFormatter = new Intl.NumberFormat('tr-TR');

function formatCell(value: unknown, type: string): string {
  if (value === null || value === undefined) return '';
  if (type === 'NUMBER' && typeof value === 'number') return numberFormatter.format(value);
  return String(value);
}

export function TableWidget({ result }: { result: QueryResult }) {
  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-app-border text-xs uppercase text-app-muted">
          <tr>
            {result.columns.map((column) => (
              <th
                key={column.name}
                className={
                  column.type === 'NUMBER' ? 'px-3 py-2 text-right' : 'whitespace-nowrap px-3 py-2'
                }
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-app-border last:border-0">
              {row.map((value, cellIndex) => {
                const column = result.columns[cellIndex];
                return (
                  <td
                    key={cellIndex}
                    className={
                      column?.type === 'NUMBER'
                        ? 'whitespace-nowrap px-3 py-2 text-right text-app-text'
                        : 'whitespace-nowrap px-3 py-2 text-app-muted'
                    }
                  >
                    {formatCell(value, column?.type ?? 'STRING')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
