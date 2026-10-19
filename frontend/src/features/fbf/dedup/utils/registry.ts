/**
 * columns/registry.ts – Column definitions as SSOT.
 *
 * Every column-related constant lives here so DedupBoardLayout and
 * other consumers have one source of truth.  Matches board-spec.md.
 */

import type { ColumnDef } from './columnTypes';

export const COLUMNS: ColumnDef[] = [
  {
    id: 'slaves',
    label: 'Master ohne Slaves',
    boardColumn: 'masters',
    hasSlaves: false,
    surface: 'direct',
    canLead: true,
  },
  {
    id: 'masters',
    label: 'Master mit Slaves',
    boardColumn: 'masters',
    hasSlaves: true,
    surface: 'direct',
    canLead: true,
  },
  {
    id: 'pinned-slaves',
    label: 'Slaves',
    boardColumn: 'slaves',
    surface: 'deep',
    canLead: false,
  },
] as const;
