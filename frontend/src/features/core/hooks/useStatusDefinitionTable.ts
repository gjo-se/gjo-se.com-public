/**
 * useStatusDefinitionTable – Feature hook for the Core Status admin table.
 *
 * Dünner Wrapper um den generischen `useDefinitionTable` (URL-synced State,
 * client-seitiges Filter/Sort/Paginate, Ghost-Row, Delete, Inline-Edits).
 */

import {
  useDefinitionTable,
  type UseDefinitionTableResult,
} from '@src/components/table/useDefinitionTable';
import {
  createCoreStatus,
  deleteCoreStatus,
  fetchCoreStatuses,
  updateCoreStatus,
  type CoreStatusCreate,
  type CoreStatusOut,
  type CoreStatusUpdate,
} from '@src/lib/api/coreCatalog';

import { createStatusColumns } from '../shared/createStatusColumns';

// ── Constants ────────────────────────────────────────────────────────────

const TABLE_KEY = 'admin-core-status';

// ── Types ────────────────────────────────────────────────────────────────

/** Row type for the status table – direct alias of the backend schema. */
export type StatusDefinitionRow = CoreStatusOut;

export type UseStatusDefinitionTableResult = UseDefinitionTableResult<StatusDefinitionRow>;

// ── Hook ─────────────────────────────────────────────────────────────────

/** Server-side table hook for Core Status admin page. */
export function useStatusDefinitionTable(): UseStatusDefinitionTableResult {
  return useDefinitionTable<StatusDefinitionRow, CoreStatusUpdate>({
    tableKey: TABLE_KEY,
    fetchAll: () => fetchCoreStatuses(),
    create: (payload) =>
      createCoreStatus({
        name: payload.name,
        category: payload.category,
        color_token: payload.color_token,
        description: payload.description,
        scope: payload.scope,
      } as CoreStatusCreate),
    update: (id, patch) => updateCoreStatus(id, patch),
    remove: deleteCoreStatus,
    buildColumns: createStatusColumns,
    deleteDisabled: (row) => row.usage_count > 0,
    deleteDisabledTitle: 'Status wird verwendet',
  });
}
