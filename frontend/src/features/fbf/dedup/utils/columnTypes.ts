/**
 * columns/types.ts – Column definition interface.
 *
 * Central SSOT for column metadata — matches board-spec.md.
 */

import type { BoardColumn } from '../services/dedup';

export interface ColumnDef {
  /** Unique column id — matches board-spec.md and store keys. */
  id: 'slaves' | 'masters' | 'pinned-slaves'
  /** Display label shown above the column. */
  label: string
  /** Board API column parameter: 'masters' or 'slaves'. */
  boardColumn: BoardColumn
  /** For column=masters: filter by alias count. */
  hasSlaves?: boolean
  /** CSS surface class for card wrapper (direct = Card as child, deep = Card nested). */
  surface: 'direct' | 'deep'
  /** Whether this column can be the leading (selection-owning) column. */
  canLead: boolean
}
