/**
 * SkillGroupAdminTabColumns – Spalten-Definitionen und Konstanten (kein JSX).
 *
 * Analog zu ProofSubTableColumns: separate Konstanten/Typen von den
 * Komponenten, um react-refresh/only-export-components zu genuegen.
 */
import { buildGhostRowValidator } from '@src/components/table/buildGhostRowValidator';

import type { SkillGroupPriority } from './skillGroupAdminTypes';

type GroupColumnKey = '_drag' | 'label_de' | 'label_en' | 'priority' | '_actions';

/** Height of the table row for consistent drag alignment. */
export const GROUP_ROW_HEIGHT = 48;

/** Waehlbare Prioritaeten – 3 Stufen (high/medium/base); high = volle Breite, base = dezimiert. */
export const PRIORITY_OPTIONS: { value: SkillGroupPriority; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'base', label: 'Base' },
];

export interface GroupColumnDef {
  key: GroupColumnKey
  label: string
  width: string
  /** Compact columns (drag handle / actions) get tighter alignment. */
  compact?: boolean
}

/** Static column definitions. */
export const GROUP_COLUMNS: GroupColumnDef[] = [
  { key: '_drag', label: '', width: '3%', compact: true },
  { key: 'label_de', label: 'Label DE', width: '36%' },
  { key: 'label_en', label: 'Label EN', width: '36%' },
  { key: 'priority', label: 'Prio', width: '12%' },
  { key: '_actions', label: '', width: '12%', compact: true },
];

/** Ghost-row validator: label_de is required. */
export const validateGhost = buildGhostRowValidator([{ field: 'label_de', label: 'Label DE' }]);
