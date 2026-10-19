/**
 * Tests: useMobile – innerWidth boundary around the 768px breakpoint plus
 * media-query change handling.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useIsMobile } from '@src/hooks/useMobile';

const listeners: (() => void)[] = [];

function installMatchMedia(): void {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    media: '',
    addEventListener: (_: string, listener: () => void) => { listeners.push(listener); },
    removeEventListener: (_: string, listener: () => void) => {
      const index = listeners.indexOf(listener);
      if (index >= 0) listeners.splice(index, 1);
    },
  }));
}

function setWidth(value: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value });
}

describe('useIsMobile', () => {
  beforeEach(() => {
    listeners.length = 0;
    installMatchMedia();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is mobile just below the breakpoint', () => {
    setWidth(767);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it('is not mobile at the breakpoint boundary', () => {
    setWidth(768);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it('re-evaluates on a media-query change event', () => {
    setWidth(1200);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    setWidth(500);
    act(() => {
      listeners.forEach((listener) => { listener(); });
    });

    expect(result.current).toBe(true);
  });

  it('removes the media-query listener on unmount', () => {
    setWidth(1200);
    const { unmount } = renderHook(() => useIsMobile());
    expect(listeners).toHaveLength(1);

    unmount();

    expect(listeners).toHaveLength(0);
  });
});
