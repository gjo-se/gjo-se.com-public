/**
 * Tests: helperLinesStore
 *
 * Behaviour: the transient mini-store starts without helper lines, stores the
 * active lines, and clears them again — no persistence, no other state.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { useHelperLinesStore } from '@src/features/viscera/viewer/store/helperLinesStore';

beforeEach(() => {
  useHelperLinesStore.setState({ lines: null });
});

describe('useHelperLinesStore', () => {
  it('starts with no active helper lines', () => {
    expect(useHelperLinesStore.getState().lines).toBeNull();
  });

  it('stores active helper lines', () => {
    const lines = { x: 120, y: 80 };

    useHelperLinesStore.getState().setLines(lines);

    expect(useHelperLinesStore.getState().lines).toEqual({ x: 120, y: 80 });
  });

  it('stores measurement gaps alongside the lines', () => {
    const lines = { xGap: { from: 200, to: 240, value: 40, at: 50 } };

    useHelperLinesStore.getState().setLines(lines);

    expect(useHelperLinesStore.getState().lines?.xGap).toEqual({
      from: 200,
      to: 240,
      value: 40,
      at: 50,
    });
  });

  it('clears the helper lines when set to null', () => {
    useHelperLinesStore.getState().setLines({ x: 1 });

    useHelperLinesStore.getState().setLines(null);

    expect(useHelperLinesStore.getState().lines).toBeNull();
  });

  it('notifies subscribers about line changes', () => {
    const seen: unknown[] = [];
    const unsubscribe = useHelperLinesStore.subscribe((state) => seen.push(state.lines));

    useHelperLinesStore.getState().setLines({ x: 10 });
    unsubscribe();

    expect(seen).toHaveLength(1);
    expect(seen[0]).toEqual({ x: 10 });
  });
});
