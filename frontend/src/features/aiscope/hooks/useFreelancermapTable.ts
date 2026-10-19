/**
 * useFreelancermapTable – Data-fetching hook for the raw Freelancermap table.
 *
 * Server-side pagination via useServerSideTable. Returns data, total,
 * columns, and rowActions for the Table compound component.
 * All cell values are plain strings (no JSX). No filter columns.
 * No scraper – scraping is only triggered from the Projects page.
 */

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';

import type { TableColumnProps, TableRowActionsProps, TableStateProps } from '@src/components/table';
import { buildTableState } from '@src/components/table/buildTableState';
import { useServerSideTable } from '@src/components/table/useServerSideTable';
import { useTableActions } from '@src/components/table/useTableActions';
import { syncActiveIdToUrl } from '@src/components/table/useTableUrlState';
import {
  fetchFreelancermapCount,
  fetchFreelancermapProjects,
  type ProjectFreelancerMap,
} from '@src/lib/api/aiscope';
import { route } from '@src/router.derived';
import {
  formatContractType,
  formatDuration,
  formatStartDate,
} from '@src/utils/projectFormatters';


// ── Column key → backend sort field mapping ──────────────────────────────

const SORT_FIELD_MAP: Record<string, string> = {
  title: 'title',
  agency: 'agency',
  city: 'city',
  remotePercent: 'remote_percent',
  contractType: 'contract_type',
  duration: 'duration',
  startDate: 'start_date',
  postedAt: 'posted_at',
  mappedAt: 'mapped_at',
};

// ── Table row type ───────────────────────────────────────────────────────

export interface FreelancermapTableRow {
  id: number
  title: string
  agency: string
  city: string
  remotePercent: string
  jobRole: string
  contractType: string
  duration: string
  startDate: string
  postedAt: string
  mappedAt: string
  endcustomer: string
}

// ── Types ────────────────────────────────────────────────────────────────

export interface UseFreelancermapTableResult {
  table: TableStateProps<FreelancermapTableRow>
  columns: Record<string, TableColumnProps>
  rowActions: TableRowActionsProps<FreelancermapTableRow>[]
  loading: boolean
  error: string | null
}

function formatFreelancermapRows(items: ProjectFreelancerMap[]): FreelancermapTableRow[] {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    agency: item.agency ?? '–',
    city: item.city ?? '–',
    remotePercent: item.remote_percent != null ? `${item.remote_percent} %` : '–',
    jobRole: item.search_term_name ?? '–',
    contractType: formatContractType(item.contract_type),
    duration: formatDuration(item.duration != null ? String(item.duration) : null),
    startDate: formatStartDate(item.start_date),
    postedAt: item.posted_at
      ? new Date(item.posted_at).toLocaleDateString('de-DE', {
          day: '2-digit', month: '2-digit', year: 'numeric',
        })
      : '–',
    mappedAt: item.mapped_at
      ? new Date(item.mapped_at).toLocaleDateString('de-DE')
      : 'ausstehend',
    endcustomer: item.endcustomer === true ? 'x' : '–',
  }));
}

// ── Hook ─────────────────────────────────────────────────────────────────

/** Hook providing table state, columns, row actions, loading, and error for the Freelancermap raw data page. */
export function useFreelancermapTable(): UseFreelancermapTableResult {
  const navigate = useNavigate();

  const jobRoleFilterRef = useRef<number | null>(null);

  type LoadFn = (
    search: string, jobRoleId: number | null, pageIndex: number,
    pageSize?: number, sortField?: string, sortDir?: string,
  ) => Promise<void>;
  const loadRef = useRef<LoadFn>(async () => {});

  const {
    data: rawData, total, loading, error,
    q, page, size, sort, order, tableKey,
    setQ, setPage, setSize, setSort,
    handleSearchChange, resetUrlState,
    executeLoad,
    defaultSort, defaultOrder,
  } = useServerSideTable<ProjectFreelancerMap>({
    tableKey: 'raw-freelancermap',
    defaultSort: 'posted_at',
    defaultOrder: 'desc',
    onSearch: (value) => void loadRef.current(value, jobRoleFilterRef.current, 0),
    onLoad: () => {
      const backendSort = sort ? (SORT_FIELD_MAP[sort] || sort) : defaultSort;
      void loadRef.current(
        q, jobRoleFilterRef.current, page, size,
        backendSort || defaultSort, order || defaultOrder,
      );
    },
  });

  const load = async (
    search: string,
    jobRoleId: number | null,
    pageIndex: number,
    pageSize: number = size,
    sortField: string = sort,
    sortDir: string = order,
  ) => {
    await executeLoad(async () => {
      const backendSort = SORT_FIELD_MAP[sortField] || sortField;
      const [result, cnt] = await Promise.all([
        fetchFreelancermapProjects({
          q: search || undefined,
          search_term_id: jobRoleId || undefined,
          offset: pageIndex * pageSize,
          limit: pageSize,
          sort_by: backendSort || undefined,
          sort_order: (sortDir as 'asc' | 'desc') || undefined,
        }),
        fetchFreelancermapCount({ q: search || undefined, search_term_id: jobRoleId || undefined }),
      ]);
      return { data: result, total: cnt };
    });
  };

  useLayoutEffect(() => { loadRef.current = load; });

  const rowActions = useTableActions<FreelancermapTableRow>({
    onEdit: async (row) => {
      syncActiveIdToUrl('raw-freelancermap', String(row.id));
      navigate(`${route.adminAiscopeFreelancermap.path}/${row.id}`);
    },
  });

  const columns: Record<string, TableColumnProps> = {
    title: { label: 'Titel', width: '220px', search: true },
    agency: { label: 'Agentur', width: '160px' },
    city: { label: 'Stadt', width: '110px' },
    remotePercent: { label: 'Remote %', width: '90px' },
    jobRole: { label: 'JobRole', width: '140px' },
    contractType: { label: 'Typ', width: '110px' },
    duration: { label: 'Dauer', width: '80px' },
    startDate: { label: 'Start', width: '90px' },
    postedAt: { label: 'Eingestellt', width: '110px', defaultSort: 'desc' },
    mappedAt: { label: 'Gemappt', width: '110px' },
    endcustomer: { label: 'EK', width: '40px' },
  };

  const data = useMemo(() => formatFreelancermapRows(rawData), [rawData]);

  return {
    table: buildTableState({
      data, total, q, page, size, sort, order, tableKey,
      setQ, setPage, setSize, setSort,
      handleSearchChange, resetUrlState,
    }),
    columns,
    rowActions,
    loading,
    error,
  };
}
