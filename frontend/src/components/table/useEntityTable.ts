/**
 * useEntityTable – generischer server-seitiger Tabellen-Hook für CRUD-Listen
 * (CRM Companies/Persons, …).
 *
 * Kapselt die wiederkehrende Verdrahtung aus `features/* /hooks/use*Table.ts`:
 * URL-synchronisierter State (`useServerSideTable`), serverseitiges
 * Paging/Sortieren über eine Sort-Feld-Map, `loadRef`-Stabilität, `reload`,
 * Ghost-Row-Create, Delete, Edit-Navigation und den optionalen Status-Filter
 * (`StatusFilter` + `StatusCell`). Feature-Hooks liefern nur noch Fetch-/CRUD-
 * Funktionen, Columns und Defaults.
 */

import { createElement, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import StatusCell from '@src/components/atoms/StatusCell/StatusCell';
import StatusFilter from '@src/components/molecules/StatusFilter/StatusFilter';
import type { TableColumnProps, TableRowActionsProps, TableStateProps } from '@src/components/table';
import { buildTableState } from '@src/components/table/buildTableState';
import { useServerSideTable } from '@src/components/table/useServerSideTable';
import { useTableActions } from '@src/components/table/useTableActions';
import { syncActiveIdToUrl } from '@src/components/table/useTableUrlState';

// ── Types ────────────────────────────────────────────────────────────────

/** Minimal shape required from every row. */
export interface EntityRow {
  id: number;
}

export interface UseEntityTableConfig<T extends EntityRow> {
  /** URL-state key for the table. */
  tableKey: string;
  /** Default sort field (frontend key). */
  defaultSort: string;
  /** Default sort order (defaults to `asc`). */
  defaultOrder?: string;
  /** Frontend column key → backend sort field mapping. */
  sortFieldMap: Record<string, string>;
  /** Loads one page (server-side). */
  fetchList: (params: {
    q?: string;
    offset: number;
    limit: number;
    sort_by: string;
    sort_order: string;
  }) => Promise<T[]>;
  /** Loads the total count for the current search. */
  fetchCount: (params: { q?: string }) => Promise<number>;
  /** Creates an entity from the ghost row payload (validation included). */
  create: (ghostData: Record<string, unknown>) => Promise<unknown>;
  /** Deletes a row. */
  remove: (row: T) => Promise<unknown>;
  /** Builds the base column definitions. */
  buildColumns: () => Record<string, TableColumnProps>;
  /** Optional status filter + status column. */
  status?: { statusableType: string; filterColumn: string };
  /** Detail route used by the edit row action. */
  detailPath: (row: T) => string;
  /** Disables delete for a row. */
  deleteDisabled: (row: T) => boolean;
  /** Tooltip shown when delete is disabled. */
  deleteDisabledTitle: string;
}

export interface UseEntityTableResult<T extends EntityRow> {
  columns: Record<string, TableColumnProps>;
  error: string | null;
  loading: boolean;
  onGhostCreate: (data: Record<string, unknown>) => Promise<unknown>;
  rowActions: TableRowActionsProps<T>[];
  table: TableStateProps<T>;
  allIds: number[];
  reload: () => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────

/** Generic server-side CRUD table hook; see module docs. */
export function useEntityTable<T extends EntityRow>(
  config: UseEntityTableConfig<T>,
): UseEntityTableResult<T> {
  const {
    tableKey,
    defaultSort,
    defaultOrder = 'asc',
    sortFieldMap,
    fetchList,
    fetchCount,
    create,
    remove,
    buildColumns,
    status,
    detailPath,
    deleteDisabled,
    deleteDisabledTitle,
  } = config;

  const navigate = useNavigate();

  type LoadFn = (
    search: string,
    pageIndex: number,
    pageSize: number,
    sortField: string,
    sortDir: string,
  ) => Promise<void>;

  const loadRef = useRef<LoadFn>(async () => {});

  const {
    data: rawData,
    total,
    loading,
    error,
    q,
    page,
    size,
    sort,
    order,
    tableKey: resolvedTableKey,
    setQ,
    setPage,
    setSize,
    setSort,
    handleSearchChange,
    resetUrlState,
    executeLoad,
    defaultSort: resolvedDefaultSort,
    defaultOrder: resolvedDefaultOrder,
  } = useServerSideTable<T>({
    tableKey,
    defaultSort,
    defaultOrder,
    onSearch: (value: string) => {
      void loadRef.current(value, 0, size, sort || resolvedDefaultSort, order || resolvedDefaultOrder);
    },
    onLoad: () => {
      const backendSort = sort ? (sortFieldMap[sort] || sort) : resolvedDefaultSort;
      void loadRef.current(q, page, size, backendSort, order || resolvedDefaultOrder);
    },
  });

  const load = useCallback(
    async (search: string, pageIndex: number, pageSize: number, sortField: string, sortDir: string) => {
      await executeLoad(async () => {
        const backendSort = sortFieldMap[sortField] || sortField;
        const offset = pageIndex * pageSize;
        const listParams = {
          q: search || undefined,
          offset,
          limit: pageSize,
          sort_by: backendSort,
          sort_order: sortDir,
        };
        const countParams = { q: search || undefined };
        const [rows, cnt] = await Promise.all([fetchList(listParams), fetchCount(countParams)]);
        return { data: rows, total: cnt };
      });
    },
    [executeLoad, fetchList, fetchCount, sortFieldMap],
  );

  useLayoutEffect(() => {
    loadRef.current = load;
  });

  const reload = useCallback(() => {
    const backendSort = sort ? (sortFieldMap[sort] || sort) : resolvedDefaultSort;
    void load(q, page, size, backendSort, order || resolvedDefaultOrder);
  }, [load, q, page, size, sort, order, resolvedDefaultSort, resolvedDefaultOrder, sortFieldMap]);

  const allIds: number[] = useMemo(() => rawData.map((row) => row.id), [rawData]);

  const onGhostCreate = useCallback(
    async (ghostData: Record<string, unknown>): Promise<unknown> => {
      const created = await create(ghostData);
      await reload();
      return created;
    },
    [create, reload],
  );

  const handleDelete = useCallback(
    async (row: T) => {
      await remove(row);
      await reload();
    },
    [remove, reload],
  );

  const rowActions = useTableActions<T>({
    onEdit: async (row) => {
      syncActiveIdToUrl(tableKey, String(row.id));
      const from = `${window.location.pathname}${window.location.search}`;
      navigate(detailPath(row), { state: { from, allIds } });
    },
    onDelete: handleDelete,
    deleteDisabled,
    deleteDisabledTitle,
  });

  const [statusFilter, setStatusFilter] = useState('');

  const handleStatusFilterChange = useCallback(
    (value: string) => {
      setStatusFilter(value);
      setPage(0);
    },
    [setPage],
  );

  const baseColumns = useMemo(() => buildColumns(), [buildColumns]);

  const columns: Record<string, TableColumnProps> = useMemo(() => {
    if (!status) return baseColumns;
    return {
      ...baseColumns,
      [status.filterColumn]: {
        ...baseColumns[status.filterColumn],
        filter: () =>
          createElement(StatusFilter, {
            statusableType: status.statusableType,
            selectedValue: statusFilter,
            onSelect: handleStatusFilterChange,
          }),
      },
      status: {
        label: 'Status',
        width: '60px',
        sortable: false,
        renderCell: (row) =>
          createElement(StatusCell, {
            statusableType: status.statusableType,
            statusableId: row['id'] as number,
            currentStatus: row['status'] as string | null | undefined,
            currentColor: row['status_color_token'] as string | null | undefined,
          }),
      },
    };
  }, [baseColumns, status, statusFilter, handleStatusFilterChange]);

  return {
    columns,
    error,
    loading,
    onGhostCreate,
    rowActions,
    table: buildTableState({
      data: rawData,
      total,
      q,
      page,
      size,
      sort: sort || resolvedDefaultSort,
      order: (order as 'asc' | 'desc') || 'asc',
      tableKey: resolvedTableKey,
      setQ,
      setPage,
      setSize,
      setSort,
      handleSearchChange,
      resetUrlState,
    }),
    allIds,
    reload,
  };
}
