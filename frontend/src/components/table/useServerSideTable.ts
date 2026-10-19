/**
 * useServerSideTable – Hook for server-side paginated tables.
 *
 * Owns URL state (q, page, size, sort, order), data/loading/error state,
 * and provides executeLoad and handleSearchChange.
 *
 * Used by feature hooks (useAdminProjects, useFreelancermapTable, etc.)
 * which add business logic and return a TableStateProps to the Table compound.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { feTrace } from '@src/lib/trace';
import { withAsyncState } from '@src/lib/withAsyncState';

import { useTableUrlState } from './useTableUrlState';

import type { TableStateProps } from './TableState.interface';
import type { TableExtraParams, TableParamRegistry } from './useTableUrlState';

export interface UseServerSideTableConfig {
  tableKey: string
  defaultSort?: string
  defaultOrder?: string
  debounceMs?: number
  /** Additional table-specific URL params (e.g. job_role_id), owned via the registry. */
  extraParams?: TableParamRegistry
  /** Called after debounce (or immediately if debounceMs=0). Receives the search value. */
  onSearch?: (value: string) => void
  /** Called once on mount for initial data loading. */
  onLoad?: () => void
}

export interface UseServerSideTableReturn<T> extends TableStateProps<T> {
  loading: boolean
  error: string | null
  executeLoad: (fetchFn: () => Promise<{ data: T[]; total: number }>) => Promise<void>
  defaultSort: string
  defaultOrder: string
  debounceMs: number
  /** Current values of the registry-defined extra params. */
  params: TableExtraParams
  /** Updates a single registry-defined extra param. */
  setParam: (name: string, value: unknown) => void
}

/**
 * Hook for server-side paginated tables.
 *
 * Manages URL state (q, page, size, sort, order) and data state
 * (data, total, loading, error). Provides executeLoad which handles
 * the standard loading → try/catch/finally → setData/setTotal pattern.
 *
 * Returns TableStateProps<T> so consumers can pass it directly to <Table table={...} />.
 */
export function useServerSideTable<T>(config: UseServerSideTableConfig): UseServerSideTableReturn<T> {
  const {
    tableKey,
    defaultSort = '',
    defaultOrder = 'desc',
    debounceMs = 400,
    extraParams,
    onSearch,
    onLoad,
  } = config;

  // ── URL state ─────────────────────────────────────────────────────────
  const {
    q, page, size, sort, order, params,
    setQ, setPage, setSize, setSort, setParam, resetUrlState,
  } = useTableUrlState(tableKey, extraParams);

  // ── Data state ────────────────────────────────────────────────────────
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Refs ──────────────────────────────────────────────────────────────
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initRef = useRef(false);

  // Keep onSearch ref to avoid stale closures in debounce timer
  const onSearchRef = useRef(onSearch);
  useEffect(() => { onSearchRef.current = onSearch; });

  // Keep onLoad ref to avoid stale closures in init effect
  const onLoadRef = useRef(onLoad);
  useEffect(() => { onLoadRef.current = onLoad; });

  // Stable params key – avoids effect re-fire when object reference changes
  // but values are identical (React Router may create new URLSearchParams)
  const paramsKey = JSON.stringify(params);

  // ── Load helper ───────────────────────────────────────────────────────
  const executeLoad = useCallback(async (
    fetchFn: () => Promise<{ data: T[]; total: number }>,
  ) => {
    feTrace.time('table_fetch');
    const result = await withAsyncState(setLoading, setError, fetchFn);
    feTrace.timeEnd('table_fetch', result ? { rows: result.data.length, total: result.total } : { error: 'fetch_failed' });
    if (result) {
      setData(result.data);
      setTotal(result.total);
    }
  }, []);

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

  // Load on mount + reload on URL state changes (sort, page, size, q, filter params)
  useEffect(() => {
    const loadFn = onLoadRef.current;
    if (!loadFn) return;
    if (!initRef.current) {
      initRef.current = true;
      loadFn();
      return;
    }
    // Subsequent URL state changes (triggered by Table compound actions,
    // cross-instance tablestatechange event, or filter dropdowns) also reload data.
    loadFn();
  }, [q, page, size, sort, order, paramsKey]);

  return {
    data,
    total,
    q,
    page,
    size,
    sort,
    order,
    tableKey,
    setQ,
    setPage,
    setSize,
    setSort,
    handleSearchChange,
    resetUrlState,
    loading,
    error,
    executeLoad,
    defaultSort,
    defaultOrder,
    debounceMs,
    params,
    setParam,
  };
}
