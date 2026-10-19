/**
 * CareerEntryColumns – Spalten-Definitionen und Typen (kein JSX).
 *
 * Separates constants/types from components to satisfy
 * react-refresh/only-export-components (Muster: PortfolioAdminTableColumns).
 *
 * Columns: position (plain text), company / project_url (inline edit),
 * start/end (DateInput), description DE/EN (inline textarea), status, actions.
 * The `sort` field is deliberately NOT a visible column – the order is
 * maintained via drag&drop (index = sort).
 */

import { buildGhostRowValidator } from '@src/components/table/buildGhostRowValidator';

export interface CareerColumnDef {
  key: CareerColumnKey;
  label: string;
  /** Fixed column width (CSS length); omit for flexible auto-width columns. */
  width?: string;
  /** Compact columns (drag handle / actions) get tighter alignment. */
  compact?: boolean;
  /** Ghost row input type; columns without `ghost` render empty ghost cells. */
  ghost?: 'text' | 'date' | 'textarea';
  ghostPlaceholder?: string;
}

export type CareerColumnKey =
  | '_drag'
  | 'position'
  | 'company'
  | 'project_url'
  | 'start_date'
  | 'end_date'
  | 'description_de'
  | 'description_en'
  | 'status'
  | '_actions';

/** Static column definitions – order defines the table layout. */
export const CAREER_COLUMNS: CareerColumnDef[] = [
  { key: '_drag',          label: '',                  width: '40px',  compact: true },
  { key: 'position',       label: 'Position',          width: '200px', ghost: 'text',     ghostPlaceholder: 'Senior TYPO3 Developer, gjo:Se, Berlin' },
  { key: 'company',        label: 'Firma',             width: '140px', ghost: 'text',     ghostPlaceholder: 'Firma (optional)' },
  { key: 'project_url',    label: 'Projekt-URL',       width: '160px', ghost: 'text',     ghostPlaceholder: 'https://… (optional)' },
  { key: 'start_date',     label: 'Start',             width: '110px', ghost: 'date',     ghostPlaceholder: '2020-01-01' },
  { key: 'end_date',       label: 'Ende',              width: '110px', ghost: 'date',     ghostPlaceholder: 'leer = heute' },
  { key: 'description_de', label: 'Beschreibung (DE)',                 ghost: 'textarea', ghostPlaceholder: 'Beschreibung DE (optional)' },
  { key: 'description_en', label: 'Beschreibung (EN)' },
  { key: 'status',         label: 'Status',            width: '80px' },
  { key: '_actions',       label: '',                  width: '100px', compact: true },
];

/** Ghost-row validator: position and start_date are required. */
export const validateCareerGhost = buildGhostRowValidator([
  { field: 'position', label: 'Position' },
  { field: 'start_date', label: 'Start-Datum' },
]);
