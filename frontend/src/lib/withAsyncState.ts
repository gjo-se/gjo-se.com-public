/**
 * withAsyncState – Eliminiert den Loading/Error-Boilerplate bei async Operationen.
 *
 * Setzt `setLoading(true)`, ruft `fn()` auf, fängt Fehler mit `setError(msg)` ab
 * und setzt `setLoading(false)` im `finally`-Block zurück.
 *
 * @returns Das Ergebnis von `fn()` oder `undefined` bei Fehler.
 */
export async function withAsyncState<T>(
  setLoading: (v: boolean) => void,
  setError: (msg: string | null) => void,
  fn: () => Promise<T>,
  errorMsg = 'Fehler beim Laden der Daten.',
): Promise<T | undefined> {
  setLoading(true);
  setError(null);
  try {
    return await fn();
  } catch {
    setError(errorMsg);
    return undefined;
  } finally {
    setLoading(false);
  }
}
