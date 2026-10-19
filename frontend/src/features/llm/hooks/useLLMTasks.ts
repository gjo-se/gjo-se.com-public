/**
 * useLLMTasks – Data-loading hook for the LLM tasks overview table.
 *
 * Loads all tasks (registry + mapping + active prompt version) once and
 * exposes columns, rowActions, and table state for the Table compound
 * component. Clicking a row opens the dedicated task detail page.
 */
import { createElement, useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import StatusCell from '@src/components/atoms/StatusCell/StatusCell';
import type { TableColumnProps, TableRowActionsProps, TableStateProps } from '@src/components/table';
import { buildTableState } from '@src/components/table/buildTableState';
import { useClientTableState } from '@src/components/table/useClientTableState';
import { useTableActions } from '@src/components/table/useTableActions';
import { syncActiveIdToUrl } from '@src/components/table/useTableUrlState';
import { useMountOnce } from '@src/hooks/useMountOnce';
import { routeConfig } from '@src/router.config';

import { fetchTasks, type TaskWithMapping } from '../services/taskMappingService';

// ── Table row type ──────────────────────────────────────────────────────

export interface TaskTableRow {
  id: string
  displayName: string
  description: string
  provider: string
  model: string
  prompt: string
  /** Boolean flag read by TableRowActions for the toggle button. */
  active: boolean
  status: string | null
  status_color_token: string | null
  task: TaskWithMapping
}

// ── Columns ──────────────────────────────────────────────────────────────

const taskColumns: Record<string, TableColumnProps> = {
  displayName: { label: 'Task', width: '260px', search: true, defaultSort: 'asc', tooltipField: 'description' },
  provider: { label: 'Provider', width: '200px' },
  model: { label: 'Modell', width: '220px' },
  prompt: { label: 'Prompt', width: '120px' },
};

const TABLE_KEY = 'admin-llm-tasks';
const EM_DASH = '\u2013';

export interface UseLLMTasksResult {
  table: TableStateProps<TaskTableRow>
  columns: Record<string, TableColumnProps>
  rowActions: TableRowActionsProps<TaskTableRow>[]
  loading: boolean
  error: string | null
}

/**
 * Builds the credential identity label: portal · provider · label.
 *
 * Combining all three makes the concrete key unambiguous (e.g.
 * "direct · deepseek · gjo-se.com" vs. "openrouter · gjo-se.com"), matching the
 * credential overview page. Empty parts are skipped.
 */
function formatProviderLabel(task: TaskWithMapping): string {
  const mapping = task.mapping;
  if (!mapping?.credential_id) return EM_DASH;
  const parts = [mapping.credential_portal, mapping.credential_provider, mapping.credential_label]
    .filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(' \u00b7 ') : EM_DASH;
}

/** Builds the workflow tooltip showing allowed triggers. */
function formatWorkflowTooltip(task: TaskWithMapping): string {
  return `Triggers: ${task.allowed_triggers.join(', ')}`;
}

/** Loads all tasks once and wires row-click navigation to the detail page. */
export function useLLMTasks(): UseLLMTasksResult {
  const navigate = useNavigate();
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

  const [tasks, setTasks] = useState<TaskWithMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTasks();
      setTasks(data);
    } catch {
      setError('Fehler beim Laden der Tasks.');
    } finally {
      setLoading(false);
    }
  }, []);

  useMountOnce(load);

  const data: TaskTableRow[] = tasks.map((uc) => ({
    id: uc.key,
    displayName: uc.display_name,
    description: formatWorkflowTooltip(uc),
    provider: formatProviderLabel(uc),
    model: uc.mapping?.model_display_name ?? EM_DASH,
    prompt: uc.active_prompt_version != null ? `v${uc.active_prompt_version}` : 'Kein Prompt',
    active: uc.mapping?.active ?? false,
    status: uc.mapping?.status ?? null,
    status_color_token: uc.mapping?.status_color_token ?? null,
    task: uc,
  }));

  const rowActions = useTableActions<TaskTableRow>({
    onEdit: async (row) => {
      syncActiveIdToUrl(TABLE_KEY, row.id);
      const from = `${window.location.pathname}${window.location.search}`;
      navigate(routeConfig.adminLlmTaskDetail.path.replace(':key', row.id), { state: { from } });
    },
  });

  const columns = useMemo(() => ({
    ...taskColumns,
    status: {
      label: 'Status',
      width: '60px',
      sortable: false,
      renderCell: (row: Record<string, unknown>) =>
        createElement(StatusCell, {
          statusableType: 'llm_task_model_config',
          statusableId: (row as unknown as TaskTableRow).task.mapping?.id ?? 0,
          currentStatus: row.status as string | null | undefined,
          currentColor: row.status_color_token as string | null | undefined,
        }),
    },
  }), []);

  return {
    table: buildTableState({
      data, total: data.length, q, page, size,
      sort, order, tableKey: TABLE_KEY,
      setQ, setPage, setSize, setSort,
      handleSearchChange, resetUrlState,
    }),
    columns,
    rowActions,
    loading,
    error,
  };
}
