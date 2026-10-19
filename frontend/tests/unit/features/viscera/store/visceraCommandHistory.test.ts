/**
 * Tests: visceraCommandHistory
 *
 * Behaviour: the singleton factory initializes exactly one history instance,
 * `get` throws before initialization, and a later factory call replaces the
 * instance with the newly supplied state.
 */

import { describe, expect, it, vi } from 'vitest';

import {
  createVisceraCommandHistory,
  getVisceraCommandHistory,
} from '@src/features/viscera/store/visceraCommandHistory';

import { makeWorkspace, resetVisceraStore } from '../helpers';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

describe('visceraCommandHistory', () => {
  it('throws when accessed before initialization (fresh module)', async () => {
    vi.resetModules();
    const fresh = await import('@src/features/viscera/store/visceraCommandHistory');

    expect(() => fresh.getVisceraCommandHistory()).toThrow(
      'Viscera CommandHistory not initialized. Call createVisceraCommandHistory first.',
    );
  });

  it('returns the created singleton on every access', () => {
    resetVisceraStore();

    const first = getVisceraCommandHistory();
    const second = getVisceraCommandHistory();

    expect(first).toBe(second);
  });

  it('creates a history initialized with the supplied state', () => {
    const history = createVisceraCommandHistory(useVisceraStore.getState());

    expect(history.getState()).toBe(useVisceraStore.getState());
    expect(history.canUndo).toBe(false);
  });

  it('replaces the singleton when the factory is called again', () => {
    const first = createVisceraCommandHistory(useVisceraStore.getState());

    const second = createVisceraCommandHistory(useVisceraStore.getState());

    expect(second).not.toBe(first);
    expect(getVisceraCommandHistory()).toBe(second);
  });

  it('works with a plain state object (factory is state-agnostic)', () => {
    const state = {
      ...useVisceraStore.getState(),
      nodeOverrides: { 'view:api': { x: 5, y: 5 } },
    } as ReturnType<typeof useVisceraStore.getState>;

    const history = createVisceraCommandHistory(state);

    expect(history.getState().nodeOverrides).toEqual({ 'view:api': { x: 5, y: 5 } });
    expect(makeWorkspace().id).toBe('ws-test');
  });
});
