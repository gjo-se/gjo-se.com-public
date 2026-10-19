/**
 * useLLMCallLogs – Server-side paginated call-log table hook.
 *
 * Uses useServerSideTable for URL state (q/page/size/sort/order),
 * server-side pagination (offset/limit), and loading/error state.
 * Row actions (retry, promote) via central useTableActions / TableRowActions.
 */
import { createElement, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import Dropdown from '@src/components/molecules/Dropdown/Dropdown';
import type { TableColumnProps, TableRowActionsProps, TableStateProps } from '@src/components/table';
import { buildTableState } from '@src/components/table/buildTableState';
import { useServerSideTable } from '@src/components/table/useServerSideTable';
import { useTableActions } from '@src/components/table/useTableActions';
import type { TableParamRegistry } from '@src/components/table/useTableUrlState';
import {
  type CallLogOut,
  fetchCallLogs,
  getTaskProgress,
  retryCallLog,
  retryCallLogBatch,
  unpromoteFromDataset,
} from '@src/lib/api/callLog';
import { feTrace } from '@src/lib/trace';

import { fetchTasks } from '../services/taskMappingService';
import {
  type CallLogTableRow,
  formatCallLogRows,
} from '../utils/llmCallLogs';

export type { CallLogTableRow } from '../utils/llmCallLogs';

interface ConfirmPromote {
  id: number
  label: 'golden' | 'failure'
  warning: string
}

export interface UseLLMCallLogsResult {
  table: TableStateProps<CallLogTableRow>
  columns: Record<string, TableColumnProps>
  rowActions: TableRowActionsProps<CallLogTableRow>[]
  loading: boolean
  error: string | null
  selectedIds: Set<number>
  handleBatchRetry: (rows: CallLogTableRow[]) => Promise<void>
  batchRetrying: boolean
  dlqActive: boolean
  handleDlqToggle: () => void
  promoted: string
  handlePromotedChange: (value: string) => void
  refetch: () => void
  /** Promote confirmation dialog state – set when a conflict warning is needed. */
  confirmPromote: ConfirmPromote | null
  handleConfirmPromote: () => void
  handleCancelPromote: () => void
}

const TABLE_KEY = 'admin-llm-call-logs';
const ERROR_TYPE_PARAM = 'error_type';
const USE_CASE_PARAM = 'task';
const ONLY_ERRORS_PARAM = 'only_errors';
const RETRY_STATUS_PARAM = 'retry_status';
const PROMOTED_PARAM = 'promoted';

const ERROR_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Alle Fehlertypen' },
  { value: 'no_mapping', label: 'Kein Mapping' },
  { value: 'model_disabled', label: 'Modell deaktiviert' },
  { value: 'no_credential', label: 'Kein Credential' },
  { value: 'credential_invalid', label: 'Credential ungültig' },
  { value: 'no_prompt', label: 'Kein Prompt' },
  { value: 'prompt_variable_missing', label: 'Prompt-Variable fehlt' },
  { value: 'provider_error', label: 'Provider-Fehler' },
  { value: 'rate_limit', label: 'Rate-Limit' },
  { value: 'validation_error', label: 'Validierungsfehler' },
  { value: 'unknown', label: 'Unbekannt' },
];

const CALL_LOG_REGISTRY: TableParamRegistry = {
  [ERROR_TYPE_PARAM]: {
    default: '',
    serialize: (value: unknown): string | undefined => (value ? String(value) : undefined),
  },
  [USE_CASE_PARAM]: {
    default: '',
    serialize: (value: unknown): string | undefined => (value ? String(value) : undefined),
  },
  [ONLY_ERRORS_PARAM]: {
    default: false,
    parse: (raw: string): boolean => raw === 'true',
    serialize: (value: unknown): string | undefined => (value ? 'true' : undefined),
  },
  [RETRY_STATUS_PARAM]: {
    default: '',
    serialize: (value: unknown): string | undefined => (value ? String(value) : undefined),
  },
  [PROMOTED_PARAM]: {
    default: '',
    serialize: (value: unknown): string | undefined => (value ? String(value) : undefined),
  },
};

/**
 *
 */
export function useLLMCallLogs(
  onPromote?: (id: number, label: 'golden' | 'failure') => Promise<void>,
): UseLLMCallLogsResult {
  // ── Ref holders for filter values ──────────────────────────────────────
  const errorTypeRef = useRef('');
  const taskRef = useRef('');
  const onlyErrorsRef = useRef(false);
  const retryStatusRef = useRef('');
  const promotedRef = useRef('');

  // ── Server-side table ─────────────────────────────────────────────────
  const {
    data: rawData, total, loading, error,
    q, page, size, sort, order, tableKey, params,
    setQ, setPage, setSize, setSort, setParam,
    handleSearchChange, resetUrlState, executeLoad,
  } = useServerSideTable<CallLogOut>({
    tableKey: TABLE_KEY,
    defaultSort: 'created_at',
    defaultOrder: 'desc',
    extraParams: CALL_LOG_REGISTRY,
    onLoad: () => {
      feTrace.mark('calllogs_onload', { q, page, size, sort, order });
      void loadRef.current(
        q, errorTypeRef.current, taskRef.current,
        onlyErrorsRef.current, retryStatusRef.current, promotedRef.current,
        page, size, sort, order,
      );
    },
  });

  const load = async (
    search: string,
    errorType: string,
    task: string,
    onlyErrors: boolean,
    retryStatus: string,
    promoted: string,
    pageIndex: number,
    pageSize: number,
    sortField: string,
    sortDir: string,
  ) => {
    await executeLoad(async () => {
      const result = await fetchCallLogs({
        q: search || undefined,
        limit: pageSize,
        offset: pageIndex * pageSize,
        sort_by: sortField || undefined,
        sort_order: (sortDir as 'asc' | 'desc') || undefined,
        error_type: errorType || undefined,
        task: task || undefined,
        only_errors: onlyErrors || undefined,
        retry_status: retryStatus || undefined,
        promoted: promoted || undefined,
      });
      feTrace.mark('calllogs_fetched', { items: result.items.length, total: result.total, pageSize, pageIndex });
      return { data: result.items, total: result.total };
    });
  };

  const loadRef = useRef(load);
  useLayoutEffect(() => { loadRef.current = load; });

  // ── Filter state ──────────────────────────────────────────────────────
  const errorType = (params[ERROR_TYPE_PARAM] as string) || '';
  const task = (params[USE_CASE_PARAM] as string) || '';
  const onlyErrors = Boolean(params[ONLY_ERRORS_PARAM]);
  const retryStatus = (params[RETRY_STATUS_PARAM] as string) || '';
  const promoted = (params[PROMOTED_PARAM] as string) || '';

  // useLayoutEffect: runs before useEffect, so refs are fresh when
  // useServerSideTable's effect fires on params change
  useLayoutEffect(() => { errorTypeRef.current = errorType; });
  useLayoutEffect(() => { taskRef.current = task; });
  useLayoutEffect(() => { onlyErrorsRef.current = onlyErrors; });
  useLayoutEffect(() => { retryStatusRef.current = retryStatus; });
  useLayoutEffect(() => { promotedRef.current = promoted; });

  // ── Task options ──────────────────────────────────────────────────────
  const [taskOptions, setTaskOptions] = useState<{ value: string; label: string }[]>([]);
  const optionsInitRef = useRef(false);
  useEffect(() => {
    if (optionsInitRef.current) return;
    optionsInitRef.current = true;
    fetchTasks()
      .then((tasks) => {
        setTaskOptions([
          { value: '', label: 'Alle Tasks' },
          ...tasks.map((uc) => ({ value: uc.key, label: uc.display_name })),
        ]);
      })
      .catch(() => { /* best-effort */ });
  }, []);

  // ── Filter change handlers ────────────────────────────────────────────
  const handleErrorTypeChange = useCallback(
    (value: string) => { setParam(ERROR_TYPE_PARAM, value); setPage(0); },
    [setParam, setPage],
  );
  const handleTaskChange = useCallback(
    (value: string) => { setParam(USE_CASE_PARAM, value); setPage(0); },
    [setParam, setPage],
  );
  const handleOnlyErrorsChange = useCallback((value: string) => { setParam(ONLY_ERRORS_PARAM, value === 'true'); setPage(0); }, [setParam, setPage]);
  const handleRetryStatusDead = useCallback(() => {
    const current = (params[RETRY_STATUS_PARAM] as string) || '';
    setParam(RETRY_STATUS_PARAM, current === 'dead' ? '' : 'dead');
    setPage(0);
  }, [setParam, setPage, params]);

  const handlePromotedChange = useCallback((value: string) => {
    const current = (params[PROMOTED_PARAM] as string) || '';
    setParam(PROMOTED_PARAM, current === value ? '' : value);
    setPage(0);
  }, [setParam, setPage, params]);

  // ── Reload helper ─────────────────────────────────────────────────────
  const triggerReload = useCallback(() => {
    void loadRef.current(
      q, errorTypeRef.current, taskRef.current, onlyErrorsRef.current,
      retryStatusRef.current, promotedRef.current, page, size, sort, order,
    );
  }, [q, page, size, sort, order]);

  // ── Polling for fresh data (paused when tab is background) ────────────
  const triggerReloadRef = useRef(triggerReload);
  useLayoutEffect(() => { triggerReloadRef.current = triggerReload; });
  useEffect(() => {
    const POLL_INTERVAL_MS = 15_000;
    const id = setInterval(() => {
      if (document.hidden) return;
      triggerReloadRef.current();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // ── Retry state ───────────────────────────────────────────────────────
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const [batchRetrying, setBatchRetrying] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const handleRetry = useCallback(async (id: number) => {
    setRetryingId(id);
    try {
      await retryCallLog(id);
      toast.success('Call erneut ausgeführt – Log aktualisiert.');
      triggerReload();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      toast.error(`Retry fehlgeschlagen: ${message}`);
    } finally {
      setRetryingId(null);
    }
  }, [triggerReload]);

  const handleBatchRetry = useCallback(async (rows: CallLogTableRow[]) => {
    const ids = rows.map((r) => r.id);
    if (ids.length === 0) return;
    setBatchRetrying(true);
    setSelectedIds(new Set());
    const toastId = toast.loading(`${ids.length} Call-Logs werden wiederholt…`);
    try {
      const { job_id, queued_count } = await retryCallLogBatch(ids);
      toast.loading(`${queued_count} Call-Logs in Warteschlange…`, { id: toastId });
      const poll = async () => {
        const progress = await getTaskProgress(job_id);
        if (progress.status === 'completed' || progress.status === 'completed_with_errors') {
          const failed = (progress as unknown as Record<string, unknown>).failed as number | undefined ?? 0;
          if (progress.status === 'completed') {
            toast.success(`${progress.progress} von ${progress.total} wiederholt`, { id: toastId });
          } else {
            toast.warning(`${progress.progress} von ${progress.total} wiederholt, ${failed} fehlgeschlagen`, { id: toastId, action: { label: 'Anzeigen', onClick: () => triggerReload() } });
          }
          triggerReload();
          setBatchRetrying(false);
          return;
        }
        if (progress.status === 'failed') {
          toast.error('Batch-Retry fehlgeschlagen', { id: toastId });
          setBatchRetrying(false);
          return;
        }
        setTimeout(poll, 2000);
      };
      void poll();
    } catch (err: unknown) {
      toast.error(`Batch-Retry fehlgeschlagen: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`, { id: toastId });
      setBatchRetrying(false);
    }
  }, [triggerReload]);

  // ── Promote confirmation dialog ────────────────────────────────────────
  const [confirmPromote, setConfirmPromote] = useState<ConfirmPromote | null>(null);

  const handleConfirmPromote = useCallback(() => {
    if (confirmPromote && onPromote) { void onPromote(confirmPromote.id, confirmPromote.label); }
    setConfirmPromote(null);
  }, [confirmPromote, onPromote]);

  const handleCancelPromote = useCallback(() => { setConfirmPromote(null); }, []);

  const doPromote = useCallback((row: CallLogTableRow, label: 'golden' | 'failure') => {
    // Toggle: if already promoted with this label, un-promote instead
    if (row.promotedStatus === label) {
      void unpromoteFromDataset(row.id).then(() => triggerReload());
      return;
    }
    if (!onPromote) return;
    if (label === 'golden' && row.errorType !== null) {
      setConfirmPromote({ id: row.id, label, warning: `Call #${row.id} hat einen Fehler (${row.errorType}). Trotzdem als Golden speichern?` });
    } else {
      void onPromote(row.id, label).then(() => triggerReload());
    }
  }, [onPromote, triggerReload]);

  // ── Row actions (centralised via useTableActions) ──────────────────────
  const rowActions = useTableActions<CallLogTableRow>({
    customActions: [
      // Retry (only for failed calls)
      {
        key: 'retry',
        icon: (row: CallLogTableRow) => (retryingId === row.id ? 'loader-2' : 'refresh-cw'),
        label: 'Erneut versuchen',
        onAction: (row: CallLogTableRow) => { void handleRetry(row.id); },
        disabled: (row: CallLogTableRow) => row.success !== false || retryingId === row.id,
        disabledTitle: 'Nur für fehlgeschlagene Calls',
      },
      // Promote to Golden
      {
        key: 'promote-golden',
        icon: () => 'star',
        label: 'Als Golden speichern',
        onAction: (row: CallLogTableRow) => { doPromote(row, 'golden'); },
        filled: (row: CallLogTableRow) => row.promotedStatus === 'golden',
      },
      {
        key: 'promote-failure',
        icon: (row: CallLogTableRow) => row.promotedStatus === 'failure' ? 'x-circle' : 'x',
        label: 'Als Fehlerfall speichern',
        onAction: (row: CallLogTableRow) => { doPromote(row, 'failure'); },
        filled: (row: CallLogTableRow) => row.promotedStatus === 'failure',
      },
    ] as TableRowActionsProps<CallLogTableRow>[],
  });

  // ── Columns (no actionCell – actions via rowActions / _actions column) ──
  const columns: Record<string, TableColumnProps> = {
    id: { label: 'ID', width: '65px' },
    projectId: { label: 'Projekt', width: '70px' },
    task: {
      label: 'Task', width: '190px', search: true,
      filter: () => createElement(Dropdown, {
        items: taskOptions, selectedValue: task, onSelect: handleTaskChange,
        placeholder: 'Alle Tasks', searchable: true, searchPlaceholder: 'Task suchen…',
      }),
    },
    trigger: { label: 'Trigger', width: '110px' },
    phase: { label: 'Phase', width: '80px' },
    promotedStatus: {
      label: 'Promoted', width: '110px',
      filter: () => createElement(Dropdown, {
        items: [
          { value: '', label: 'Alle' },
          { value: 'golden', label: '⭐ Golden' },
          { value: 'failure', label: '❌ Fehlerfall' },
        ],
        selectedValue: promoted,
        onSelect: (v: string) => handlePromotedChange(v),
        placeholder: 'Promoted',
      }),
    },
    statusCell: {
      label: 'Status', width: '110px',
      filter: () => createElement(Dropdown, {
        items: [{ value: '', label: 'Alle' }, { value: 'true', label: 'Nur Fehler' }],
        selectedValue: onlyErrors ? 'true' : '', onSelect: handleOnlyErrorsChange, placeholder: 'Status',
      }),
    },
    errorTypeCell: {
      label: 'Fehlertyp', width: '170px',
      filter: () => createElement(Dropdown, {
        items: ERROR_TYPE_OPTIONS, selectedValue: errorType, onSelect: handleErrorTypeChange, placeholder: 'Alle Fehlertypen',
      }),
    },
    model: { label: 'Modell', width: '160px' },
    credential: { label: 'Credential', width: '160px' },
    tokens: { label: 'Tokens', width: '90px', alignment: 'right', sortable: false, tooltipField: 'tokensTooltip' },
    duration: { label: 'Dauer', width: '90px' },
    createdAt: { label: 'Zeit', width: '170px', defaultSort: 'desc' },
  };

  // ── Format raw API rows → display rows ────────────────────────────────
  const data = useMemo(() => formatCallLogRows(rawData), [rawData]);

  return {
    table: buildTableState({
      data, total, q, page, size, sort, order, tableKey,
      setQ, setPage, setSize, setSort, handleSearchChange, resetUrlState,
    }),
    columns,
    rowActions,
    loading,
    error,
    selectedIds,
    handleBatchRetry,
    batchRetrying,
    dlqActive: retryStatus === 'dead',
    handleDlqToggle: handleRetryStatusDead,
    promoted,
    handlePromotedChange,
    refetch: triggerReload,
    confirmPromote,
    handleConfirmPromote,
    handleCancelPromote,
  };
}
