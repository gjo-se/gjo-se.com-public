/**
 * PortfolioAdminTableColumns – Spalten-Definitionen und Typen (kein JSX).
 *
 * Separates constants/types from components to satisfy
 * react-refresh/only-export-components.
 */

import { buildGhostRowValidator } from '@src/components/table/buildGhostRowValidator';

type PortfolioColumnKey =
  | '_drag'
  | 'title'
  | 'sub_title'
  | 'status'
  | '_actions';

/** Height of the table row for consistent drag alignment. */
export const PORTFOLIO_ROW_HEIGHT = 56;

export interface PortfolioColumnDef {
  key: PortfolioColumnKey;
  label: string;
  width: string;
  /** Compact columns (drag handle / actions) get tighter alignment. */
  compact?: boolean;
}

/**
 * Static column definitions for the portfolio admin list.
 *
 * The `sort` field is deliberately NOT a visible column – the order is
 * maintained via drag&drop (index = sort).
 */
export const PORTFOLIO_COLUMNS: PortfolioColumnDef[] = [
  { key: '_drag', label: '', width: '40px', compact: true },
  { key: 'title', label: 'Titel', width: '320px' },
  { key: 'sub_title', label: 'Sub-Titel', width: '320px' },
  { key: 'status', label: 'Status', width: '120px' },
  { key: '_actions', label: '', width: '100px', compact: true },
];

/** Ghost-row validator: slug is required. */
export const validateGhost = buildGhostRowValidator([{ field: 'slug', label: 'Slug' }]);
