/**
 * Tests: useInfiniteScroll
 *
 * Verifies the IntersectionObserver wiring at the public hook interface:
 * it only observes while more pages exist, loads when the sentinel becomes
 * visible and the list is not already loading, measures against the supplied
 * scroll container, and detaches on unmount.
 */

import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useInfiniteScroll } from '@src/features/fbf/dedup/hooks/useInfiniteScroll';

interface ObserverOptions {
  root?: Element | null
  rootMargin?: string
}

class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];

  readonly observed: Element[] = [];
  readonly options: ObserverOptions;
  disconnected = false;
  private readonly callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback, options: ObserverOptions = {}) {
    this.callback = callback;
    this.options = options;
    FakeIntersectionObserver.instances.push(this);
  }

  observe(element: Element): void {
    this.observed.push(element);
  }

  unobserve(): void {
    /* not needed for the hook contract */
  }

  disconnect(): void {
    this.disconnected = true;
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  emit(isIntersecting: boolean): void {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

beforeEach(() => {
  FakeIntersectionObserver.instances = [];
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useInfiniteScroll', () => {
  it('does not observe when there are no more pages', () => {
    const sentinel = document.createElement('div');
    const onLoadMore = vi.fn();

    renderHook(() => useInfiniteScroll({ current: sentinel }, { hasMore: false, loading: false, onLoadMore }));

    expect(FakeIntersectionObserver.instances).toHaveLength(0);
  });

  it('loads more when the sentinel becomes visible', () => {
    const sentinel = document.createElement('div');
    const onLoadMore = vi.fn();

    renderHook(() => useInfiniteScroll({ current: sentinel }, { hasMore: true, loading: false, onLoadMore }));

    FakeIntersectionObserver.instances[0].emit(true);

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('does not load while a request is already running', () => {
    const sentinel = document.createElement('div');
    const onLoadMore = vi.fn();

    renderHook(() => useInfiniteScroll({ current: sentinel }, { hasMore: true, loading: true, onLoadMore }));

    FakeIntersectionObserver.instances[0].emit(true);

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('ignores non-intersecting entries', () => {
    const sentinel = document.createElement('div');
    const onLoadMore = vi.fn();

    renderHook(() => useInfiniteScroll({ current: sentinel }, { hasMore: true, loading: false, onLoadMore }));

    FakeIntersectionObserver.instances[0].emit(false);

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('observes against the scroll container with a 200px margin', () => {
    const sentinel = document.createElement('div');
    const root = document.createElement('div');

    renderHook(() => useInfiniteScroll(
      { current: sentinel },
      { rootRef: { current: root }, hasMore: true, loading: false, onLoadMore: () => undefined },
    ));

    const observer = FakeIntersectionObserver.instances[0];
    expect(observer.observed).toEqual([sentinel]);
    expect(observer.options.root).toBe(root);
    expect(observer.options.rootMargin).toBe('200px');
  });

  it('disconnects the observer on unmount', () => {
    const sentinel = document.createElement('div');

    const { unmount } = renderHook(() => useInfiniteScroll(
      { current: sentinel },
      { hasMore: true, loading: false, onLoadMore: () => undefined },
    ));

    unmount();

    expect(FakeIntersectionObserver.instances[0].disconnected).toBe(true);
  });
});
