/**
 * Tests: badgeSelectors
 *
 * Behaviour: hovering a badge adds a transient 'focus' state only when the
 * badge is absent or neutral; active focus/hide states and unparsable keys are
 * returned unchanged (same map identity).
 */

import { describe, expect, it } from 'vitest';

import { withHoveredBadgeFocus } from '@src/features/viscera/store/badgeSelectors';

import type { BadgeState } from '@src/features/viscera/store/filterSlice';

function states(entries: [string, BadgeState][]): Map<string, BadgeState> {
  return new Map(entries);
}

describe('withHoveredBadgeFocus', () => {
  it('returns the original map when nothing is hovered', () => {
    const map = states([['tag:risk', { entityType: 'tag', slug: 'risk', state: 'hide' }]]);

    expect(withHoveredBadgeFocus(map, null)).toBe(map);
  });

  it('ignores a key without a type separator', () => {
    const map = states([]);

    expect(withHoveredBadgeFocus(map, 'no-separator')).toBe(map);
  });

  it('adds a focus state for an absent badge', () => {
    const map = states([]);

    const result = withHoveredBadgeFocus(map, 'status:approved');

    expect(result).not.toBe(map);
    expect(result.get('status:approved')).toEqual({
      entityType: 'status',
      slug: 'approved',
      state: 'focus',
    });
  });

  it('adds a focus state for a neutral badge', () => {
    const map = states([['tag:risk', { entityType: 'tag', slug: 'risk', state: 'neutral' }]]);

    const result = withHoveredBadgeFocus(map, 'tag:risk');

    expect(result.get('tag:risk')).toMatchObject({ state: 'focus' });
  });

  it('does not override an existing focus state', () => {
    const map = states([['tag:risk', { entityType: 'tag', slug: 'risk', state: 'focus' }]]);

    expect(withHoveredBadgeFocus(map, 'tag:risk')).toBe(map);
  });

  it('does not override an existing hide state', () => {
    const map = states([['tag:risk', { entityType: 'tag', slug: 'risk', state: 'hide' }]]);

    expect(withHoveredBadgeFocus(map, 'tag:risk')).toBe(map);
  });

  it('does not mutate the input map', () => {
    const map = states([]);

    withHoveredBadgeFocus(map, 'technology:react');

    expect(map.size).toBe(0);
  });

  it('keeps all existing states when adding the hover focus', () => {
    const map = states([['tag:risk', { entityType: 'tag', slug: 'risk', state: 'hide' }]]);

    const result = withHoveredBadgeFocus(map, 'technology:react');

    expect(result.size).toBe(2);
    expect(result.get('tag:risk')).toMatchObject({ state: 'hide' });
  });
});
