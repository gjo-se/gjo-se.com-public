import { useMemo } from 'react';

import type { TableColumnProps } from '@src/components/table/TableColumn.interface';
import type { TableStateProps } from '@src/components/table/TableState.interface';
import { useClientSideTable } from '@src/components/table/useClientSideTable';

import { fetchSiteContent, updateSiteContentValue } from '../services/siteContentService';

import type { SiteContentRow } from '../services/siteContentService';

export interface UseSiteContentTableReturn {
  table: TableStateProps<SiteContentRow>;
  allData: SiteContentRow[];
  columns: Record<string, TableColumnProps>;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const TABLE_KEY = 'admin-site-content';

/**
 *
 */
export function useSiteContentTable(): UseSiteContentTableReturn {
  const {
    data,
    allData,
    total,
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
    loading,
    error,
    reload,
    defaultSort,
    defaultOrder,
  } = useClientSideTable<SiteContentRow>({
    tableKey: TABLE_KEY,
    loadFn: fetchSiteContent,
    filterFn: (rows, query) => {
      if (!query) return rows;
      const lowerQ = query.toLowerCase();
      return rows.filter(
        (r) =>
          r.key.toLowerCase().includes(lowerQ) ||
          (r.value ?? '').toLowerCase().includes(lowerQ),
      );
    },
    sortFn: (rows, field, order) => {
      return [...rows].sort((a, b) => {
        let cmp = 0;
        if (field === 'key') {
          cmp = a.key.localeCompare(b.key);
        } else if (field === 'updated_at') {
          const aVal = a.updated_at ?? '';
          const bVal = b.updated_at ?? '';
          cmp = aVal.localeCompare(bVal);
        }
        return order === 'asc' ? cmp : -cmp;
      });
    },
    defaultSort: 'key',
    defaultOrder: 'asc',
  });

  // ── Columns: Value column uses inline-edit that saves via API ──
  const columns = useMemo<Record<string, TableColumnProps>>(() => ({
    key: {
      label: 'Key',
      sortable: true,
      width: '300px',
      search: true,
    },
    value: {
      label: 'Value',
      inlineEdit: true,
      onInlineEdit: async (row, value) => {
        const r = row as unknown as SiteContentRow;
        await updateSiteContentValue(r.key, r.language, value);
        void reload();
      },
    },
    updated_at: {
      label: 'Updated At',
      width: '180px',
      sortable: true,
    },
  }), [reload]);

  const table: TableStateProps<SiteContentRow> = useMemo(() => ({
    data,
    total,
    tableKey: TABLE_KEY,
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
    defaultSort,
    defaultOrder,
  }), [
    data, total, q, page, size, sort, order,
    setQ, setPage, setSize, setSort, handleSearchChange,
    resetUrlState, defaultSort, defaultOrder,
  ]);

  return { table, allData, columns, loading, error, reload };
}
