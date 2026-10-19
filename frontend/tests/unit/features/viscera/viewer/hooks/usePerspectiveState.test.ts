/**
 * Tests: usePerspectiveState
 *
 * Verifies the store facade: badge cycling (neutral → focus → hide → neutral),
 * hover state, the derived active filter count and the reset-all behaviour.
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { usePerspectiveState } from '@src/features/viscera/viewer/hooks/usePerspectiveState';

import { resetVisceraStore } from '../../helpers';

beforeEach(() => {
  resetVisceraStore();
});

describe('usePerspectiveState', () => {
  it('starts without badge states or hovered key', () => {
    const { result } = renderHook(() => usePerspectiveState());

    expect(result.current.badgeStates.size).toBe(0);
    expect(result.current.hoveredKey).toBeNull();
    expect(result.current.activeFilterCount).toBe(0);
  });

  it('cycles a badge through focus, hide and back to neutral', () => {
    const { result } = renderHook(() => usePerspectiveState());

    act(() => result.current.toggleBadge('tag', 'kafka'));
    expect(result.current.badgeStates.get('tag:kafka')?.state).toBe('focus');
    expect(result.current.activeFilterCount).toBe(1);

    act(() => result.current.toggleBadge('tag', 'kafka'));
    expect(result.current.badgeStates.get('tag:kafka')?.state).toBe('hide');

    act(() => result.current.toggleBadge('tag', 'kafka'));
    expect(result.current.badgeStates.has('tag:kafka')).toBe(false);
    expect(result.current.activeFilterCount).toBe(0);
  });

  it('tracks the hovered badge key', () => {
    const { result } = renderHook(() => usePerspectiveState());

    act(() => result.current.setHover('status:viscera-approved'));
    expect(result.current.hoveredKey).toBe('status:viscera-approved');

    act(() => result.current.setHover(null));
    expect(result.current.hoveredKey).toBeNull();
  });

  it('resets all badge states and the active filter count', () => {
    const { result } = renderHook(() => usePerspectiveState());
    act(() => result.current.toggleBadge('tag', 'kafka'));
    act(() => result.current.toggleBadge('technology', 'postgres'));

    act(() => result.current.resetAll());

    expect(result.current.badgeStates.size).toBe(0);
    expect(result.current.activeFilterCount).toBe(0);
  });
});
