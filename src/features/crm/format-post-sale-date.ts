const dateFormat = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatPostSaleDate(value: string | null): string {
  return value ? dateFormat.format(new Date(value)) : '—';
}
