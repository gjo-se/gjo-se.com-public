/**
 * ExperienceColumns – Spalten-Definitionen und Typen (kein JSX).
 *
 * Separates constants/types from components to satisfy
 * react-refresh/only-export-components (Muster: CareerEntryColumns).
 *
 * Columns: position (Rolle), period (berechnet aus start/end),
 * context (DE-Kontext) und company (intern). Es gibt KEINEN Inline-Edit –
 * alle Felder werden im Overlay (ExperienceDialog) gepflegt, поэтому die
 * Zeilen sind reine Text-Anzeigen. Das Drag-Handle (`_drag`) steuert `sort`.
 */

export interface ExperienceColumnDef {
  key: ExperienceColumnKey;
  label: string;
  /** Fixed column width (CSS length); omit for flexible auto-width columns. */
  width?: string;
  /** Compact columns (drag handle / actions) get tighter alignment. */
  compact?: boolean;
  /** Renders the cell text in the muted color token. */
  muted?: boolean;
}

export type ExperienceColumnKey =
  | '_drag'
  | 'position'
  | 'period'
  | 'context'
  | 'company'
  | '_actions';

/** Static column definitions – order defines the table layout. */
export const EXPERIENCE_COLUMNS: ExperienceColumnDef[] = [
  { key: '_drag',    label: '',                width: '40px',  compact: true },
  { key: 'position', label: 'Rolle',           width: '220px' },
  { key: 'period',   label: 'Zeitraum',        width: '160px' },
  { key: 'context',  label: 'Kontext (DE)',    muted: true },
  { key: 'company',  label: 'Firma (intern)',  width: '160px', muted: true },
  { key: '_actions', label: '',                width: '80px',  compact: true },
];

/** Converts an ISO date (`YYYY-MM-DD`) to `MM/YYYY`; returns '' when unparsable. */
function formatMonthYear(iso: string): string {
  const [year, month] = iso.split('-');
  if (!year || !month) return '';
  return `${month}/${year}`;
}

/**
 * Formats an experience period as `MM/YYYY – MM/YYYY`.
 * Example: `03/2024 – 11/2024`. An open end date renders as `heute`.
 */
export function formatPeriod(startDate: string, endDate: string | null): string {
  const start = formatMonthYear(startDate);
  const end = endDate ? formatMonthYear(endDate) : 'heute';
  if (!start) return endDate ? end : '—';
  return `${start} – ${end}`;
}
