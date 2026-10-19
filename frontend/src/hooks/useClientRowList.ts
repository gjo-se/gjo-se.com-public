/**
 * useClientRowList – generic loader for client-side tables backed by a full
 * collection fetch.
 *
 * Owns the shared lifecycle (loading/error/search/reload) and derives the
 * filtered rows via a caller-supplied predicate. Feature hooks stay thin: they
 * pass a fetch function, a raw→row mapper and a row predicate, then wire their
 * create/edit/delete actions on top of the returned ``reload``.
 *
 * `fetchRows`, `mapRow` and `filterRow` MUST be stable (module-level functions
 * or `useCallback`) so `reload` and the filtered rows keep a stable identity.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

/** Configuration for {@link useClientRowList}. */
export interface UseClientRowListConfig<T, R> {
  /** Fetches the full raw collection from the API. */
  fetchRows: () => Promise<R[]>;
  /** Maps one raw API item to the client-side row shape. */
  mapRow: (raw: R) => T;
  /** Client-side predicate; `query` is already trimmed + lower-cased. */
  filterRow: (row: T, query: string) => boolean;
}

/** Result of {@link useClientRowList}. */
export interface UseClientRowListResult<T> {
  /** Filtered rows (active search applied). */
  rows: T[];
  /** Total row count (unfiltered). */
  totalCount: number;
  search: string;
  setSearch: (value: string) => void;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/** Loads a full collection once and exposes client-side search + reload. */
export function useClientRowList<T, R>({
  fetchRows,
  mapRow,
  filterRow,
}: UseClientRowListConfig<T, R>): UseClientRowListResult<T> {
  const [allRows, setAllRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await fetchRows();
      setAllRows(raw.map(mapRow));
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, [fetchRows, mapRow]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter((row) => filterRow(row, q));
  }, [allRows, search, filterRow]);

  return {
    rows,
    totalCount: allRows.length,
    search,
    setSearch,
    loading,
    error,
    reload,
  };
}
