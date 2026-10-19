/**
 * Tests: COLUMNS registry
 *
 * The registry is the SSOT for the three board columns. Asserts the exact
 * column order, their board API mapping and the leading/filter semantics.
 */
import { describe, expect, it } from 'vitest';

import { COLUMNS } from '@src/features/fbf/dedup/utils/registry';

describe('COLUMNS', () => {
  it('liefert die drei Spalten in fester Reihenfolge', () => {
    expect(COLUMNS.map((column) => column.id)).toEqual([
      'slaves',
      'masters',
      'pinned-slaves',
    ]);
  });

  it('definiert die Spalten vollständig', () => {
    expect(COLUMNS).toEqual([
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
    ]);
  });

  it('lässt nur die beiden Master-Spalten die Auswahl führen', () => {
    const leading = COLUMNS.filter((column) => column.canLead).map((column) => column.id);

    expect(leading).toEqual(['slaves', 'masters']);
  });

  it('filtert die Master-Spalten gegensätzlich nach vorhandenen Slaves', () => {
    const masterColumns = COLUMNS.filter((column) => column.boardColumn === 'masters');

    expect(masterColumns.map((column) => column.hasSlaves)).toEqual([false, true]);
  });
});
