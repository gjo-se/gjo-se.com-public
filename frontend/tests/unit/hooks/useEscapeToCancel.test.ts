/**
 * Tests: useEscapeToCancel – Escape-only cancel listener with cleanup.
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useEscapeToCancel } from '@src/hooks/useEscapeToCancel';

describe('useEscapeToCancel', () => {
  it('calls the cancel callback on Escape', () => {
    const onCancel = vi.fn();
    renderHook(() => useEscapeToCancel(onCancel));

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('ignores other keys', () => {
    const onCancel = vi.fn();
    renderHook(() => useEscapeToCancel(onCancel));

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Esc' }));
    });

    expect(onCancel).not.toHaveBeenCalled();
  });

  it('detaches the listener on unmount', () => {
    const onCancel = vi.fn();
    const { unmount } = renderHook(() => useEscapeToCancel(onCancel));

    unmount();
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(onCancel).not.toHaveBeenCalled();
  });
});
