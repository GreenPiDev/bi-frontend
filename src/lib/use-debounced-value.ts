import { useEffect, useState } from 'react';

/** Bir değerin son değişiminden belirli bir süre sonra güncellenen kopyasını döner -
 * canlı arama kutularında her tuş vuruşunda istek atılmasını önlemek için. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}
