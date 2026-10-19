/**
 * Tests: persistUrlSubscribe
 *
 * Behaviour: store → URL writes — viewport changes are debounced by 200ms,
 * navigation changes are written immediately, combined changes bypass the
 * debounce, and writes that would reproduce the current URL are skipped.
 *
 * The store is a minimal in-memory double exposing exactly the URL-mapped
 * fields plus `subscribeWithSelector` (the middleware's store contract).
 */

import { createStore } from 'zustand/vanilla';
import { subscribeWithSelector } from 'zustand/middleware';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { subscribePersistUrl } from '@src/features/viscera/store/middleware/persistUrlSubscribe';

import type { StoreApi } from 'zustand';
import type { VisceraStore } from '@src/features/viscera/store/visceraStore';

interface MappedState {
  viewport: { x: number; y: number; zoom: number };
  source: 'code' | 'golden';
  viewKey: string;
  detailContainerId: string | null;
  objectId: string | null;
  objectTab: string;
  activeFlowId: string | null;
  badgeStates: Map<string, never>;
}

const EMPTY_BADGES: Map<string, never> = new Map<string, never>();

function makeMappedStore(patch: Partial<MappedState> = {}) {
  const initial: MappedState = {
    viewport: { x: 0, y: 0, zoom: 1 },
    source: 'code',
    viewKey: 'SystemContext',
    detailContainerId: null,
    objectId: null,
    objectTab: 'details',
    activeFlowId: null,
    badgeStates: EMPTY_BADGES,
    ...patch,
  };
  return createStore<MappedState>()(subscribeWithSelector(() => initial));
}

function subscribe(store: ReturnType<typeof makeMappedStore>): void {
  subscribePersistUrl(store as unknown as StoreApi<VisceraStore>);
}

let replaceState: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.useFakeTimers();
  window.history.replaceState(null, '', '/admin/viscera/views');
  replaceState = vi.spyOn(window.history, 'replaceState');
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('subscribePersistUrl – viewport debounce', () => {
  it('writes the viewport only after 200ms', () => {
    const store = makeMappedStore();
    subscribe(store);

    store.setState({ viewport: { x: 10, y: 20, zoom: 2 } });

    expect(replaceState).not.toHaveBeenCalled();

    vi.advanceTimersByTime(199);
    expect(replaceState).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(replaceState).toHaveBeenCalledOnce();
    const url = String(replaceState.mock.calls[0]?.[2]);
    expect(url).toContain('zoom=2');
    expect(url).toContain('x=10');
    expect(url).toContain('y=20');
  });

  it('coalesces rapid viewport changes into the latest value', () => {
    const store = makeMappedStore();
    subscribe(store);

    store.setState({ viewport: { x: 1, y: 1, zoom: 2 } });
    store.setState({ viewport: { x: 9, y: 9, zoom: 3 } });
    vi.advanceTimersByTime(200);

    expect(replaceState).toHaveBeenCalledOnce();
    expect(String(replaceState.mock.calls[0]?.[2])).toContain('zoom=3');
  });

  it('skips a write that would reproduce the current URL', () => {
    window.history.replaceState(null, '', '/admin/viscera/views?zoom=2&x=0&y=0');
    replaceState.mockClear();
    const store = makeMappedStore();
    subscribe(store);

    store.setState({ viewport: { x: 0, y: 0, zoom: 2 } });
    vi.advanceTimersByTime(200);

    expect(replaceState).not.toHaveBeenCalled();
  });
});

describe('subscribePersistUrl – immediate writes', () => {
  it('writes a navigation change immediately', () => {
    const store = makeMappedStore();
    subscribe(store);

    store.setState({ viewKey: 'container-app' });

    expect(replaceState).toHaveBeenCalledOnce();
    expect(String(replaceState.mock.calls[0]?.[2])).toContain('view=container-app');
  });

  it('writes a combined viewport+navigation change immediately', () => {
    const store = makeMappedStore();
    subscribe(store);

    store.setState({
      viewKey: 'component-app',
      viewport: { x: 5, y: 6, zoom: 2 },
    });

    expect(replaceState).toHaveBeenCalledOnce();
    const url = String(replaceState.mock.calls[0]?.[2]);
    expect(url).toContain('view=component-app');
    expect(url).toContain('zoom=2');
  });

  it('does not write when no mapped field changed', () => {
    const store = makeMappedStore();
    subscribe(store);

    store.setState({ objectTab: 'details' });

    expect(replaceState).not.toHaveBeenCalled();
  });
});
