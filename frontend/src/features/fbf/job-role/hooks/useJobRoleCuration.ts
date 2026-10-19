/**
 * useJobRoleCuration – Standard-table state for the FBF job role curation view.
 *
 * Loads all job roles (client-side table), exposes search + status filter,
 * the per-row reassign dropdown, icon row-actions (confirmed toggle, delete)
 * and a bulk "confirm" action. Mirrors the shared Table contract used across
 * the admin area.
 */

import { createElement, useCallback, useEffect, useMemo, useState } from 'react';

import StatusCell from '@src/components/atoms/StatusCell/StatusCell';
import StatusFilter from '@src/components/molecules/StatusFilter/StatusFilter';
import type { TableBulkActionProps, TableColumnProps, TableRowActionsProps, TableStateProps } from '@src/components/table';
import { buildTableState } from '@src/components/table/buildTableState';
import { useTableActions } from '@src/components/table/useTableActions';
import { useTableUrlState } from '@src/components/table/useTableUrlState';
import type { TableParamRegistry } from '@src/components/table/useTableUrlState';
import { showErrorToast } from '@src/lib/errorToast';

import { confirmRows, requireGhostName } from '../../utils/curation';
import { createJobRole } from '../services/createJobRole';
import {
  confirmJobRoles,
  fetchAdminJobRoles,
  fetchConfirmedJobRoles,
  reassignJobRole,
  updateJobRoleName,
  type JobRoleAdminOut,
} from '../services/curation';
import { deleteJobRoleById } from '../services/deleteJobRole';
import { type JobRoleCurationRow, buildJobRoleRows } from '../utils/jobRoleCuration';

import { JOB_ROLES_CHANGED_EVENT } from './useJobRolePendingCount';

export type { JobRoleCurationRow } from '../utils/jobRoleCuration';

export interface UseJobRoleCurationResult {
  table: TableStateProps<JobRoleCurationRow>
  columns: Record<string, TableColumnProps>
  rowActions: TableRowActionsProps<JobRoleCurationRow>[]
  bulkActions: TableBulkActionProps<JobRoleCurationRow>[]
  loading: boolean
  error: string | null
  onGhostCreate: (data: Record<string, unknown>) => Promise<unknown>
}

const TABLE_KEY = 'admin-jobroles';
const STATUS_PARAM = 'status';

const JOBROLE_REGISTRY: TableParamRegistry = {
  [STATUS_PARAM]: {
    default: '',
    serialize: (value: unknown): string | undefined => (value ? String(value) : undefined),
  },
};

/** Orchestrates the job role curation table: load, filter, reassign, toggle, delete, bulk-confirm. */
export function useJobRoleCuration(): UseJobRoleCurationResult {
  const {
    q, page, size, sort, order, params,
    setQ, setPage, setSize, setSort, setParam, resetUrlState,
  } = useTableUrlState(TABLE_KEY, JOBROLE_REGISTRY);

  const statusFilter = (params[STATUS_PARAM] as string) || '';

  const [roles, setRoles] = useState<JobRoleAdminOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (notify = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminJobRoles({ status: statusFilter || undefined });
      setRoles(data);
      if (notify) {
        window.dispatchEvent(new Event(JOB_ROLES_CHANGED_EVENT));
      }
    } catch {
      setError('Fehler beim Laden der Job-Rollen.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  // Reload on external events (create, etc.) — skip if already loading.
  useEffect(() => {
    const handler = () => { void load(); };
    window.addEventListener(JOB_ROLES_CHANGED_EVENT, handler);
    return () => window.removeEventListener(JOB_ROLES_CHANGED_EVENT, handler);
  }, [load]);

  const [confirmedRoles, setConfirmedRoles] = useState<JobRoleAdminOut[]>([]);

  const loadConfirmed = useCallback(async () => {
    try {
      const data = await fetchConfirmedJobRoles();
      setConfirmedRoles(data);
    } catch {
      // Best-effort: keep stale confirmed list.
    }
  }, []);

  useEffect(() => {
    void loadConfirmed();
  }, [loadConfirmed]);

  const handleReassign = useCallback(async (roleId: number, targetId: number | null) => {
    try {
      await reassignJobRole(roleId, targetId);
      await load(true);
      await loadConfirmed();
    } catch {
      showErrorToast('Fehler beim Umhängen der Projekte.');
    }
  }, [load, loadConfirmed]);

  const handleStatusFilterChange = useCallback((value: string) => {
    setParam(STATUS_PARAM, value);
    setPage(0);
  }, [setParam, setPage]);

  const handleRename = useCallback(async (roleId: number, name: string) => {
    const role = roles.find((r) => r.id === roleId);
    if (!role || role.name === name) return;
    // Optimistic local update keeps the row in place (no reload → no re-sort jump).
    setRoles((prev) => prev.map((r) => (r.id === roleId ? { ...r, name } : r)));
    try {
      await updateJobRoleName(role, name);
    } catch {
      showErrorToast('Fehler beim Umbenennen der Job-Rolle.');
      await load();
    }
  }, [roles, load]);

  const handleSearchChange = useCallback((value: string) => {
    setQ(value);
    setPage(0);
  }, [setQ, setPage]);

  // ── Ghost Row create (Cmd+Enter → Enter) ────────────────────────────────
  const onGhostCreate = useCallback(
    async (data: Record<string, unknown>): Promise<unknown> => {
      const name = requireGhostName(data);
      const result = await createJobRole({ name, status: 'pending' });
      if (!result) throw new Error('Fehler beim Anlegen.');
      await load(true);
      return result;
    },
    [load],
  );

  const columns: Record<string, TableColumnProps> = {
    name: {
      label: 'Name',
      width: '260px',
      search: true,
      defaultSort: 'asc',
      inlineEdit: true,
      onInlineEdit: (row, value) => handleRename(row.id as number, value),
      ghostInput: 'text',
      ghostPlaceholder: 'Job-Rollen-Name…',
      filter: () => createElement(StatusFilter, {
        statusableType: 'fbf_job_role',
        selectedValue: statusFilter,
        onSelect: handleStatusFilterChange,
      }),
    },
    project_count: { label: 'Projects', width: '90px' },
    reassign: { label: 'Projekte umhängen', width: '220px', sortable: false },
    status: {
      label: 'Status',
      width: '60px',
      sortable: false,
      renderCell: (row) => {
        const role = roles.find((r) => r.id === row.id);
        if (!role) return null;
        return createElement(StatusCell, {
          statusableType: 'fbf_job_role',
          statusableId: role.id,
          currentStatus: role.status,
          currentColor: role.status_color_token,
        });
      },
    },
  };

  const data = useMemo(
    () => buildJobRoleRows(roles, confirmedRoles, handleReassign),
    [roles, confirmedRoles, handleReassign],
  );

  const rowActions = useTableActions<JobRoleCurationRow>({
    onDelete: async (row) => {
      try {
        await deleteJobRoleById(row.id);
        await load(true);
      } catch {
        showErrorToast('Job-Rolle wird von Projekten verwendet und kann nicht gelöscht werden.');
      }
    },
    deleteDisabled: (row) => row.project_count > 0,
    deleteDisabledTitle: 'Wird von Projekten verwendet – nicht löschbar',
  });

  const bulkActions: TableBulkActionProps<JobRoleCurationRow>[] = [
    {
      key: 'confirm',
      label: 'Bestätigen',
      onAction: async (rows) => {
        if (await confirmRows(rows, confirmJobRoles, 'Fehler beim Bestätigen der Job-Rollen.')) {
          await load(true);
          await loadConfirmed();
        }
      },
    },
  ];

  return {
    table: buildTableState({
      data, total: data.length, q, page, size,
      sort, order, tableKey: TABLE_KEY,
      setQ, setPage, setSize, setSort,
      handleSearchChange, resetUrlState,
    }),
    columns,
    rowActions,
    bulkActions,
    loading,
    error,
    onGhostCreate,
  };
}
