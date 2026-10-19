/**
 * useAdminProjects – Data-fetching hook for the AdminProjectsPage.
 *
 * Server-side pagination via useServerSideTable. Returns data, total,
 * columns with inline filters, and rowActions for the Table compound.
 * The scraper/reset side effects live in useAdminProjectsScraper and the
 * column definitions in useAdminProjectsColumns.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import type { TableColumnProps, TableRowActionsProps, TableStateProps } from '@src/components/table';
import { buildTableState } from '@src/components/table/buildTableState';
import { useServerSideTable } from '@src/components/table/useServerSideTable';
import { useTableActions } from '@src/components/table/useTableActions';
import { syncActiveIdToUrl } from '@src/components/table/useTableUrlState';
import { useDateFilter } from '@src/hooks/useDateFilter';
import { fetchProjectCount, fetchProjects } from '@src/lib/api/aiscope';
import type { Project } from '@src/lib/api/aiscope';
import type { TaskStatus } from '@src/lib/api/aiscopeTasks';
import { useActiveSearchTerms } from '@src/providers/searchTerms/useActiveSearchTerms';
import { route } from '@src/router.derived';

import { DEFAULT_PROJECT_PRESET, PROJECT_PRESET_FILTERS } from '../core/types';
import { formatProjects, type ProjectTableRow } from '../shared/formatProjects';
import {
  ENDCUSTOMER_PARAM,
  HAS_SKILLS_PARAM,
  JOB_ROLE_PARAM,
  MERGED_PARAM,
  MIN_SCORE_PARAM,
  PROJECTS_EXTRA_PARAMS,
  PROJECTS_TABLE_KEY,
  SORT_FIELD_MAP,
  readInitialJobRole,
} from '../utils/adminProjectsTable';

import { useAdminProjectsColumns } from './useAdminProjectsColumns';
import { useAdminProjectsScraper } from './useAdminProjectsScraper';
import { useProjectStatusPresets } from './useProjectStatusPresets';

import type { ReReadStatus, ScraperStatus } from '../core/types';

export type { ProjectTableRow };

/** Row/table actions exposed to the page. */
export interface AdminProjectsActions {
  clearDateFilter: () => void
  handleScrape: () => Promise<void>
  handleBatchDedup: () => Promise<void>
  setMaxResults: (value: string) => void
  handleResetAll: () => void
}

/** Read-only state exposed to the page. */
export interface AdminProjectsState {
  scraperStatus: ScraperStatus
  maxResults: string
  savedCount: number | null
  batchDedupStatus: ReReadStatus
  batchDedupResult: string | null
  canScrape: boolean
  dateFrom: string | undefined
  dateTo: string | undefined
  jobRoleFilter: number | null
  loading: boolean
  error: string | null
}

/** Full result of the AdminProjects data hook. */
export interface UseAdminProjectsResult {
  table: TableStateProps<ProjectTableRow>
  columns: Record<string, TableColumnProps>
  rowActions: TableRowActionsProps<ProjectTableRow>[]
  loading: boolean
  error: string | null
  actions: AdminProjectsActions
  state: AdminProjectsState
  reload: () => void
}

/** Data-fetching hook for the AdminProjectsPage. */
export function useAdminProjects(
  mergeStatus?: Map<number, TaskStatus>,
  mergeElapsedMs?: number,
  avgMergeDurationMs?: number | null,
): UseAdminProjectsResult {
  const navigate = useNavigate();

  // ── Search term options (JobRole filter) ────────────────────────────────
  const { searchTerms } = useActiveSearchTerms();

  const jobRoleItems = useMemo(
    () => [
      { value: '', label: 'Alle Suchbegriffe' },
      ...searchTerms.map((r) => ({ value: String(r.id), label: r.name })),
    ],
    [searchTerms],
  );

  // ── Date filter (from/to owned by the shared table URL state) ────────────
  // The picker itself is the shared DateRangeFilter (mounted in the column
  // header); here we only read the values for the query + reset.
  const { state: dateState, actions: dateActions } = useDateFilter(PROJECTS_TABLE_KEY);
  const { dateFrom, dateTo } = dateState;
  const { clearDateFilter } = dateActions;

  // ── Local filter state ──────────────────────────────────────────────────
  const [myProjects, setMyProjects] = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────
  const jobRoleFilterRef = useRef<number | null>(readInitialJobRole());
  const dateFromRef = useRef(dateFrom);
  const dateToRef = useRef(dateTo);
  useEffect(() => { dateFromRef.current = dateFrom; });
  useEffect(() => { dateToRef.current = dateTo; });

  type LoadFn = (
    search: string, jobRole: number | null,
    pageIndex: number, pageSize?: number, sortField?: string,
    sortDir?: string, from?: string, to?: string,
  ) => Promise<void>;
  const loadRef = useRef<LoadFn>(async () => {});

  // ── Server-side table (owns q/sort/page/size + job_role_id via registry) ──
  const {
    data: rawData, total, loading, error,
    q, page, size, sort, order, tableKey, params,
    setQ, setPage, setSize, setSort, setParam,
    handleSearchChange, resetUrlState,
    executeLoad,
    defaultSort, defaultOrder,
  } = useServerSideTable<Project>({
    tableKey: PROJECTS_TABLE_KEY,
    defaultSort: 'posted_at',
    defaultOrder: 'desc',
    extraParams: PROJECTS_EXTRA_PARAMS,
    onSearch: (value) => {
      void loadRef.current(
        value, jobRoleFilterRef.current,
        0, size, sort, order, dateFromRef.current, dateToRef.current,
      );
    },
    onLoad: () => {
      const backendSort = sort ? (SORT_FIELD_MAP[sort] || sort) : defaultSort;
      void loadRef.current(
        q, jobRoleFilterRef.current,
        page, size, backendSort || defaultSort, order || defaultOrder,
        dateFromRef.current, dateToRef.current,
      );
    },
  });

  const jobRoleFilter = (params[JOB_ROLE_PARAM] as number | null) ?? null;
  useEffect(() => { jobRoleFilterRef.current = jobRoleFilter; });

  const minScoreFilter = (params[MIN_SCORE_PARAM] as number | null) ?? null;
  const minScoreFilterRef = useRef<number | null>(minScoreFilter);
  useEffect(() => { minScoreFilterRef.current = minScoreFilter; });

  const endcustomerFilter = (params[ENDCUSTOMER_PARAM] as boolean | null) ?? null;
  const endcustomerFilterRef = useRef<boolean | null>(endcustomerFilter);
  useEffect(() => { endcustomerFilterRef.current = endcustomerFilter; });

  // ── LLM-status filter ("Nicht gemerged" / "Keine Skills") ────────────────
  // Registry-owned via merged=false / has_skills=false so it survives
  // reloads/deep-links and the detail pager can reconstruct it.
  const mergedFilter = (params[MERGED_PARAM] as boolean | null) ?? null;
  const hasSkillsFilter = (params[HAS_SKILLS_PARAM] as boolean | null) ?? null;
  const mergedFilterRef = useRef<boolean | null>(mergedFilter);
  const hasSkillsFilterRef = useRef<boolean | null>(hasSkillsFilter);
  useEffect(() => { mergedFilterRef.current = mergedFilter; });
  useEffect(() => { hasSkillsFilterRef.current = hasSkillsFilter; });

  const llmFilter = mergedFilter === false ? 'not_merged' : hasSkillsFilter === false ? 'no_skills' : '';

  // ── Status presets (shared tableKey, owned by useTableUrlState) ──────────
  const reloadCurrent = useCallback(() => {
    void loadRef.current(q, jobRoleFilter, page, size, sort, order, dateFrom, dateTo);
  }, [q, jobRoleFilter, page, size, sort, order, dateFrom, dateTo]);

  const {
    preset, filter: presetFilter, setPreset, resetPreset,
  } = useProjectStatusPresets({ tableKey: PROJECTS_TABLE_KEY });

  const presetFilterRef = useRef(presetFilter);
  useEffect(() => { presetFilterRef.current = presetFilter; });

  // ── Load function ───────────────────────────────────────────────────────
  const load = async (
    search: string,
    jobRole: number | null,
    pageIndex: number,
    pageSize: number = size,
    sortField: string = sort,
    sortDir: string = order,
    from?: string,
    to?: string,
  ) => {
    await executeLoad(async () => {
      const backendSort = SORT_FIELD_MAP[sortField] || sortField;
      const offset = pageIndex * pageSize;
      // If only from is set without to, treat as single-day filter
      const effectiveFrom = from;
      const effectiveTo = from && !to ? from : to;
      const { status: presetStatus, include_archived } = presetFilterRef.current;
      const minScore = minScoreFilterRef.current ?? undefined;
      const endcustomer = endcustomerFilterRef.current ?? undefined;
      const merged = mergedFilterRef.current ?? undefined;
      const hasSkills = hasSkillsFilterRef.current ?? undefined;

      const params = {
        q: search || undefined,
        search_term_id: jobRole ?? undefined,
        offset,
        limit: pageSize,
        sort_by: backendSort || undefined,
        sort_order: (sortDir as 'asc' | 'desc') || undefined,
        from: effectiveFrom,
        to: effectiveTo,
        status: presetStatus,
        include_archived,
        min_score: minScore,
        merged,
        has_skills: hasSkills,
        endcustomer,
      };
      const [projData, cnt] = await Promise.all([
        fetchProjects(params),
        fetchProjectCount({
          q: search || undefined,
          search_term_id: jobRole ?? undefined,
          from: effectiveFrom,
          to: effectiveTo,
          status: presetStatus,
          include_archived,
          min_score: minScore,
          merged,
          has_skills: hasSkills,
          endcustomer,
        }),
      ]);
      return { data: projData, total: cnt };
    });
  };

  useLayoutEffect(() => { loadRef.current = load; });

  /** Resets to page 0 and reloads with the current filters (job-role override optional). */
  const reloadFromStart = useCallback(
    (jobRoleId: number | null = jobRoleFilter) => {
      setPage(0);
      void loadRef.current(q, jobRoleId, 0, size, sort, order, dateFrom, dateTo);
    },
    [q, jobRoleFilter, setPage, size, sort, order, dateFrom, dateTo],
  );

  // ── Filter handlers ──────────────────────────────────────────────────
  const handleJobRoleChange = useCallback(
    (value: string) => {
      const id = value ? Number(value) : null;
      jobRoleFilterRef.current = id;
      setParam(JOB_ROLE_PARAM, id);
      reloadFromStart(id);
    },
    [setParam, reloadFromStart],
  );

  const handleLlmChange = useCallback(
    (value: string) => {
      setParam(MERGED_PARAM, value === 'not_merged' ? false : null);
      setParam(HAS_SKILLS_PARAM, value === 'no_skills' ? false : null);
      reloadFromStart();
    },
    [setParam, reloadFromStart],
  );

  const handleMinScoreChange = useCallback(
    (value: number | null) => {
      minScoreFilterRef.current = value;
      setParam(MIN_SCORE_PARAM, value);
      reloadFromStart();
    },
    [setParam, reloadFromStart],
  );

  const handleEndcustomerChange = useCallback(
    (value: string) => {
      const boolVal: boolean | null = value === 'true' ? true : value === 'false' ? false : null;
      endcustomerFilterRef.current = boolVal;
      setParam(ENDCUSTOMER_PARAM, boolVal);
      reloadFromStart();
    },
    [setParam, reloadFromStart],
  );

  const prevDateRef = useRef({ from: dateFrom, to: dateTo });
  useEffect(() => {
    const prev = prevDateRef.current;
    if (prev.from !== dateFrom || prev.to !== dateTo) {
      prevDateRef.current = { from: dateFrom, to: dateTo };
      reloadFromStart();
    }
  }, [dateFrom, dateTo, reloadFromStart]);

  // ── Preset change → reset to page 0 and reload ─────────────────────────
  const prevPresetRef = useRef(preset);
  useEffect(() => {
    if (prevPresetRef.current !== preset) {
      prevPresetRef.current = preset;
      presetFilterRef.current = presetFilter;
      reloadFromStart();
    }
  }, [preset, presetFilter, reloadFromStart]);

  // ── Scraper / re-read ────────────────────────────────────────────────
  const {
    scraperStatus,
    maxResults,
    setMaxResults,
    savedCount,
    batchDedupStatus,
    batchDedupResult,
    handleScrape,
    handleBatchDedup,
  } = useAdminProjectsScraper({ reload: reloadFromStart, setPage });

  // ── Reset all filters ────────────────────────────────────────────────
  const handleResetAll = useCallback(() => {
    jobRoleFilterRef.current = null;
    mergedFilterRef.current = null;
    hasSkillsFilterRef.current = null;
    minScoreFilterRef.current = null;
    endcustomerFilterRef.current = null;
    dateFromRef.current = undefined;
    dateToRef.current = undefined;
    presetFilterRef.current = PROJECT_PRESET_FILTERS[DEFAULT_PROJECT_PRESET];
    clearDateFilter();
    setParam(JOB_ROLE_PARAM, null);
    setParam(MIN_SCORE_PARAM, null);
    setParam(ENDCUSTOMER_PARAM, null);
    setParam(MERGED_PARAM, null);
    setParam(HAS_SKILLS_PARAM, null);
    resetPreset();
    void loadRef.current('', null, 0, size, defaultSort, defaultOrder, undefined, undefined);
  }, [clearDateFilter, resetPreset, setParam, size, defaultSort, defaultOrder]);

  // ── Row actions ──────────────────────────────────────────────────────
  const rowActions = useTableActions<ProjectTableRow>({
    onEdit: async (row) => {
      syncActiveIdToUrl('projects', String(row.id));
      // Remember the current list URL (filters, sort, page, preset, activeId)
      // so the detail view can offer a "back to list" link that restores it.
      const from = `${window.location.pathname}${window.location.search}`;
      navigate(`${route.adminAiscopeProject.path}/${row.id}`, { state: { from } });
    },
  });

  // ── Columns with filters (React.createElement, no JSX) ─────────────────
  const columns = useAdminProjectsColumns({
    llmFilter,
    jobRoleItems,
    jobRoleFilter,
    endcustomerFilter,
    minScoreFilter,
    myProjects,
    preset,
    onLlmChange: handleLlmChange,
    onJobRoleChange: handleJobRoleChange,
    onEndcustomerChange: handleEndcustomerChange,
    onMinScoreChange: handleMinScoreChange,
    onToggleMyProjects: () => {
      setMyProjects(!myProjects);
      handleMinScoreChange(myProjects ? null : 75);
    },
    onPresetChange: setPreset,
  });

  // ── Data formatting ──────────────────────────────────────────────────
  const data = useMemo(
    () => formatProjects(rawData, mergeStatus, mergeElapsedMs, avgMergeDurationMs),
    [rawData, mergeStatus, mergeElapsedMs, avgMergeDurationMs],
  );

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
    actions: {
      clearDateFilter,
      handleScrape,
      handleBatchDedup,
      setMaxResults,
      handleResetAll,
    },
    state: {
      scraperStatus,
      maxResults,
      savedCount,
      batchDedupStatus,
      batchDedupResult,
      canScrape: true,
      dateFrom,
      dateTo,
      jobRoleFilter,
      loading,
      error,
    },
    reload: reloadCurrent,
  };
}
