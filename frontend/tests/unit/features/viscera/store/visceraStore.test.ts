/**
 * Tests: visceraStore
 *
 * Behaviour of the composed store: every slice is wired into one store, the
 * defaults are the documented ones, and cross-slice actions are reachable
 * through the single public store API.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import {
  getVisceraCommandHistory,
  useVisceraStore,
} from '@src/features/viscera/store/visceraStore';

import { resetVisceraStore } from '../helpers';

const store = () => useVisceraStore.getState();

beforeEach(() => {
  resetVisceraStore();
});

describe('visceraStore – composition', () => {
  it('exposes the documented default navigation and UI state', () => {
    expect(store().source).toBe('code');
    expect(store().viewKey).toBe('SystemContext');
    expect(store().objectTab).toBe('details');
    expect(store().viewMode).toBe('reactflow');
    expect(store().viewport).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it('runs actions from every slice on the same store', () => {
    store().setViewport({ x: 1, y: 2, zoom: 1.5 });
    store().toggleBadge('tag', 'risk');
    store().selectFlow('checkout');
    store().setSplitRatio('adr', 0.4);
    store().setModuleFocus('app.api', 'focus');
    store().setFullscreen(true);
    store().setLastUrl('SystemContext', '/x');
    store().setNodes([]);

    expect(store().viewport.zoom).toBe(1.5);
    expect(store().activeFilterCount).toBe(1);
    expect(store().activeFlowId).toBe('checkout');
    expect(store().splitRatioAdr).toBe(0.4);
    expect(store().focusModuleId).toBe('app.api');
    expect(store().isFullscreen).toBe(true);
    expect(store().lastUrl.SystemContext).toBe('/x');
  });

  it('initializes the command history lazily through the helper', () => {
    expect(() => getVisceraCommandHistory()).not.toThrow();
    expect(getVisceraCommandHistory().getState()).toBe(useVisceraStore.getState());
  });

  it('notifies subscribers when a slice changes', () => {
    const seen: string[] = [];
    const unsubscribe = useVisceraStore.subscribe((state) => {
      seen.push(state.viewKey);
    });

    store().setViewKey('container-app');
    unsubscribe();
    store().setViewKey('component-app');

    expect(seen).toEqual(['container-app']);
  });
});
