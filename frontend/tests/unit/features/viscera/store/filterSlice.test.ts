/**
 * Tests: filterSlice
 *
 * Behaviour: badge keys, the neutral → focus → hide → neutral cycle, derived
 * active-filter count, hover state and reset-all.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { badgeKey } from '@src/features/viscera/store/filterSlice';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { resetVisceraStore } from '../helpers';

const store = () => useVisceraStore.getState();

beforeEach(() => {
  resetVisceraStore();
});

describe('badgeKey', () => {
  it('joins entity type and slug with a colon', () => {
    expect(badgeKey('tag', 'risk-high')).toBe('tag:risk-high');
    expect(badgeKey('status', 'viscera-approved')).toBe('status:viscera-approved');
  });
});

describe('filterSlice – toggle cycle', () => {
  it('cycles neutral → focus → hide → neutral and removes the key on neutral', () => {
    store().toggleBadge('tag', 'risk');
    expect(store().badgeStates.get('tag:risk')).toMatchObject({ state: 'focus' });
    expect(store().activeFilterCount).toBe(1);

    store().toggleBadge('tag', 'risk');
    expect(store().badgeStates.get('tag:risk')).toMatchObject({ state: 'hide' });
    expect(store().activeFilterCount).toBe(1);

    store().toggleBadge('tag', 'risk');
    expect(store().badgeStates.has('tag:risk')).toBe(false);
    expect(store().activeFilterCount).toBe(0);
  });

  it('counts every non-neutral badge independently', () => {
    store().toggleBadge('tag', 'a');
    store().toggleBadge('tag', 'b');
    store().toggleBadge('status', 'c');
    store().toggleBadge('status', 'c');

    expect(store().activeFilterCount).toBe(3);
  });

  it('keeps badges of different entity types with the same slug apart', () => {
    store().toggleBadge('tag', 'shared');
    store().toggleBadge('status', 'shared');

    expect(store().badgeStates.size).toBe(2);
    expect(store().activeFilterCount).toBe(2);
  });
});

describe('filterSlice – hover and reset', () => {
  it('stores and clears the hovered key', () => {
    store().setHover('tag:risk');
    expect(store().hoveredKey).toBe('tag:risk');

    store().setHover(null);
    expect(store().hoveredKey).toBeNull();
  });

  it('resetAll clears all badges and the derived count', () => {
    store().toggleBadge('tag', 'a');
    store().toggleBadge('status', 'b');

    store().resetAll();

    expect(store().badgeStates.size).toBe(0);
    expect(store().activeFilterCount).toBe(0);
  });
});
