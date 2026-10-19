/**
 * Tests: useMountOnce – runs the initializer exactly once, StrictMode-safe.
 */
import { StrictMode } from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useMountOnce } from '@src/hooks/useMountOnce';

describe('useMountOnce', () => {
  it('runs the callback once on mount', () => {
    const callback = vi.fn();
    renderHook(() => useMountOnce(callback));

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does not run twice under StrictMode', () => {
    const callback = vi.fn();
    renderHook(() => useMountOnce(callback), { wrapper: StrictMode });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('ignores a callback identity change after mount', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ callback }) => useMountOnce(callback), {
      initialProps: { callback: first },
    });

    rerender({ callback: second });

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });

  it('accepts an async initializer without throwing', () => {
    const callback = vi.fn().mockResolvedValue(undefined);

    expect(() => renderHook(() => useMountOnce(callback))).not.toThrow();
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
