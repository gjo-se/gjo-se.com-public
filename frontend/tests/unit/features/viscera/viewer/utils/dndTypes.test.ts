/**
 * Tests: dndTypes
 *
 * Verifies the pure group-membership transition used by the DnD commands:
 * add/remove semantics, Set-based deduplication, untouched other groups and
 * the non-mutating contract. Type-level contract covers the drag discriminators.
 */

import { describe, expect, expectTypeOf, it } from 'vitest';

import { updateGroupMembers } from '@src/features/viscera/viewer/utils/dndTypes';

import type {
  CardDragData,
  GroupDragData,
  GroupDropData,
} from '@src/features/viscera/viewer/utils/dndTypes';
import type { Group } from '@src/features/viscera/core/workspaceSchema';

function makeGroup(id: string, members: string[]): Group {
  return { id, name: id, description: '', members };
}

describe('updateGroupMembers', () => {
  it('fügt ein Mitglied zur Ziel-Gruppe hinzu', () => {
    const groups = [makeGroup('g1', ['a'])];

    const result = updateGroupMembers(groups, 'g1', 'b', 'add');

    expect(result[0].members).toEqual(['a', 'b']);
  });

  it('entfernt ein Mitglied aus der Ziel-Gruppe', () => {
    const groups = [makeGroup('g1', ['a', 'b'])];

    const result = updateGroupMembers(groups, 'g1', 'a', 'remove');

    expect(result[0].members).toEqual(['b']);
  });

  it('verhindert doppelte Mitglieder bei mehrfachem Hinzufügen', () => {
    const groups = [makeGroup('g1', ['a'])];

    const result = updateGroupMembers(groups, 'g1', 'a', 'add');

    expect(result[0].members).toEqual(['a']);
  });

  it('lässt das Entfernen eines fehlenden Mitglieds ohne Änderung', () => {
    const groups = [makeGroup('g1', ['a'])];

    const result = updateGroupMembers(groups, 'g1', 'ghost', 'remove');

    expect(result[0].members).toEqual(['a']);
  });

  it('lässt fremde Gruppen unverändert', () => {
    const groups = [makeGroup('g1', ['a']), makeGroup('g2', ['b'])];

    const result = updateGroupMembers(groups, 'g1', 'c', 'add');

    expect(result[1]).toBe(groups[1]);
    expect(result[1].members).toEqual(['b']);
  });

  it('mutiert die übergebene Gruppenliste nicht', () => {
    const groups = [makeGroup('g1', ['a'])];

    updateGroupMembers(groups, 'g1', 'b', 'add');

    expect(groups[0].members).toEqual(['a']);
    expect(groups[0]).not.toBe(updateGroupMembers(groups, 'g1', 'b', 'add')[0]);
  });
});

describe('dndTypes – contract', () => {
  it('unterscheidet Karten- und Gruppen-Drags über den Diskriminator', () => {
    const card: CardDragData = { dndType: 'card' };
    const group: GroupDragData = { dndType: 'group', width: 400, height: 300 };

    expectTypeOf<CardDragData['dndType']>().toEqualTypeOf<'card'>();
    expectTypeOf<GroupDragData['dndType']>().toEqualTypeOf<'group'>();
    expect(card.dndType).toBe('card');
    expect(group.height).toBe(300);
  });

  it('markiert Gruppen-Droppables mit kind und groupId', () => {
    const drop: GroupDropData = { kind: 'group', groupId: 'g1' };

    expect(drop).toEqual({ kind: 'group', groupId: 'g1' });
  });
});
