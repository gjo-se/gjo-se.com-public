/**
 * Tests: logger middleware
 *
 * Behaviour: state updates are forwarded unchanged, and in dev mode each
 * change is logged under a group labelled with the owning slice(s) — falling
 * back to `Store` for keys without a slice mapping.
 */

import { create } from 'zustand';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { logger } from '@src/features/viscera/store/middleware/logger';

interface LoggedState {
  viewport: { x: number; y: number; zoom: number };
  viewKey: string;
  unmapped: number;
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
  setViewKey: (viewKey: string) => void;
  setUnmapped: (value: number) => void;
  setBoth: (viewKey: string, viewport: { x: number; y: number; zoom: number }) => void;
}

function makeStore() {
  return create<LoggedState>()(
    logger<LoggedState>((set) => ({
      viewport: { x: 0, y: 0, zoom: 1 },
      viewKey: 'SystemContext',
      unmapped: 0,
      setViewport: (viewport) => set({ viewport }),
      setViewKey: (viewKey) => set({ viewKey }),
      setUnmapped: (unmapped) => set({ unmapped }),
      setBoth: (viewKey, viewport) => set({ viewKey, viewport }),
    })),
  );
}

let groupSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  groupSpy = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => undefined);
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'groupEnd').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('logger middleware', () => {
  it('forwards state updates unchanged', () => {
    const store = makeStore();

    store.getState().setUnmapped(7);

    expect(store.getState().unmapped).toBe(7);
  });

  it('labels a canvas change with the Canvas slice', () => {
    const store = makeStore();

    store.getState().setViewport({ x: 10, y: 20, zoom: 2 });

    expect(groupSpy).toHaveBeenCalledWith(expect.stringMatching(/^\[VisceraStore\] Canvas\./));
  });

  it('labels a navigation change with the Navigation slice', () => {
    const store = makeStore();

    store.getState().setViewKey('container-app');

    expect(groupSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^\[VisceraStore\] Navigation\./),
    );
  });

  it('combines changed slices alphabetically and deduplicated', () => {
    const store = makeStore();

    store.getState().setBoth('container-app', { x: 1, y: 1, zoom: 1 });

    expect(groupSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^\[VisceraStore\] Canvas,Navigation\./),
    );
  });

  it('falls back to Store for keys without a slice mapping', () => {
    const store = makeStore();

    store.getState().setUnmapped(1);

    expect(groupSpy).toHaveBeenCalledWith(expect.stringMatching(/^\[VisceraStore\] Store\./));
  });

  it('logs a write that leaves an unmapped value unchanged', () => {
    const store = makeStore();

    store.getState().setUnmapped(0);

    expect(groupSpy).toHaveBeenCalledWith(expect.stringMatching(/^\[VisceraStore\] Store\./));
  });
});
