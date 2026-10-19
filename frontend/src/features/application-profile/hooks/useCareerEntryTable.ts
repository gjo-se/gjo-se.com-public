/**
 * useCareerEntryTable – Data hook for the career entries admin table.
 *
 * Loads all career entries once (BE sorts by `sort` ASC), provides
 * client-side search, ghost-row create, per-field inline edit (localized
 * descriptions always send the complete translations map – the BE replaces
 * the whole translation set), delete and DnD reorder.
 * Golden reference: usePortfolioAdminTable.
 */
import { useCallback } from 'react';

import { useClientRowList } from '@src/hooks/useClientRowList';
import {
  createCareerEntry,
  deleteCareerEntry,
  listCareerEntries,
  reorderCareerEntries,
  updateCareerEntry,
} from '@src/lib/api/applicationProfile';
import type { CareerEntryOut, CareerEntryUpdate, CareerLocaleFields } from '@src/lib/api/applicationProfile';

// ── Row model (snake_case, matching the table columns) ──────────────────────

/** Client-side row shape for the career entries table. */
export interface CareerRow {
  id: number;
  position: string;
  company: string | null;
  project_url: string | null;
  start_date: string;
  end_date: string | null;
  description_de: string | null;
  description_en: string | null;
  status: string | null;
  status_color_token: string | null;
  /** Raw locale → fields map; required to send complete translation updates. */
  translations: Record<string, CareerLocaleFields>;
}

export interface UseCareerEntryTableResult {
  /** Filtered rows (active search applied). */
  rows: CareerRow[];
  totalCount: number;
  search: string;
  setSearch: (value: string) => void;
  /** Dragging is disabled while a search filter is active (sort safety). */
  sortableEnabled: boolean;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  onGhostCreate: (data: Record<string, string>) => Promise<void>;
  onFieldSave: (row: CareerRow, field: string, value: string) => Promise<void>;
  handleReorder: (orderedIds: number[]) => Promise<void>;
  handleDelete: (row: CareerRow) => Promise<void>;
}

// ── Hook ────────────────────────────────────────────────────────────────────

/** Client-side search across position and company. */
function filterCareerRow(row: CareerRow, query: string): boolean {
  return (
    row.position.toLowerCase().includes(query) ||
    (row.company ?? '').toLowerCase().includes(query)
  );
}

/** Maps the camelCase API response to the snake_case row shape. */
function toRow(entry: CareerEntryOut): CareerRow {
  return {
    id: entry.id,
    position: entry.position,
    company: entry.company ?? null,
    project_url: entry.projectUrl ?? null,
    start_date: entry.startDate,
    end_date: entry.endDate ?? null,
    description_de: entry.translations?.de?.description ?? null,
    description_en: entry.translations?.en?.description ?? null,
    status: entry.status ?? null,
    status_color_token: entry.status_color_token ?? null,
    translations: entry.translations ?? {},
  };
}

/**
 *
 */
export function useCareerEntryTable(): UseCareerEntryTableResult {
  const { rows, totalCount, search, setSearch, loading, error, reload } =
    useClientRowList<CareerRow, CareerEntryOut>({
      fetchRows: listCareerEntries,
      mapRow: toRow,
      filterRow: filterCareerRow,
    });

  const sortableEnabled = !search.trim();

  // ── Ghost row create ───────────────────────────────────────────────────
  const onGhostCreate = useCallback(
    async (data: Record<string, string>): Promise<void> => {
      const position = (data.position ?? '').trim();
      const startDate = (data.start_date ?? '').trim();
      if (!position) throw new Error('Position ist ein Pflichtfeld.');
      if (!startDate) throw new Error('Start-Datum ist ein Pflichtfeld.');
      const descriptionDe = (data.description_de ?? '').trim();
      await createCareerEntry({
        position,
        company: (data.company ?? '').trim() || null,
        project_url: (data.project_url ?? '').trim() || null,
        start_date: startDate,
        end_date: (data.end_date ?? '').trim() || null,
        translations: descriptionDe ? { de: { description: descriptionDe } } : undefined,
      });
      await reload();
    },
    [reload],
  );

  // ── Inline edit (per field) ────────────────────────────────────────────
  const onFieldSave = useCallback(
    async (row: CareerRow, field: string, value: string): Promise<void> => {
      if (field === 'description_de' || field === 'description_en') {
        // The BE replaces the whole translation set when `translations` is
        // present – always send the complete map including the other locale.
        const locale = field === 'description_de' ? 'de' : 'en';
        await updateCareerEntry(row.id, {
          translations: {
            ...row.translations,
            [locale]: { description: value || null },
          },
        });
      } else {
        const payload: CareerEntryUpdate = {};
        if (field === 'position') payload.position = value;
        else if (field === 'company') payload.company = value || null;
        else if (field === 'project_url') payload.project_url = value || null;
        else if (field === 'start_date') payload.start_date = value || null;
        else if (field === 'end_date') payload.end_date = value || null;
        await updateCareerEntry(row.id, payload);
      }
      await reload();
    },
    [reload],
  );

  // ── DnD reorder ────────────────────────────────────────────────────────
  const handleReorder = useCallback(
    async (orderedIds: number[]): Promise<void> => {
      await reorderCareerEntries(orderedIds);
      await reload();
    },
    [reload],
  );

  // ── Delete ─────────────────────────────────────────────────────────────
  const handleDelete = useCallback(
    async (row: CareerRow): Promise<void> => {
      await deleteCareerEntry(row.id);
      await reload();
    },
    [reload],
  );

  return {
    rows,
    totalCount,
    search,
    setSearch,
    sortableEnabled,
    loading,
    error,
    reload,
    onGhostCreate,
    onFieldSave,
    handleReorder,
    handleDelete,
  };
}
