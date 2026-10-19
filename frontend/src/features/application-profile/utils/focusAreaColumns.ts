/**
 * FocusAreaColumns – Spalten-Definitionen und Typen (kein JSX).
 *
 * Separates constants/types from components to satisfy
 * react-refresh/only-export-components (Muster: CareerEntryColumns).
 *
 * Columns: slug / title DE / title EN / url (inline text),
 * summary DE / EN (inline textarea), actions. The `sort` field is deliberately
 * NOT a visible column – order follows the create sequence (no DnD in the MVP).
 */

import { buildGhostRowValidator } from '@src/components/table/buildGhostRowValidator';

export interface FocusAreaColumnDef {
  key: FocusAreaColumnKey;
  label: string;
  /** Fixed column width (CSS length); omit for flexible auto-width columns. */
  width?: string;
  /** Compact columns (actions) get tighter alignment. */
  compact?: boolean;
  /** Ghost row input type; columns without `ghost` render empty ghost cells. */
  ghost?: 'text' | 'textarea';
  ghostPlaceholder?: string;
}

export type FocusAreaColumnKey =
  | 'slug'
  | 'title_de'
  | 'title_en'
  | 'summary_de'
  | 'summary_en'
  | 'url'
  | '_actions';

/** Static column definitions – order defines the table layout. */
export const FOCUS_AREA_COLUMNS: FocusAreaColumnDef[] = [
  { key: 'slug',       label: 'Slug',           width: '150px', ghost: 'text',     ghostPlaceholder: 'ai | architecture | clean-code' },
  { key: 'title_de',   label: 'Titel (DE)',     width: '170px', ghost: 'text',     ghostPlaceholder: 'Titel DE (Pflicht)' },
  { key: 'title_en',   label: 'Titel (EN)',     width: '170px', ghost: 'text',     ghostPlaceholder: 'Titel EN (optional)' },
  { key: 'summary_de', label: 'Kurztext (DE)',                 ghost: 'textarea', ghostPlaceholder: 'Kurztext DE (optional)' },
  { key: 'summary_en', label: 'Kurztext (EN)',                 ghost: 'textarea', ghostPlaceholder: 'Kurztext EN (optional)' },
  { key: 'url',        label: 'Link',           width: '150px', ghost: 'text',     ghostPlaceholder: 'https://… (optional)' },
  { key: '_actions',   label: '',               width: '80px',  compact: true },
];

/** Ghost-row validator: slug and title_de are required. */
export const validateFocusAreaGhost = buildGhostRowValidator([
  { field: 'slug', label: 'Slug' },
  { field: 'title_de', label: 'Titel (DE)' },
]);
