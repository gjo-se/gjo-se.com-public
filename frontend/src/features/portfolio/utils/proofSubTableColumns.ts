/**
 * ProofSubTableColumns – Spalten-Definitionen und Typen (kein JSX).
 *
 * Separates constants/types from components to satisfy
 * react-refresh/only-export-components.
 */

import { buildGhostRowValidator } from '@src/components/table/buildGhostRowValidator';

type ProofColumnKey = '_drag' | 'image_src' | 'statement' | 'priority' | 'question' | '_actions';

/** Height of the table row for consistent drag alignment. */
export const PROOF_ROW_HEIGHT = 56;

/** Wählbare Prioritäten – 2 Stufen (high/medium); high = volle Breite im Raster. */
export const PRIORITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
];

export interface ProofColumnDef {
  key: ProofColumnKey;
  label: string;
  width: string;
  /** Compact columns (drag handle / actions) get tighter alignment. */
  compact?: boolean;
}

/** Static column definitions. */
export const PROOF_COLUMNS: ProofColumnDef[] = [
  { key: '_drag', label: '', width: '3%', compact: true },
  { key: 'question', label: 'Frage', width: '33%' },
  { key: 'statement', label: 'Antwort', width: '33%' },
  { key: 'priority', label: 'Prio', width: '10%' },
  { key: 'image_src', label: 'Bild', width: '18%' },
  { key: '_actions', label: '', width: '3%', compact: true },
];

// ── Ghost Row Validation ──────────────────────────────────────────────────

/** Ghost-row validator: statement is required. */
export const validateGhost = buildGhostRowValidator([{ field: 'statement', label: 'Antwort' }]);
