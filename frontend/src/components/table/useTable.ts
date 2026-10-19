import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useCallback, useMemo } from 'react';

// ── Params ────────────────────────────────────────────────────────────────

interface UseTableParams<TData> {
  data: TData[];
  columns: any[];
  totalCount?: number;
  pageIndex: number;
  pageSize: number;
  sortField: string;
  sortOrder: 'asc' | 'desc';
  setPage: (page: number) => void;
  setSize: (size: number) => void;
  setSort: (field: string, order?: 'asc' | 'desc') => void;
  defaultSortField?: string;
  /** Optional: search query for global column-based filtering. */
  searchQuery?: string;
  /** Optional: columns that participate in global search (by meta.search). */
  searchableColumnIds?: string[];
}

const defaultInitialPagination = { pageIndex: 0, pageSize: 20 };

const defaultRowModels = {
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
};

// ── Hook ──────────────────────────────────────────────────────────────────

/**
 * useTable – Convention-over-configuration wrapper around useReactTable.
 *
 * Internally used by the Table compound component. No external state/actions
 * pattern – URL state setters are called directly on pagination/sorting changes.
 */
export function useTable<TData>({
  data,
  columns,
  totalCount,
  pageIndex,
  pageSize,
  sortField,
  sortOrder,
  setPage,
  setSize,
  setSort,
  defaultSortField = '',
  searchQuery = '',
  searchableColumnIds = [],
}: UseTableParams<TData>) {
  const isServerSide = totalCount !== undefined && totalCount > data.length;
  const effectiveTotalCount = totalCount ?? data.length;

  const onPaginationChange = useCallback(
    (updater: any) => {
      if (typeof updater === 'function') {
        const next = updater({ pageIndex, pageSize });
        if (next.pageSize !== pageSize) {
          setSize(next.pageSize);
          setPage(0);
        } else if (next.pageIndex !== pageIndex) {
          setPage(next.pageIndex);
        }
      }
    },
    [pageIndex, pageSize, setPage, setSize],
  );

  const onSortingChange = useCallback(
    (updater: any) => {
      const currentSort = sortField ? [{ id: sortField, desc: sortOrder === 'desc' }] : [];
      const next =
        typeof updater === 'function'
          ? updater(currentSort)
          : updater;
      if (next.length > 0) {
        const newSort = next[0].id;
        const newOrder = next[0].desc ? 'desc' : 'asc';
        setSort(newSort, newOrder);
        setPage(0);
      } else {
        // Toggle to opposite direction instead of clearing
        const newOrder = sortOrder === 'desc' ? 'asc' : 'desc';
        setSort(sortField || defaultSortField, newOrder);
        setPage(0);
      }
    },
    [sortField, sortOrder, setSort, setPage, defaultSortField],
  );

  const initialState = useMemo(
    () => ({
      pagination: { ...defaultInitialPagination },
    }),
    [],
  );

  return useReactTable<any>({
    data,
    columns,
    ...defaultRowModels,
    enableRowSelection: true,
    autoResetPageIndex: false,
    getRowId: (row) => {
      const id = (row as Record<string, unknown>).id;
      return id != null ? String(id) : '';
    },
    initialState,
    manualPagination: isServerSide,
    manualFiltering: isServerSide,
    manualSorting: isServerSide,
    pageCount: Math.max(1, Math.ceil(effectiveTotalCount / pageSize)),
    state: {
      pagination: { pageIndex, pageSize },
      sorting: sortField ? [{ id: sortField, desc: sortOrder === 'desc' }] : [],
      ...(isServerSide ? {} : { globalFilter: searchQuery }),
    },
    onPaginationChange,
    onSortingChange,
    ...(isServerSide
      ? {}
      : {
          globalFilterFn: (row: any, _columnId: string, filterValue: string) => {
            if (!filterValue || !searchableColumnIds.length) return true;
            const searchLower = filterValue.toLowerCase();
            return searchableColumnIds.some((colId) => {
              const value = row.getValue(colId);
              return value != null && String(value).toLowerCase().includes(searchLower);
            });
          },
        }),
  });
}
