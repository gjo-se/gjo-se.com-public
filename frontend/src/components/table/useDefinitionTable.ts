/**
 * useDefinitionTable – generischer Feature-Table-Hook für die Core-
 * Definitions-Tabellen (Tags, Status, …).
 *
 * Kapselt die wiederkehrende Verdrahtung aus `features/* /hooks/use*Table.ts`:
 * URL-synchronisierter State (`useServerSideTable`), client-seitiges
 * Filter/Sort/Paginate, `LoadFn`-Ref + `reload`, Ghost-Row-Create, Delete und
 * die Inline-Edit-Handler der Felder `name`/`category`/`description`/`sort_order`.
 * Feature-Hooks liefern nur noch Fetch-/CRUD-Funktionen, Columns und Defaults.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { DropdownItem } from '@src/components/molecules/Dropdown/Dropdown';
import type { TableColumnProps, TableRowActionsProps, TableStateProps } from '@src/components/table';
import { buildTableState } from '@src/components/table/buildTableState';
import { useServerSideTable } from '@src/components/table/useServerSideTable';
import { useTableActions } from '@src/components/table/useTableActions';
import type { TableParamRegistry } from '@src/components/table/useTableUrlState';

// ── Constants ────────────────────────────────────────────────────────────

const CATEGORY_PARAM = 'category';

const CATEGORY_REGISTRY: TableParamRegistry = {
  [CATEGORY_PARAM]: {
    default: '',
    serialize: (v: unknown): string | undefined => (v ? String(v) : undefined),
  },
};

// ── Types ────────────────────────────────────────────────────────────────

/** Payload produced by the ghost row (matches the Core create endpoints). */
export interface DefinitionCreatePayload {
  name: string;
  category: string;
  color_token: string;
  description: string | null;
  scope: string[] | null;
}

/** Minimal shape shared by the Core definition rows. */
export interface DefinitionRow {
  id: number;
  name: string;
  category: string;
  color_token: string;
  description: string | null;
  sort_order: number;
  usage_count: number;
}

type InlineEditField = 'name' | 'category' | 'description' | 'sort_order';

export interface UseDefinitionTableConfig<T extends DefinitionRow, TUpdate> {
  /** URL-state key for the table. */
  tableKey: string;
  /** Loads the full collection (client-side pagination). */
  fetchAll: () => Promise<T[]>;
  /** Creates an entity from the ghost row payload. */
  create: (payload: DefinitionCreatePayload) => Promise<unknown>;
  /** Partial update for inline edits. */
  update: (id: number, patch: TUpdate) => Promise<unknown>;
  /** Deletes an entity by id. */
  remove: (id: number) => Promise<unknown>;
  /** Builds the base column definitions. */
  buildColumns: () => Record<string, TableColumnProps>;
  /** Disables delete for a row (e.g. still in use). */
  deleteDisabled?: (row: T) => boolean;
  /** Tooltip shown when delete is disabled. */
  deleteDisabledTitle: string;
  /** Default sort field (defaults to `category`). */
  defaultSort?: string;
}

// ── Client-side helpers ──────────────────────────────────────────────────

export interface UseDefinitionTableResult<T> {
  columns: Record<string, TableColumnProps>;
  error: string | null;
  loading: boolean;
  onGhostCreate: (data: Record<string, unknown>) => Promise<unknown>;
  rowActions: TableRowActionsProps<T>[];
  table: TableStateProps<T>;
  categoryFilter: string;
  categoryOptions: DropdownItem[];
  onCategoryFilterChange: (value: string) => void;
  reload: () => void;
  refreshData: () => Promise<void>;
}

/** Sorts rows by the given field and direction (numbers numeric, else string). */
function sortRows<T>(rows: T[], field: string, dir: 'asc' | 'desc'): T[] {
  return [...rows].sort((a, b) => {
    const aVal = (a as Record<string, unknown>)[field];
    const bVal = (b as Record<string, unknown>)[field];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return dir === 'asc' ? aVal - bVal : bVal - aVal;
    }
    const aStr = String(aVal ?? '');
    const bStr = String(bVal ?? '');
    return dir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
  });
}

// ── Hook ─────────────────────────────────────────────────────────────────

/** Generic Core-definition table hook; see module docs. */
export function useDefinitionTable<T extends DefinitionRow, TUpdate>(
  config: UseDefinitionTableConfig<T, TUpdate>,
): UseDefinitionTableResult<T> {
  const {
    tableKey,
    fetchAll,
    create,
    update,
    remove,
    buildColumns,
    deleteDisabled,
    deleteDisabledTitle,
    defaultSort = 'category',
  } = config;

  type LoadFn = () => Promise<void>;
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
    params,
    setQ,
    setPage,
    setSize,
    setSort,
    setParam,
    handleSearchChange,
    resetUrlState,
    executeLoad,
    defaultSort: resolvedDefaultSort,
  } = useServerSideTable<T>({
    tableKey,
    defaultSort,
    defaultOrder: 'asc',
    extraParams: CATEGORY_REGISTRY,
    onSearch: () => {
      void loadRef.current();
    },
    onLoad: () => {
      void loadRef.current();
    },
  });

  const categoryFilter = (params[CATEGORY_PARAM] as string) || '';

  const [allRows, setAllRows] = useState<T[]>([]);
  const allRowsRef = useRef(allRows);
  useEffect(() => {
    allRowsRef.current = allRows;
  }, [allRows]);

  const filterAndPaginate = useCallback(
    (source: T[]): { data: T[]; total: number } => {
      let filtered = source;
      if (q) {
        const search = q.toLowerCase();
        filtered = source.filter(
          (row) =>
            String(row.name).toLowerCase().includes(search) ||
            String(row.category).toLowerCase().includes(search) ||
            (row.description ?? '').toLowerCase().includes(search) ||
            String(row.color_token).toLowerCase().includes(search),
        );
      }

      if (categoryFilter) {
        filtered = filtered.filter((row) => row.category === categoryFilter);
      }

      const sortField = sort || defaultSort;
      const sortDir: 'asc' | 'desc' = (order as 'asc' | 'desc') || 'asc';
      const sorted = sortRows(filtered, sortField, sortDir);

      const start = page * size;
      return { data: sorted.slice(start, start + size), total: sorted.length };
    },
    [q, categoryFilter, sort, order, page, size, defaultSort],
  );

  const load = useCallback(async () => {
    await executeLoad(async () => {
      const current = allRowsRef.current;
      if (current.length === 0) {
        const rows = await fetchAll();
        setAllRows(rows);
        allRowsRef.current = rows;
        return filterAndPaginate(rows);
      }
      return filterAndPaginate(current);
    });
  }, [executeLoad, filterAndPaginate, fetchAll]);

  useLayoutEffect(() => {
    loadRef.current = load;
  });

  const reload = useCallback(() => {
    void loadRef.current();
  }, []);

  const refreshData = useCallback(async () => {
    const fresh = await fetchAll();
    setAllRows(fresh);
    allRowsRef.current = fresh;
    await reload();
  }, [fetchAll, reload]);

  const onGhostCreate = useCallback(
    async (ghostData: Record<string, unknown>): Promise<unknown> => {
      const name = String(ghostData.name ?? '').trim();
      const category = String(ghostData.category ?? '').trim();
      const colorToken = String(ghostData.color_token ?? 'gray').trim();
      const description = String(ghostData.description ?? '').trim() || undefined;
      const scopeRaw = String(ghostData.scope ?? '').trim();
      const scope = scopeRaw ? scopeRaw.split(',').map((s) => s.trim()).filter(Boolean) : undefined;

      if (!name) throw new Error('Name ist erforderlich.');
      if (!category) throw new Error('Kategorie ist erforderlich.');

      const created = await create({
        name,
        category,
        color_token: colorToken || 'gray',
        description: description || null,
        scope: scope || null,
      });
      await refreshData();
      return created;
    },
    [create, refreshData],
  );

  const handleDelete = useCallback(
    async (row: T) => {
      await remove(row.id);
      await refreshData();
    },
    [remove, refreshData],
  );

  const rowActions = useTableActions<T>({
    onDelete: handleDelete,
    deleteDisabled,
    deleteDisabledTitle,
  });

  const columns: Record<string, TableColumnProps> = useMemo(() => {
    const base = buildColumns();

    const withInlineEdit = (field: InlineEditField): TableColumnProps => ({
      ...base[field],
      onInlineEdit: async (row: Record<string, unknown>, value: string) => {
        if (field === 'sort_order') {
          const num = parseInt(value, 10);
          if (isNaN(num) || row.sort_order === num) return;
          await update(row.id as number, { sort_order: num } as unknown as TUpdate);
          await refreshData();
          return;
        }

        const trimmed = value.trim();
        if (field === 'description') {
          if ((row.description || '') === trimmed) return;
          await update(row.id as number, { description: trimmed || null } as unknown as TUpdate);
        } else {
          if (!trimmed || row[field] === trimmed) return;
          await update(row.id as number, { [field]: trimmed } as unknown as TUpdate);
        }
        await refreshData();
      },
    });

    return {
      ...base,
      name: withInlineEdit('name'),
      category: withInlineEdit('category'),
      description: withInlineEdit('description'),
      sort_order: withInlineEdit('sort_order'),
    };
  }, [buildColumns, update, refreshData]);

  const categoryOptions: DropdownItem[] = useMemo(() => {
    const distinct = [...new Set(allRows.map((row) => row.category))].sort();
    return [{ value: 'all', label: 'Alle' }, ...distinct.map((c) => ({ value: c, label: c }))];
  }, [allRows]);

  const onCategoryFilterChange = useCallback(
    (value: string) => {
      setParam(CATEGORY_PARAM, value === 'all' ? '' : value);
      setPage(0);
      void loadRef.current();
    },
    [setParam, setPage],
  );

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
    categoryFilter,
    categoryOptions,
    onCategoryFilterChange,
    reload,
    refreshData,
  };
}
