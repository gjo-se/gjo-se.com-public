/**
 * Tests: computeFilteredNodeIds
 *
 * Verifies the badge-based perspective filter: neutral badges are ignored,
 * hide matches use OR semantics, focus matches use AND semantics, hidden wins
 * over dimmed, and people participate in filtering like objects.
 */

import { describe, expect, it } from 'vitest';

import { computeFilteredNodeIds } from '@src/features/viscera/viewer/utils/computeFilteredNodeIds';

import { makeObject, makeWorkspace } from '../../helpers';

import type { BadgeState } from '@src/features/viscera/store/filterSlice';

function badge(entityType: BadgeState['entityType'], slug: string, state: BadgeState['state']): BadgeState {
  return { entityType, slug, state };
}

function toMap(entries: BadgeState[]): Map<string, BadgeState> {
  return new Map(entries.map((entry) => [`${entry.entityType}:${entry.slug}`, entry]));
}

function sorted(ids: Set<string>): string[] {
  return [...ids].sort();
}

describe('computeFilteredNodeIds', () => {
  it('liefert ohne Badges leere Mengen', () => {
    const workspace = makeWorkspace({ objects: [makeObject({ id: 'api' })] });

    const result = computeFilteredNodeIds(workspace, new Map());

    expect(result.hiddenNodeIds.size).toBe(0);
    expect(result.dimmedNodeIds.size).toBe(0);
  });

  it('ignoriert neutrale Badges', () => {
    const workspace = makeWorkspace({
      objects: [makeObject({ id: 'api', tags: ['backend'] })],
    });

    const result = computeFilteredNodeIds(workspace, toMap([badge('tag', 'backend', 'neutral')]));

    expect(result.hiddenNodeIds.size).toBe(0);
    expect(result.dimmedNodeIds.size).toBe(0);
  });

  it('versteckt Objekte und Personen bei Treffer eines Hide-Badges', () => {
    const workspace = makeWorkspace({
      objects: [
        makeObject({ id: 'api', tags: ['backend'] }),
        makeObject({ id: 'web', tags: ['frontend'] }),
        makeObject({ id: 'legacy', status: 'old' }),
      ],
      people: [makeObject({ id: 'greg', type: 'person', tags: ['backend'] })],
    });

    const result = computeFilteredNodeIds(
      workspace,
      toMap([badge('tag', 'backend', 'hide'), badge('status', 'old', 'hide')]),
    );

    expect(sorted(result.hiddenNodeIds)).toEqual(['api', 'greg', 'legacy']);
    expect(result.dimmedNodeIds.size).toBe(0);
  });

  it('dimmt Objekte, die nicht alle Focus-Badges erfüllen', () => {
    const workspace = makeWorkspace({
      objects: [
        makeObject({ id: 'match', tags: ['backend'], technologies: ['python'] }),
        makeObject({ id: 'partial', tags: ['backend'], technologies: ['java'] }),
        makeObject({ id: 'other', tags: ['frontend'], technologies: ['python'] }),
      ],
    });

    const result = computeFilteredNodeIds(
      workspace,
      toMap([badge('tag', 'backend', 'focus'), badge('technology', 'python', 'focus')]),
    );

    expect(sorted(result.dimmedNodeIds)).toEqual(['other', 'partial']);
    expect(result.hiddenNodeIds.size).toBe(0);
  });

  it('vergleicht Status-Badges exakt und ohne Fallback', () => {
    const workspace = makeWorkspace({
      objects: [
        makeObject({ id: 'match', status: 'active' }),
        makeObject({ id: 'case', status: 'Active' }),
        makeObject({ id: 'none' }),
      ],
    });

    const result = computeFilteredNodeIds(workspace, toMap([badge('status', 'active', 'focus')]));

    expect(sorted(result.dimmedNodeIds)).toEqual(['case', 'none']);
  });

  it('lässt Hide Vorrang vor Dimmen', () => {
    const workspace = makeWorkspace({
      objects: [
        makeObject({ id: 'hidden', status: 'old' }),
        makeObject({ id: 'visible', tags: ['backend'] }),
      ],
    });

    const result = computeFilteredNodeIds(
      workspace,
      toMap([badge('status', 'old', 'hide'), badge('tag', 'backend', 'focus')]),
    );

    expect(sorted(result.hiddenNodeIds)).toEqual(['hidden']);
    expect(sorted(result.dimmedNodeIds)).toEqual([]);
  });

  it('liefert bei leerem Workspace leere Mengen trotz Focus-Badge', () => {
    const result = computeFilteredNodeIds(
      makeWorkspace(),
      toMap([badge('tag', 'backend', 'focus')]),
    );

    expect(result.hiddenNodeIds.size).toBe(0);
    expect(result.dimmedNodeIds.size).toBe(0);
  });
});
