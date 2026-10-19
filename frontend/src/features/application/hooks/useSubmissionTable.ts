/**
 * useSubmissionTable – Server-side data hook for the application submissions table.
 *
 * Uses useServerSideTable for URL-synced pagination, search, and sort.
 * Projekt/Firma/Empfänger/Datum are sortable server-side; the recipient column
 * hosts the status filter. The detail route is owned by the list ticket, so the
 * target path is kept as a plain string here.
 */
import { createElement, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import DateRangeFilter from '@src/components/molecules/DateRangeFilter/DateRangeFilter';
import StatusFilter from '@src/components/molecules/StatusFilter/StatusFilter';
import type { TableColumnProps, TableRowActionsProps, TableStateProps } from '@src/components/table';
import { buildTableState } from '@src/components/table/buildTableState';
import { useServerSideTable } from '@src/components/table/useServerSideTable';
import { useTableActions } from '@src/components/table/useTableActions';
import { syncActiveIdToUrl } from '@src/components/table/useTableUrlState';
import { useDateFilter } from '@src/hooks/useDateFilter';
import { extractApiError } from '@src/lib/api/extractError';
import { showErrorToast } from '@src/lib/errorToast';
import { routeConfig } from '@src/router.config';

import { startScoreRun } from '../services/applicationScoreService';
import {
  deleteSubmission,
  fetchSubmissionCount,
  fetchSubmissions,
  type ApplicationSubmissionListOut,
} from '../services/applicationService';
import { createSubmissionColumns } from '../shared/SubmissionColumns';

// ── Constants ────────────────────────────────────────────────────────────

const TABLE_KEY = 'admin-application-submissions';

/** Frontend column key → backend sort field mapping. */
const SORT_FIELD_MAP: Record<string, string> = {
  projectTitle: 'project_title',
  recipientCompanyName: 'recipient_company_name',
  recipientDisplayName: 'recipient_display_name',
  createdAt: 'created_at',
  lastScore: 'last_score',
};

// ── Types ────────────────────────────────────────────────────────────────

/** Row type for the submissions table – direct alias of the list schema. */
export type SubmissionTableRow = ApplicationSubmissionListOut;

export interface UseSubmissionTableOptions {
  /** Restricts the list to submissions of projects linked to this CRM person. */
  crmPersonId?: number;
  /** Overrides the table key (URL/localStorage state) – e.g. for a person-scoped list. */
  tableKey?: string;
}

export interface UseSubmissionTableResult {
  /** Column definitions for the Table compound. */
  columns: Record<string, TableColumnProps>;
  /** Error message from the last load. */
  error: string | null;
  /** Whether data is currently loading. */
  loading: boolean;
  /** Row action definitions (edit, delete, score). */
  rowActions: TableRowActionsProps<SubmissionTableRow>[];
  /** Table state for the Table compound. */
  table: TableStateProps<SubmissionTableRow>;
  /** All loaded submission IDs for prev/next navigation on detail page. */
  allIds: number[];
}

// ── Hook ─────────────────────────────────────────────────────────────────

/** Server-side data hook for the application submissions table. */
export function useSubmissionTable(options: UseSubmissionTableOptions = {}): UseSubmissionTableResult {
  const { crmPersonId, tableKey: customTableKey } = options;
  const effectiveTableKey = customTableKey ?? TABLE_KEY;
  const navigate = useNavigate();

  // ── Date filter (from/to owned by the shared table URL state) ────────────
  // The picker itself is the shared DateRangeFilter (mounted in the Datum
  // column header); here we only read the values for the query.
  const { state: dateState } = useDateFilter(effectiveTableKey);
  const { dateFrom, dateTo } = dateState;
  const dateFromRef = useRef(dateFrom);
  const dateToRef = useRef(dateTo);
  useEffect(() => { dateFromRef.current = dateFrom; });
  useEffect(() => { dateToRef.current = dateTo; });

  // ── Load function (ref-based so onLoad/onSearch closures see latest) ─
  type LoadFn = (
    search: string,
    pageIndex: number,
    pageSize: number,
    sortField: string,
    sortDir: string,
    statusOverride?: string,
  ) => Promise<void>;

  const loadRef = useRef<LoadFn>(async () => {});

  // ── Server-side table state ──────────────────────────────────────────
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
    tableKey,
    setQ,
    setPage,
    setSize,
    setSort,
    handleSearchChange,
    resetUrlState,
    executeLoad,
    defaultSort,
    defaultOrder,
  } = useServerSideTable<ApplicationSubmissionListOut>({
    tableKey: effectiveTableKey,
    defaultSort: 'createdAt',
    defaultOrder: 'desc',
    onSearch: (value: string) => {
      void loadRef.current(value, 0, size, sort || defaultSort, order || defaultOrder);
    },
    onLoad: () => {
      const backendSort = sort ? (SORT_FIELD_MAP[sort] || sort) : defaultSort;
      void loadRef.current(q, page, size, backendSort, order || defaultOrder);
    },
  });

  // ── Status filter ─────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState('');

  // ── Core load logic ──────────────────────────────────────────────────
  const load = useCallback(
    async (
      search: string,
      pageIndex: number,
      pageSize: number,
      sortField: string,
      sortDir: string,
      statusOverride?: string,
    ) => {
      const status = statusOverride ?? statusFilter;
      await executeLoad(async () => {
        const backendSort = SORT_FIELD_MAP[sortField] || sortField;
        const offset = pageIndex * pageSize;
        // If only `from` is set without `to`, treat it as a single-day filter
        // (identical to the project list behavior).
        const from = dateFromRef.current;
        const selectedTo = dateToRef.current;
        const to = from && !selectedTo ? from : selectedTo;
        const listParams = {
          q: search || undefined,
          status: status || undefined,
          crm_person_id: crmPersonId,
          from,
          to,
          offset,
          limit: pageSize,
          sort_by: backendSort,
          sort_order: sortDir,
        };
        const countParams = {
          q: search || undefined,
          status: status || undefined,
          crm_person_id: crmPersonId,
          from,
          to,
        };
        const [submissions, cnt] = await Promise.all([
          fetchSubmissions(listParams),
          fetchSubmissionCount(countParams),
        ]);
        return { data: submissions, total: cnt };
      });
    },
    [executeLoad, statusFilter, crmPersonId],
  );

  useLayoutEffect(() => {
    loadRef.current = load;
  });

  // ── Scoring (row action) ─────────────────────────────────────────────
  const [scoringRowId, setScoringRowId] = useState<number | null>(null);

  /** Re-runs the current query with the latest table state. */
  const reload = useCallback(
    () => load(q, page, size, sort || defaultSort, order || defaultOrder, statusFilter),
    [load, q, page, size, sort, order, defaultSort, defaultOrder, statusFilter],
  );

  const handleScore = useCallback(
    async (row: SubmissionTableRow) => {
      setScoringRowId(row.id);
      try {
        await startScoreRun({ submission_id: row.id });
        await reload();
      } catch (err: unknown) {
        const msg = extractApiError(err);
        showErrorToast(
          msg.startsWith('422')
            ? 'Keine Ausschreibung hinterlegt – Score über den Skill mit description_override starten.'
            : `Score fehlgeschlagen: ${msg}`,
        );
      } finally {
        setScoringRowId(null);
      }
    },
    [reload],
  );

  const handleDelete = useCallback(
    async (row: SubmissionTableRow) => {
      try {
        await deleteSubmission(row.id);
        await reload();
      } catch (err: unknown) {
        showErrorToast(`Löschen fehlgeschlagen: ${extractApiError(err)}`);
      }
    },
    [reload],
  );

  // ── Date range change → reset to page 0 and reload ────────────────────
  const prevDateRef = useRef({ from: dateFrom, to: dateTo });
  useEffect(() => {
    const prev = prevDateRef.current;
    if (prev.from !== dateFrom || prev.to !== dateTo) {
      prevDateRef.current = { from: dateFrom, to: dateTo };
      setPage(0);
      const backendSort = sort ? (SORT_FIELD_MAP[sort] || sort) : defaultSort;
      void loadRef.current(q, 0, size, backendSort, order || defaultOrder);
    }
  }, [dateFrom, dateTo, q, size, sort, order, defaultSort, defaultOrder, setPage]);

  const handleStatusFilterChange = useCallback(
    (value: string) => {
      setStatusFilter(value);
      setPage(0);
      // On page 0 setPage is a no-op, so reload explicitly; on page > 0 the
      // resulting URL state change already triggers onLoad with the new filter.
      if (page === 0) {
        const backendSort = sort ? (SORT_FIELD_MAP[sort] || sort) : defaultSort;
        void loadRef.current(q, 0, size, backendSort, order || defaultOrder, value);
      }
    },
    [setPage, page, q, size, sort, order, defaultSort, defaultOrder],
  );

  // ── Row data ─────────────────────────────────────────────────────────
  const data: SubmissionTableRow[] = rawData;

  const allIds: number[] = useMemo(() => rawData.map((s) => s.id), [rawData]);

  // ── Row actions ──────────────────────────────────────────────────────
  const rowActions = useTableActions<SubmissionTableRow>({
    onEdit: async (row) => {
      syncActiveIdToUrl(effectiveTableKey, String(row.id));
      const from = `${window.location.pathname}${window.location.search}`;
      const detailPath = routeConfig.adminApplicationSubmissionDetail.path.replace(
        ':id',
        String(row.id),
      );
      navigate(detailPath, {
        state: { from, allIds },
      });
    },
    onDelete: handleDelete,
    customActions: [
      {
        key: 'score',
        icon: 'sparkles',
        label: 'Score berechnen',
        onAction: handleScore,
        disabled: (row) => scoringRowId === row.id,
      },
    ],
  });

  // ── Columns ──────────────────────────────────────────────────────────
  const baseColumns = useMemo(() => createSubmissionColumns(), []);

  const columns: Record<string, TableColumnProps> = useMemo(
    () => ({
      ...baseColumns,
      recipientDisplayName: {
        ...baseColumns.recipientDisplayName,
        filter: () => createElement(StatusFilter, {
          statusableType: 'application_submission',
          selectedValue: statusFilter,
          onSelect: handleStatusFilterChange,
        }),
      },
      createdAt: {
        ...baseColumns.createdAt,
        filter: () => createElement(DateRangeFilter, { tableKey: effectiveTableKey }),
      },
    }),
    [baseColumns, statusFilter, handleStatusFilterChange, effectiveTableKey],
  );

  return {
    columns,
    error,
    loading,
    rowActions,
    table: buildTableState({
      data,
      total,
      q,
      page,
      size,
      sort: sort || defaultSort,
      order: (order as 'asc' | 'desc') || 'desc',
      tableKey,
      setQ,
      setPage,
      setSize,
      setSort,
      handleSearchChange,
      resetUrlState,
    }),
    allIds,
  };
}
