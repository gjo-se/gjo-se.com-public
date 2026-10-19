import { useCallback, useEffect, useRef, useState } from 'react';

import { withAsyncState } from '@src/lib/withAsyncState';

import { useTableUrlState } from './useTableUrlState';

import type { TableStateProps } from './TableState.interface';

export interface UseClientSideTableConfig<T> {
  /** Unique key for useTableUrlState. */
  tableKey: string
  /** Load ALL rows (no pagination params). Called on mount and on reload. */
  loadFn: () => Promise<T[]>
  /** Client-side filter by search query. */
  filterFn: (rows: T[], q: string) => T[]
  /** Client-side sort by field + order. */
  sortFn: (rows: T[], field: string, order: string) => T[]
  defaultSort?: string
  defaultOrder?: string
  debounceMs?: number
  /** Called after debounce when search value changes. */
  onSearch?: (value: string) => void
  /** Auto-load data on mount. Default: true. */
  autoLoad?: boolean
}

export interface UseClientSideTableReturn<T> extends TableStateProps<T> {
  /** All loaded rows (before filtering). */
  allData: T[]
  loading: boolean
  error: string | null
  /** Reload all data from loadFn. */
  reload: () => Promise<void>
  defaultSort: string
  defaultOrder: string
}

/**
 * Client-side table hook – loads all data, filters/sorts/paginates in memory.
 * Same handleSearchChange signature as useServerSideTable.
 *
 * @example
 * const { handleSearchChange, ...table } = useClientSideTable<JobRole>({
 *   tableKey: 'admin-jobroles',
 *   loadFn: fetchAllJobRoles,
 *   filterFn: (rows, q) => rows.filter(r => r.name.includes(q)),
 *   sortFn: (rows, field, order) => [...rows].sort(...),
 * });
 */
export function useClientSideTable<T>(config: UseClientSideTableConfig<T>): UseClientSideTableReturn<T> {
  const {
    tableKey,
    loadFn,
    filterFn,
    sortFn,
    defaultSort = '',
    defaultOrder = 'desc',
    debounceMs = 400,
    onSearch,
    autoLoad = true,
  } = config;

  const effectiveKey = tableKey ?? window.location.pathname;

  const { q, page, size, sort, order, setQ, setPage, setSize, setSort, resetUrlState } =
    useTableUrlState(tableKey);

  const [allRows, setAllRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearchRef = useRef(onSearch);
  useEffect(() => { onSearchRef.current = onSearch; });

  // ── Load all data ────────────────────────────────────────────────────
  const reload = useCallback(async () => {
    const data = await withAsyncState(setLoading, setError, loadFn);
    if (data) setAllRows(data);
  }, [loadFn]);

  // Keep reloadRef in sync to avoid stale closures and satisfy
  // react-hooks/set-state-in-effect (linter cannot trace through refs).
  const reloadRef = useRef(reload);
  useEffect(() => { reloadRef.current = reload; });

  // Auto-load on mount (initRef prevents double-call in StrictMode)
  const initRef = useRef(false);
  useEffect(() => {
    if (!autoLoad || initRef.current) return;
    initRef.current = true;
    reloadRef.current();
  }, [autoLoad]);

  // ── Client-side filter → sort → paginate ────────────────────────────
  const filteredRows = filterFn(allRows, q);
  const sortField = sort || defaultSort || '';
  const sortedRows = sortFn(filteredRows, sortField, order);
  const start = page * size;
  const data = sortedRows.slice(start, start + size);
  const total = filteredRows.length;

  // ── Standard search handler ──────────────────────────────────────────
  const handleSearchChange = useCallback((value: string) => {
    setQ(value);
    setPage(0);

    const callback = onSearchRef.current;
    if (callback) {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        callback(value);
      }, debounceMs);
    }
  }, [setQ, setPage, debounceMs]);

  return {
    allData: allRows,
    data,
    total,
    tableKey: effectiveKey,
    q,
    page,
    size,
    sort,
    order,
    setQ,
    setPage,
    setSize,
    setSort,
    resetUrlState,
    handleSearchChange,
    loading,
    error,
    reload,
    defaultSort,
    defaultOrder,
  };
}
