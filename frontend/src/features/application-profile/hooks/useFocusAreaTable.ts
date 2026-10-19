/**
 * useFocusAreaTable – Data hook for the focus areas admin table.
 *
 * Loads all focus areas once (BE sorts by `sort` ASC), provides client-side
 * search, ghost-row create, per-field inline edit (localized titles/summaries
 * always send the complete translations map – the BE replaces the whole
 * translation set), delete. No DnD/reorder (MVP: order = `sort`, set on create).
 * Golden reference: useCareerEntryTable.
 */
import { useCallback } from 'react';

import { useClientRowList } from '@src/hooks/useClientRowList';
import {
  createFocusArea,
  deleteFocusArea,
  listFocusAreas,
  updateFocusArea,
} from '@src/lib/api/applicationProfile';
import type {
  FocusAreaLocaleFields,
  FocusAreaOut,
  FocusAreaUpdate,
} from '@src/lib/api/applicationProfile';

// ── Row model (snake_case, matching the table columns) ──────────────────────

/** Client-side row shape for the focus areas table. */
export interface FocusAreaRow {
  id: number;
  slug: string;
  url: string | null;
  sort: number;
  title_de: string | null;
  title_en: string | null;
  summary_de: string | null;
  summary_en: string | null;
  /** Raw locale → fields map; required to send complete translation updates. */
  translations: Record<string, FocusAreaLocaleFields>;
}

export interface UseFocusAreaTableResult {
  /** Filtered rows (active search applied). */
  rows: FocusAreaRow[];
  totalCount: number;
  search: string;
  setSearch: (value: string) => void;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  onGhostCreate: (data: Record<string, string>) => Promise<void>;
  onFieldSave: (row: FocusAreaRow, field: string, value: string) => Promise<void>;
  handleDelete: (row: FocusAreaRow) => Promise<void>;
}

// ── Hook ────────────────────────────────────────────────────────────────────

/** Client-side search across slug and both titles. */
function filterFocusAreaRow(row: FocusAreaRow, query: string): boolean {
  return (
    row.slug.toLowerCase().includes(query) ||
    (row.title_de ?? '').toLowerCase().includes(query) ||
    (row.title_en ?? '').toLowerCase().includes(query)
  );
}

/** Maps the camelCase API response to the snake_case row shape. */
function toRow(area: FocusAreaOut): FocusAreaRow {
  return {
    id: area.id,
    slug: area.slug,
    url: area.url ?? null,
    sort: area.sort,
    title_de: area.translations?.de?.title ?? null,
    title_en: area.translations?.en?.title ?? null,
    summary_de: area.translations?.de?.summary ?? null,
    summary_en: area.translations?.en?.summary ?? null,
    translations: area.translations ?? {},
  };
}

/**
 *
 */
export function useFocusAreaTable(): UseFocusAreaTableResult {
  const { rows, totalCount, search, setSearch, loading, error, reload } =
    useClientRowList<FocusAreaRow, FocusAreaOut>({
      fetchRows: listFocusAreas,
      mapRow: toRow,
      filterRow: filterFocusAreaRow,
    });

  // ── Ghost row create ───────────────────────────────────────────────────
  const onGhostCreate = useCallback(
    async (data: Record<string, string>): Promise<void> => {
      const slug = (data.slug ?? '').trim();
      if (!slug) throw new Error('Slug ist ein Pflichtfeld.');
      const titleDe = (data.title_de ?? '').trim();
      if (!titleDe) throw new Error('Titel (DE) ist ein Pflichtfeld.');
      await createFocusArea({
        slug,
        url: (data.url ?? '').trim() || null,
        translations: {
          de: { title: titleDe, summary: (data.summary_de ?? '').trim() || null },
          en: {
            title: (data.title_en ?? '').trim() || null,
            summary: (data.summary_en ?? '').trim() || null,
          },
        },
      });
      await reload();
    },
    [reload],
  );

  // ── Inline edit (per field) ────────────────────────────────────────────
  const onFieldSave = useCallback(
    async (row: FocusAreaRow, field: string, value: string): Promise<void> => {
      if (
        field === 'title_de' ||
        field === 'title_en' ||
        field === 'summary_de' ||
        field === 'summary_en'
      ) {
        // The BE replaces the whole translation set when `translations` is
        // present – always send the complete map including the other locale
        // and the sibling field of the edited locale.
        const locale = field.endsWith('_de') ? 'de' : 'en';
        const fieldKey: keyof FocusAreaLocaleFields = field.startsWith('title')
          ? 'title'
          : 'summary';
        await updateFocusArea(row.id, {
          translations: {
            ...row.translations,
            [locale]: {
              ...row.translations?.[locale],
              [fieldKey]: value || null,
            },
          },
        });
      } else {
        const payload: FocusAreaUpdate = {};
        if (field === 'slug') payload.slug = value;
        else if (field === 'url') payload.url = value || null;
        await updateFocusArea(row.id, payload);
      }
      await reload();
    },
    [reload],
  );

  // ── Delete ─────────────────────────────────────────────────────────────
  const handleDelete = useCallback(
    async (row: FocusAreaRow): Promise<void> => {
      await deleteFocusArea(row.id);
      await reload();
    },
    [reload],
  );

  return {
    rows,
    totalCount,
    search,
    setSearch,
    loading,
    error,
    reload,
    onGhostCreate,
    onFieldSave,
    handleDelete,
  };
}
