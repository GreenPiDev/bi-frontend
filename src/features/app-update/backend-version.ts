/** Oturum boyunca ilk gorulen backend surumu ile sonraki yanitlardakini karsilastirir. */
let firstSeen: string | null = null;
let changed = false;
const listeners = new Set<() => void>();

export function noteBackendVersion(version: string | null): void {
  if (!version || changed) return;
  if (firstSeen === null) {
    firstSeen = version;
    return;
  }
  if (version !== firstSeen) {
    changed = true;
    listeners.forEach((l) => l());
  }
}

export function hasBackendChanged(): boolean {
  return changed;
}

export function subscribeBackendVersion(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
