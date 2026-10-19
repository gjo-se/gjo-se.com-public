/**
 * useTagDefinitionTable – Feature hook for the Core Tags admin table.
 *
 * Dünner Wrapper um den generischen `useDefinitionTable` (URL-synced State,
 * client-seitiges Filter/Sort/Paginate, Ghost-Row, Delete, Inline-Edits).
 */

import { useState } from 'react';

import {
  useDefinitionTable,
  type UseDefinitionTableResult,
} from '@src/components/table/useDefinitionTable';
import {
  createCoreTag,
  deleteCoreTag,
  fetchCoreTags,
  updateCoreTag,
  type CoreTagCreate,
  type CoreTagOut,
  type CoreTagUpdate,
} from '@src/lib/api/coreCatalog';

import { createTagColumns } from '../shared/createTagColumns';

// ── Constants ────────────────────────────────────────────────────────────

const TABLE_KEY = 'admin-core-tags';

// ── Types ────────────────────────────────────────────────────────────────

/** Row type for the tags table – direct alias of the backend schema. */
export type TagDefinitionRow = CoreTagOut;

export interface UseTagDefinitionTableResult extends UseDefinitionTableResult<TagDefinitionRow> {
  /** Opens usage Sheet for a given tag. */
  selectedTag: TagDefinitionRow | null;
  /** Sets the currently selected tag for the Sheet. */
  setSelectedTag: (tag: TagDefinitionRow | null) => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────

/** Server-side table hook for Core Tags admin page. */
export function useTagDefinitionTable(): UseTagDefinitionTableResult {
  const table = useDefinitionTable<TagDefinitionRow, CoreTagUpdate>({
    tableKey: TABLE_KEY,
    fetchAll: () => fetchCoreTags(),
    create: (payload) =>
      createCoreTag({
        name: payload.name,
        category: payload.category,
        color_token: payload.color_token,
        description: payload.description,
        scope: payload.scope,
      } as CoreTagCreate),
    update: (id, patch) => updateCoreTag(id, patch),
    remove: deleteCoreTag,
    buildColumns: createTagColumns,
    deleteDisabled: (row) => row.usage_count > 0,
    deleteDisabledTitle: 'Tag wird verwendet',
  });

  const [selectedTag, setSelectedTag] = useState<TagDefinitionRow | null>(null);

  return { ...table, selectedTag, setSelectedTag };
}
