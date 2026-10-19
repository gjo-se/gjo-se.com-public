/**
 * useAdminSearchTerms – Data-loading hook for SearchTerm CRUD.
 *
 * Fetches all search terms once and exposes columns, rowActions, and
 * action handlers for the Table compound component.
 * Search, sort, and pagination are handled by the Table component itself.
 */

import { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import StatusCell from '@src/components/atoms/StatusCell/StatusCell';
import StatusFilter from '@src/components/molecules/StatusFilter/StatusFilter';
import type { TableColumnProps, TableRowActionsProps, TableStateProps } from '@src/components/table';
import { buildTableState } from '@src/components/table/buildTableState';
import { useClientTableState } from '@src/components/table/useClientTableState';
import { useTableActions } from '@src/components/table/useTableActions';
import {
  createSearchTerm,
  deleteSearchTerm,
  fetchAllSearchTerms,
  type SearchTerm,
} from '@src/lib/api/searchTerms';

import { requireGhostName } from '../../utils/curation';
import { adminSearchTermsColumns } from '../components/admin-search-terms-data-table/AdminSearchTermsColumns';

export interface UseAdminSearchTermsResult {
  table: TableStateProps<SearchTerm>
  columns: Record<string, TableColumnProps>
  rowActions: TableRowActionsProps<SearchTerm>[]
  loading: boolean
  error: string | null
  handleCreate: (name: string) => Promise<{ error?: string }>
  /** Ghost row callback: receives column-key→value map, returns created entity. */
  onGhostCreate: (data: Record<string, unknown>) => Promise<unknown>
}

/** Loads all search terms once and provides CRUD handlers + column definitions
 *  for the Table compound component. */
export function useAdminSearchTerms(): UseAdminSearchTermsResult {
  const TABLE_KEY = 'admin-searchterms';
  const {
    q,
    page,
    size,
    sort,
    order,
    setQ,
    setPage,
    setSize,
    setSort,
    handleSearchChange,
    resetUrlState,
  } = useClientTableState(TABLE_KEY);

  const [data, setData] = useState<SearchTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  // ── Data loading ──────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const terms = await fetchAllSearchTerms();
      setData(terms);
    } catch {
      setError('Fehler beim Laden der Suchbegriffe.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load on mount (initRef prevents double-call in StrictMode)
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    void load();
  }, [load]);

  // ── Client-side status filtering ──────────────────────────────────────
  const filteredData = useMemo(() => {
    if (!statusFilter) return data;
    return data.filter((term) => term.status === statusFilter);
  }, [data, statusFilter]);

  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value);
    setPage(0);
  }, [setPage]);

  // ── CRUD handlers ─────────────────────────────────────────────────────
  const handleCreate = useCallback(
    async (name: string): Promise<{ error?: string }> => {
      try {
        await createSearchTerm({ name });
        await load();
        return {};
      } catch {
        return { error: 'Fehler beim Anlegen.' };
      }
    },
    [load],
  );

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await deleteSearchTerm(id);
        await load();
      } catch { /* ignore */ }
    },
    [load],
  );

  // ── Ghost Row create (Cmd+Enter → Enter) ────────────────────────────────
  const onGhostCreate = useCallback(
    async (data: Record<string, unknown>): Promise<unknown> => {
      const name = requireGhostName(data);
      await createSearchTerm({ name });
      await load();
      return { name };
    },
    [load],
  );

  // ── Row actions (for Table compound) ──────────────────────────────────
  const rowActions = useTableActions<SearchTerm>({
    onDelete: async (row) => {
      await handleDelete(row.id);
    },
    deleteDisabled: (row) => row.reference_count > 0,
    deleteDisabledTitle: 'Wird von Freelancermap-Einträgen verwendet – nicht löschbar',
  });

  // ── Columns (static + status cell) ────────────────────────────────────
  const columns: Record<string, TableColumnProps> = {
    ...adminSearchTermsColumns,
    name: {
      ...adminSearchTermsColumns.name,
      filter: () => createElement(StatusFilter, {
        statusableType: 'fbf_search_term',
        selectedValue: statusFilter,
        onSelect: handleStatusFilterChange,
      }),
    },
    status: {
      label: 'Status',
      width: '60px',
      sortable: false,
      renderCell: (row) => {
        const term = data.find((t) => t.id === row.id);
        if (!term) return null;
        return createElement(StatusCell, {
          statusableType: 'fbf_search_term',
          statusableId: term.id,
          currentStatus: term.status,
          currentColor: term.status_color_token,
        });
      },
    },
  };

  return {
    table: buildTableState({
      data: filteredData,
      total: filteredData.length,
      q, page, size,
      sort, order, tableKey: TABLE_KEY,
      setQ, setPage, setSize, setSort,
      handleSearchChange, resetUrlState,
    }),
    columns,
    rowActions,
    loading,
    error,
    handleCreate,
    onGhostCreate,
  };
}
