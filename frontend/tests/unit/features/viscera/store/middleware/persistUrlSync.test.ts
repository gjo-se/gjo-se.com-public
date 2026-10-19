/**
 * Tests: persistUrlSync
 *
 * Behaviour: badge states are rebuilt from the focus/hide URL params (unknown
 * types default to tag), the active count is derived, and stale filter params
 * are removed when the URL carries none.
 *
 * The store is a minimal in-memory double exposing the filter fields.
 */

import { createStore } from 'zustand/vanilla';
import { enableMapSet } from 'immer';
import { afterEach, describe, expect, it, vi } from 'vitest';

enableMapSet();

import { syncFilterFromUrl } from '@src/features/viscera/store/middleware/persistUrlSync';

import type { StoreApi } from 'zustand';
import type { BadgeState } from '@src/features/viscera/store/filterSlice';
import type { VisceraStore } from '@src/features/viscera/store/visceraStore';

interface FilterState {
  badgeStates: Map<string, BadgeState>;
  activeFilterCount: number;
}

function makeFilterStore() {
  return createStore<FilterState>(() => ({ badgeStates: new Map(), activeFilterCount: 0 }));
}

function sync(store: ReturnType<typeof makeFilterStore>): void {
  syncFilterFromUrl(store as unknown as StoreApi<VisceraStore>);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('syncFilterFromUrl', () => {
  it('builds focus badges from the focus param', () => {
    window.history.replaceState(null, '', '/admin/viscera/views?focus=tag:risk,status:x');
    const store = makeFilterStore();

    sync(store);

    expect(store.getState().badgeStates.get('tag:risk')).toMatchObject({ state: 'focus' });
    expect(store.getState().badgeStates.get('status:x')).toMatchObject({ state: 'focus' });
    expect(store.getState().activeFilterCount).toBe(2);
  });

  it('builds hide badges from the hide param', () => {
    window.history.replaceState(null, '', '/admin/viscera/views?hide=technology:react');
    const store = makeFilterStore();

    sync(store);

    expect(store.getState().badgeStates.get('technology:react')).toMatchObject({ state: 'hide' });
    expect(store.getState().activeFilterCount).toBe(1);
  });

  it('treats an untyped param value as a tag', () => {
    window.history.replaceState(null, '', '/admin/viscera/views?focus=plain-slug');
    const store = makeFilterStore();

    sync(store);

    expect(store.getState().badgeStates.get('tag:plain-slug')).toMatchObject({ state: 'focus' });
  });

  it('replaces previous badge states instead of merging them', () => {
    window.history.replaceState(null, '', '/admin/viscera/views?focus=tag:a');
    const store = makeFilterStore();
    sync(store);

    window.history.replaceState(null, '', '/admin/viscera/views?focus=tag:b');
    sync(store);

    expect(store.getState().badgeStates.has('tag:a')).toBe(false);
    expect(store.getState().badgeStates.has('tag:b')).toBe(true);
  });

  it('clears badges and stale URL params when the URL has no filter', () => {
    window.history.replaceState(null, '', '/admin/viscera/views?focus=tag:a&view=container-app');
    const store = makeFilterStore();
    sync(store);

    window.history.replaceState(null, '', '/admin/viscera/views?focus=&hide=&view=container-app');
    const replaceState = vi.spyOn(window.history, 'replaceState');
    sync(store);

    expect(store.getState().badgeStates.size).toBe(0);
    expect(store.getState().activeFilterCount).toBe(0);
    const url = String(replaceState.mock.calls[0]?.[2]);
    expect(url).not.toContain('focus=');
    expect(url).not.toContain('hide=');
    expect(url).toContain('view=container-app');
  });

  it('leaves the URL untouched when there are no filter params to clean up', () => {
    window.history.replaceState(null, '', '/admin/viscera/views?view=container-app');
    const store = makeFilterStore();
    const replaceState = vi.spyOn(window.history, 'replaceState');

    sync(store);

    expect(replaceState).not.toHaveBeenCalled();
  });
});
